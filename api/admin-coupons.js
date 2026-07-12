const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { buildNotificationEmail } = require('../email-templates.js');

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
  const role =
    user.app_metadata?.role ||
    user.user_metadata?.role ||
    '';
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
  if (!token) {
    return { error: 'Authorization required', status: 401 };
  }

  const anon = getAnonClient();
  if (!anon) {
    return { error: 'Supabase not configured', status: 500 };
  }

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) {
    return { error: 'Invalid or expired session', status: 401 };
  }
  if (!isAdminUser(data.user)) {
    return { error: 'Admin access required', status: 403 };
  }
  return { user: data.user };
}

let resend = null;
function getResend() {
  if (resend) return resend;
  const key = env('RESEND_API_KEY');
  if (!key) return null;
  const { Resend } = require('resend');
  resend = new Resend(key);
  return resend;
}

async function sendCouponEmail(to, couponCode, notes) {
  const emailFrom = env('EMAIL_FROM') || 'Share Your Heart Today <onboarding@resend.dev>';
  const appUrl = env('APP_URL') || env('REACT_APP_APP_URL') || 'https://shareyourhearttoday.com';
  const { subject, html } = buildNotificationEmail('lifetime_coupon', {
    couponCode,
    notes: notes || null,
    signupUrl: appUrl,
  });
  const client = getResend();
  if (!client) {
    return { skipped: true, message: 'Email not sent (Resend not configured)' };
  }
  const result = await client.emails.send({
    from: emailFrom,
    to: [to],
    subject,
    html,
  });
  if (result.error) {
    throw new Error(result.error.message || 'Failed to send email');
  }
  return { id: result.data?.id };
}

async function enrichCouponsWithRedeemer(admin, coupons) {
  if (!coupons?.length) return coupons || [];
  const needsLookup = coupons.filter((c) => c.redeemed_by_user_id && !c.redeemed_by_email);
  const userIds = [...new Set(needsLookup.map((c) => c.redeemed_by_user_id))];
  const emailById = {};
  await Promise.all(userIds.map(async (id) => {
    try {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) {
        emailById[id] = data.user.email;
      }
    } catch (_) {
      /* ignore lookup failures */
    }
  }));
  return coupons.map((c) => ({
    ...c,
    redeemed_by_email: c.redeemed_by_email
      || (c.redeemed_by_user_id ? emailById[c.redeemed_by_user_id] || null : null),
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
      error: 'SUPABASE_SERVICE_ROLE_KEY is required to manage coupons',
    });
  }

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('coupon_codes')
      .select('id, code, coupon_type, max_uses, times_used, is_active, redeemed_by_user_id, redeemed_by_email, redeemed_at, notes, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    const enriched = await enrichCouponsWithRedeemer(admin, data || []);
    return res.status(200).json({ success: true, coupons: enriched });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = (body.email || '').trim();
  const notes = (body.notes || '').trim() || null;
  const sendEmail = body.sendEmail !== false;
  const count = Math.min(Math.max(parseInt(body.count, 10) || 1, 1), 20);

  if (sendEmail && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Valid recipient email is required' });
  }
  if (sendEmail && !email) {
    return res.status(400).json({ success: false, error: 'Recipient email is required to send the coupon' });
  }

  const rows = Array.from({ length: count }, () => ({
    code: crypto.randomUUID(),
    coupon_type: 'lifetime',
    max_uses: 1,
    notes: notes || (email ? `Sent to ${email}` : 'Admin generated'),
  }));

  const { data, error } = await admin
    .from('coupon_codes')
    .insert(rows)
    .select('id, code, coupon_type, max_uses, times_used, is_active, notes, created_at');

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create coupon',
    });
  }

  let emailResult = null;
  if (sendEmail && email && data?.length) {
    try {
      // When multiple, send one email per code (or first only if count>1 — send all in one email)
      if (data.length === 1) {
        emailResult = await sendCouponEmail(email, data[0].code, notes);
      } else {
        emailResult = await sendCouponEmail(
          email,
          data.map((c) => c.code).join('\n'),
          notes
        );
      }
    } catch (err) {
      return res.status(200).json({
        success: true,
        coupons: data,
        emailSent: false,
        emailError: err.message || 'Coupon created but email failed',
      });
    }
  }

  return res.status(200).json({
    success: true,
    coupons: data,
    emailSent: Boolean(emailResult && !emailResult.skipped),
    emailSkipped: Boolean(emailResult?.skipped),
    emailId: emailResult?.id || null,
  });
};
