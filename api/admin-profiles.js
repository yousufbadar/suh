const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const projectRoot = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({ path: path.join(projectRoot, '.env.local') });
require('dotenv').config({ path: path.join(projectRoot, 'build', '.env.local') });

function env(key, defaultValue = null) {
  const raw = process.env[key];
  if (raw == null || raw === '') return defaultValue;
  return String(raw).trim().replace(/\r?\n/g, '');
}

function isAdminUser(user) {
  if (!user) return false;
  const role = user.app_metadata?.role || user.user_metadata?.role || '';
  if (String(role).toLowerCase() === 'admin') return true;
  const adminEmails = (env('ADMIN_EMAILS') || 'admin@admin.com,yousufbadar@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(String(user.email || '').toLowerCase());
}

function getAdminClient() {
  const url = env('REACT_APP_SUPABASE_URL') || env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAnonClient() {
  const url = env('REACT_APP_SUPABASE_URL') || env('SUPABASE_URL');
  const anonKey = env('REACT_APP_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: 'Authorization required', status: 401 };

  const anon = getAnonClient();
  if (!anon) return { error: 'Supabase not configured', status: 500 };

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { error: 'Invalid or expired session', status: 401 };
  if (!isAdminUser(data.user)) return { error: 'Admin access required', status: 403 };
  return { user: data.user };
}

function escapeIlike(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildProfilesQuery(admin, params) {
  const q = (params.q || '').trim();
  const status = params.status || 'all';
  const country = (params.country || '').trim();
  const sort = params.sort || 'created_desc';
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 50));
  const offset = (page - 1) * limit;

  let query = admin
    .from('profiles')
    .select(
      'id, uuid, entity_name, description, email, city, country, active, user_id, created_at, updated_at, deactivated_at',
      { count: 'exact' }
    );

  if (status === 'active') query = query.eq('active', true);
  else if (status === 'archived') query = query.eq('active', false);

  if (country) {
    query = query.ilike('country', `%${escapeIlike(country)}%`);
  }

  if (q) {
    if (UUID_REGEX.test(q)) {
      query = query.eq('uuid', q.toLowerCase());
    } else {
      const term = escapeIlike(q);
      query = query.or(
        [
          `entity_name.ilike.%${term}%`,
          `email.ilike.%${term}%`,
          `city.ilike.%${term}%`,
          `country.ilike.%${term}%`,
          `contact_person_name.ilike.%${term}%`,
          `contact_person_email.ilike.%${term}%`,
          `user_id.ilike.%${term}%`,
          `description.ilike.%${term}%`,
        ].join(',')
      );
    }
  }

  switch (sort) {
    case 'name_asc':
      query = query.order('entity_name', { ascending: true });
      break;
    case 'name_desc':
      query = query.order('entity_name', { ascending: false });
      break;
    case 'created_asc':
      query = query.order('created_at', { ascending: true });
      break;
    case 'updated_desc':
      query = query.order('updated_at', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);
  return { query, page, limit };
}

async function enrichProfilesWithOwnerEmail(admin, profiles) {
  if (!profiles?.length) return profiles || [];
  const userIds = [...new Set(profiles.map((p) => p.user_id).filter((id) => id && id !== 'anonymous'))];
  const emailById = {};
  await Promise.all(userIds.map(async (id) => {
    try {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emailById[id] = data.user.email;
    } catch (_) {
      /* ignore lookup failures */
    }
  }));
  return profiles.map((p) => ({
    ...p,
    owner_email: p.user_id && p.user_id !== 'anonymous' ? emailById[p.user_id] || null : null,
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await requireAdmin(req);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const admin = getAdminClient();
  if (!admin) {
    return res.status(500).json({
      success: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY is required to manage profiles',
    });
  }

  if (req.method === 'GET') {
    const params = req.query || {};
    const { query, page, limit } = buildProfilesQuery(admin, params);
    const { data, error, count } = await query;
    if (error) return res.status(500).json({ success: false, error: error.message });

    const enriched = await enrichProfilesWithOwnerEmail(admin, data || []);
    return res.status(200).json({
      success: true,
      profiles: enriched,
      total: count ?? enriched.length,
      page,
      limit,
    });
  }

  if (req.method === 'PATCH') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = (body.id || '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'Profile id is required' });

    if (typeof body.active !== 'boolean') {
      return res.status(400).json({ success: false, error: 'active (boolean) is required' });
    }

    const now = new Date().toISOString();
    const updatePayload = body.active
      ? { active: true, reactivated_at: now, updated_at: now }
      : { active: false, deactivated_at: now, updated_at: now };

    const { data, error } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select('id, uuid, entity_name, active, updated_at')
      .maybeSingle();

    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!data) return res.status(404).json({ success: false, error: 'Profile not found' });

    return res.status(200).json({ success: true, profile: data });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
