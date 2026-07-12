import { supabase } from '../lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeIlike(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * List all profiles with search/filter (admin UI).
 * Uses Supabase client — profiles RLS allows read for authenticated users.
 */
export async function fetchAdminProfiles({
  q = '',
  status = 'all',
  country = '',
  sort = 'created_desc',
  page = 1,
  limit = 50,
} = {}) {
  if (!supabase?.from) {
    throw new Error('Database not configured');
  }

  const trimmedQ = (q || '').trim();
  const trimmedCountry = (country || '').trim();
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (safePage - 1) * safeLimit;

  let query = supabase
    .from('profiles')
    .select(
      'id, uuid, entity_name, description, email, city, country, active, user_id, created_at, updated_at, deactivated_at',
      { count: 'exact' }
    );

  if (status === 'active') query = query.eq('active', true);
  else if (status === 'archived') query = query.eq('active', false);

  if (trimmedCountry) {
    query = query.ilike('country', `%${escapeIlike(trimmedCountry)}%`);
  }

  if (trimmedQ) {
    if (UUID_REGEX.test(trimmedQ)) {
      query = query.eq('uuid', trimmedQ.toLowerCase());
    } else {
      const term = escapeIlike(trimmedQ);
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

  query = query.range(offset, offset + safeLimit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message || 'Failed to load profiles');

  return {
    profiles: data || [],
    total: count ?? (data || []).length,
    page: safePage,
    limit: safeLimit,
  };
}

export async function setAdminProfileActive(id, active) {
  if (!supabase?.from) {
    throw new Error('Database not configured');
  }

  const now = new Date().toISOString();
  const payload = active
    ? { active: true, reactivated_at: now, updated_at: now }
    : { active: false, deactivated_at: now, updated_at: now };

  const { error } = await supabase.from('profiles').update(payload).eq('id', id);
  if (error) throw new Error(error.message || 'Failed to update profile');
}
