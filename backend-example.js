/**
 * Backend Server for Square Payment Processing
 *
 * Uses the Square Payments API contract: createPayment with idempotencyKey, sourceId,
 * amountMoney, billingAddress, buyerEmailAddress, etc. Returns the full payment response;
 * the frontend saves it to the database.
 *
 * SETUP:
 * 1. npm install express square dotenv
 * 2. .env: SQUARE_ACCESS_TOKEN=..., SQUARE_APPLICATION_ID=..., SQUARE_LOCATION_ID=...
 *    Optional: SQUARE_ENVIRONMENT=production (defaults to sandbox).
 * 3. REACT_APP_BACKEND_API_URL=http://localhost:3001 in the React app .env
 * 4. node backend-example.js
 *
 * Endpoints:
 *   GET  /api/config           → { applicationId, locationId, sandbox } for Web SDK
 *   POST /api/create-payment   → body: { sourceId, amount (cents string), idempotencyKey }
 *   POST /api/send-notification → body: { to, type, data } — customer emails (payment, trial, subscription, weekly summary)
 *   POST /api/process-subscription, POST /api/process-payment (legacy)
 */

const path = require('path');
const express = require('express');
const crypto = require('crypto');

// Load .env first so RESEND_API_KEY and others are available
const projectRoot = __dirname;
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({ path: path.join(projectRoot, '.env.local') });
require('dotenv').config({ path: path.join(projectRoot, 'build', '.env.local') });

function env(key, defaultValue = null) {
  const raw = process.env[key];
  if (raw == null || raw === '') return defaultValue;
  return String(raw).trim().replace(/\r?\n/g, '');
}

const { buildNotificationEmail } = require('./email-templates.js');

let resend = null;
try {
  const { Resend } = require('resend');
  const resendKey = env('RESEND_API_KEY');
  if (resendKey) resend = new Resend(resendKey);
} catch (e) {
  console.warn('[Email] Resend init failed:', e?.message || e);
}
const emailFrom = env('EMAIL_FROM') || 'Share Your Heart Today <onboarding@resend.dev>';

/** Recursively convert BigInt to Number so res.json() can serialize (JSON.stringify doesn't support BigInt). */
function sanitizeForJson(val) {
  if (typeof val === 'bigint') return Number(val);
  if (Array.isArray(val)) return val.map(sanitizeForJson);
  if (val !== null && typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) out[k] = sanitizeForJson(val[k]);
    return out;
  }
  return val;
}

const token = env('SQUARE_ACCESS_TOKEN') || null;
const applicationId = env('SQUARE_APPLICATION_ID') || null;
const locationId = env('SQUARE_LOCATION_ID') || null;
const sandbox = env('SQUARE_ENVIRONMENT') !== 'production';

let squareClient = null;
if (token) {
  try {
    const { SquareClient, SquareEnvironment } = require('square');
    squareClient = new SquareClient({
      environment: sandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
      token,
    });
  } catch (e) {
    console.warn('Square SDK init failed:', e?.message || e, e?.code || '');
    try {
      const squareup = require('squareup');
      squareClient = new squareup.Client({
        accessToken: token,
        environment: sandbox ? squareup.Environment.Sandbox : squareup.Environment.Production,
      });
    } catch (e2) {
      console.warn('Square (squareup) fallback failed:', e2?.message || e2);
    }
  }
}
if (!squareClient && token) {
  console.warn('Square client is null but token is set — check SDK (npm install square)');
}

// Startup log: confirm env values are picked up (no secrets printed)
console.log('[Square config] SQUARE_ACCESS_TOKEN:', token ? `set (${token.length} chars)` : 'MISSING');
console.log('[Square config] SQUARE_APPLICATION_ID:', applicationId ? `set (${applicationId.substring(0, 12)}...)` : 'MISSING');
console.log('[Square config] SQUARE_LOCATION_ID:', locationId || 'MISSING');
console.log('[Square config] SQUARE_ENVIRONMENT / sandbox:', sandbox ? 'sandbox' : 'production');
console.log('[Square config] Square client:', squareClient ? 'initialized' : 'NOT initialized');
console.log('[Email] Resend:', resend ? 'configured' : 'not configured (set RESEND_API_KEY to send emails)');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/** GET /api/config — returns Square app config for the frontend Web SDK */
app.get('/api/config', (req, res) => {
  if (!applicationId || !locationId) {
    return res.status(500).json({
      error: 'Square not configured. Set SQUARE_APPLICATION_ID and SQUARE_LOCATION_ID in .env',
    });
  }
  res.json({
    applicationId,
    locationId,
    sandbox,
  });
});

/** POST /api/create-payment — body: { sourceId, amount, idempotencyKey }, amount = cents as string */
app.post('/api/create-payment', async (req, res) => {
  const { sourceId, amount, idempotencyKey } = req.body;

  // Log env and request state (no secrets)
  console.log('[create-payment] env at request time:', {
    SQUARE_ACCESS_TOKEN: token ? `set (${token.length} chars)` : 'MISSING',
    SQUARE_LOCATION_ID: locationId || 'MISSING',
    squareClient: !!squareClient,
  });
  console.log('[create-payment] body:', {
    sourceId: sourceId ? `present (${String(sourceId).length} chars)` : 'MISSING',
    amount,
    idempotencyKey: idempotencyKey ? 'present' : 'MISSING',
  });

  if (!sourceId || amount == null || !idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: sourceId, amount (cents as string), idempotencyKey',
    });
  }

  if (!squareClient) {
    console.log('[create-payment] rejected: squareClient is null');
    return res.status(500).json({
      success: false,
      error: 'Square is not configured. Set SQUARE_ACCESS_TOKEN in .env',
    });
  }

  const amountCents = BigInt(String(amount));
  if (amountCents < 1n) {
    return res.status(400).json({
      success: false,
      error: 'amount must be a positive number of cents',
    });
  }

  try {
    const createPayload = {
      idempotencyKey,
      sourceId,
      amountMoney: {
        amount: amountCents,
        currency: 'USD',
      },
    };
    if (locationId) createPayload.locationId = locationId;

    const response = await createPayment(createPayload);
    const payment = response.data?.payment ?? response.result?.payment ?? response.payment;

    if (!payment) {
      return res.status(500).json({
        success: false,
        error: 'No payment in Square response',
      });
    }

    const status = payment.status;
    const approved = status === 'APPROVED' || status === 'COMPLETED';

    if (!approved) {
      const errMsg = payment.cardDetails?.errors?.[0]?.detail || payment.status || 'Payment not approved';
      return res.status(400).json(sanitizeForJson({
        success: false,
        error: errMsg,
        payment,
      }));
    }

    return res.json(sanitizeForJson({
      success: true,
      paymentId: payment.id,
      amount: Number(payment.amountMoney?.amount ?? amountCents),
      currency: payment.amountMoney?.currency || 'USD',
      status: payment.status,
      payment,
    }));
  } catch (error) {
    console.error('Payment error:', error);
    const details = error.errors?.[0]?.detail || error.message || 'Payment processing failed';
    return res.status(400).json({
      success: false,
      error: details,
    });
  }
});

function createPayment(body) {
  if (squareClient.payments && typeof squareClient.payments.create === 'function') {
    return squareClient.payments.create(body);
  }
  return squareClient.paymentsApi.createPayment({
    body: {
      sourceId: body.sourceId,
      idempotencyKey: body.idempotencyKey,
      amountMoney: body.amountMoney,
      locationId: body.locationId,
      billingAddress: body.billingAddress,
      buyerEmailAddress: body.buyerEmailAddress,
      buyerPhoneNumber: body.buyerPhoneNumber,
      statementDescriptionIdentifier: body.statementDescriptionIdentifier,
      acceptPartialAuthorization: body.acceptPartialAuthorization,
      autocomplete: body.autocomplete,
    },
  }).then((r) => ({ result: { payment: r.result?.payment } }));
}

/**
 * Create payment using the contract:
 * idempotencyKey, sourceId, amountMoney, acceptPartialAuthorization, autocomplete,
 * optional billingAddress, buyerEmailAddress, buyerPhoneNumber, statementDescriptionIdentifier
 */
app.post('/api/process-subscription', async (req, res) => {
  const {
    userId,
    paymentToken,
    amount,
    isTrialStart,
    billingAddress,
    buyerEmailAddress,
    buyerPhoneNumber,
    statementDescriptionIdentifier,
  } = req.body;

  if (!userId || !paymentToken) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId and paymentToken',
    });
  }

  if (isTrialStart) {
    return res.json({ success: true, isTrialStart: true });
  }

  if (!squareClient) {
    return res.status(500).json({
      success: false,
      error: 'Square is not configured. Set SQUARE_ACCESS_TOKEN in .env',
    });
  }

  try {
    const amountCents = Number(amount) || 999;
    const idempotencyKey = crypto.randomUUID();

    const createPayload = {
      idempotencyKey,
      sourceId: paymentToken,
      acceptPartialAuthorization: false,
      amountMoney: {
        amount: BigInt(String(amountCents)),
        currency: 'USD',
      },
      autocomplete: false,
      ...(buyerEmailAddress && { buyerEmailAddress }),
      ...(buyerPhoneNumber && { buyerPhoneNumber }),
      ...(statementDescriptionIdentifier && { statementDescriptionIdentifier }),
      ...(billingAddress &&
        billingAddress.addressLine1 && {
          billingAddress: {
            addressLine1: billingAddress.addressLine1,
            country: billingAddress.country || 'US',
            firstName: billingAddress.firstName || '',
            lastName: billingAddress.lastName || '',
            postalCode: billingAddress.postalCode || '',
          },
        }),
    };

    if (locationId) {
      createPayload.locationId = locationId;
    }

    const response = await createPayment(createPayload);
    const payment = response.data?.payment ?? response.result?.payment ?? response.payment;

    if (!payment) {
      return res.status(500).json({
        success: false,
        error: 'No payment in Square response',
      });
    }

    const status = payment.status;
    const approved = status === 'APPROVED' || status === 'COMPLETED';

    if (!approved) {
      const errMsg = payment.cardDetails?.errors?.[0]?.detail || payment.status || 'Payment not approved';
      return res.status(400).json(sanitizeForJson({
        success: false,
        error: errMsg,
        payment,
      }));
    }

    return res.json(sanitizeForJson({
      success: true,
      paymentId: payment.id,
      amount: payment.amountMoney?.amount != null ? Number(payment.amountMoney.amount) : amountCents,
      currency: payment.amountMoney?.currency || 'USD',
      status: payment.status,
      payment,
    }));
  } catch (error) {
    console.error('Payment error:', error);
    const details = error.errors?.[0]?.detail || error.message || 'Payment processing failed';
    return res.status(400).json({
      success: false,
      error: details,
    });
  }
});

/**
 * Cart / generic payment: amount in cents, paymentToken, optional billing/email.
 * Same Square createPayment contract; used for cart checkout.
 */
app.post('/api/process-payment', async (req, res) => {
  const {
    paymentToken,
    amount,
    billingAddress,
    buyerEmailAddress,
    buyerPhoneNumber,
    statementDescriptionIdentifier,
  } = req.body;

  if (!paymentToken || amount == null) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: paymentToken and amount (in cents)',
    });
  }

  if (!squareClient) {
    return res.status(500).json({
      success: false,
      error: 'Square is not configured. Set SQUARE_ACCESS_TOKEN in .env',
    });
  }

  try {
    const amountCents = Number(amount);
    if (!Number.isInteger(amountCents) || amountCents < 1) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive integer (cents)',
      });
    }

    const idempotencyKey = crypto.randomUUID();
    const createPayload = {
      idempotencyKey,
      sourceId: paymentToken,
      acceptPartialAuthorization: false,
      amountMoney: {
        amount: BigInt(String(amountCents)),
        currency: 'USD',
      },
      autocomplete: true,
      ...(buyerEmailAddress && { buyerEmailAddress }),
      ...(buyerPhoneNumber && { buyerPhoneNumber }),
      ...(statementDescriptionIdentifier && { statementDescriptionIdentifier }),
      ...(billingAddress &&
        billingAddress.addressLine1 && {
          billingAddress: {
            addressLine1: billingAddress.addressLine1,
            country: billingAddress.country || 'US',
            firstName: billingAddress.firstName || '',
            lastName: billingAddress.lastName || '',
            postalCode: billingAddress.postalCode || '',
          },
        }),
    };

    if (locationId) {
      createPayload.locationId = locationId;
    }

    const response = await createPayment(createPayload);
    const payment = response.data?.payment ?? response.result?.payment ?? response.payment;

    if (!payment) {
      return res.status(500).json({
        success: false,
        error: 'No payment in Square response',
      });
    }

    const status = payment.status;
    const approved = status === 'APPROVED' || status === 'COMPLETED';

    if (!approved) {
      const errMsg = payment.cardDetails?.errors?.[0]?.detail || payment.status || 'Payment not approved';
      return res.status(400).json(sanitizeForJson({
        success: false,
        error: errMsg,
        payment,
      }));
    }

    return res.json(sanitizeForJson({
      success: true,
      paymentId: payment.id,
      amount: payment.amountMoney?.amount != null ? Number(payment.amountMoney.amount) : amountCents,
      currency: payment.amountMoney?.currency || 'USD',
      status: payment.status,
      payment,
    }));
  } catch (error) {
    console.error('Payment error:', error);
    const details = error.errors?.[0]?.detail || error.message || 'Payment processing failed';
    return res.status(400).json({
      success: false,
      error: details,
    });
  }
});

/** POST /api/send-notification — send customer email (payment, trial, subscription, weekly summary). Body: { to, type, data } */
app.post('/api/send-notification', async (req, res) => {
  const { to, type, data } = req.body || {};
  if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ success: false, error: 'Valid "to" email is required' });
  }
  const allowedTypes = ['payment_receipt', 'subscription_activated', 'trial_started', 'subscription_cancelled', 'trial_ending_reminder', 'weekly_dashboard_summary', 'lifetime_coupon'];
  const notificationType = allowedTypes.includes(type) ? type : 'weekly_dashboard_summary';
  const { subject, html } = buildNotificationEmail(notificationType, data || {});

  if (!resend) {
    console.log('[send-notification] Resend not configured; would send:', notificationType, 'to', to);
    return res.json({ success: true, skipped: true, message: 'Email not sent (Resend not configured)' });
  }

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: [to],
      subject,
      html,
    });
    if (result.error) {
      console.error('[send-notification] Resend error:', result.error);
      return res.status(500).json({ success: false, error: result.error.message || 'Failed to send email' });
    }
    console.log('[send-notification] sent:', notificationType, 'to', to, 'id=', result.data?.id);
    return res.json({ success: true, id: result.data?.id });
  } catch (err) {
    console.error('[send-notification] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to send email' });
  }
});

/** Admin coupon helpers (shared with Vercel api/admin-coupons.js patterns) */
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

function getSupabaseAdmin() {
  const url = env('REACT_APP_SUPABASE_URL') || env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getSupabaseAnon() {
  const url = env('REACT_APP_SUPABASE_URL') || env('SUPABASE_URL');
  const anonKey = env('REACT_APP_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdminExpress(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: 'Authorization required', status: 401 };
  const anon = getSupabaseAnon();
  if (!anon) return { error: 'Supabase not configured', status: 500 };
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return { error: 'Invalid or expired session', status: 401 };
  if (!isAdminUser(data.user)) return { error: 'Admin access required', status: 403 };
  return { user: data.user };
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

/** GET/POST /api/admin-coupons — list or generate lifetime coupons (admin only) */
app.all('/api/admin-coupons', async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await requireAdminExpress(req);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const admin = getSupabaseAdmin();
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
    if (error) return res.status(500).json({ success: false, error: error.message });
    const enriched = await enrichCouponsWithRedeemer(admin, data || []);
    return res.json({ success: true, coupons: enriched });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
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
    return res.status(500).json({ success: false, error: error.message || 'Failed to create coupon' });
  }

  let emailResult = null;
  if (sendEmail && email && data?.length) {
    try {
      const couponCode = data.length === 1 ? data[0].code : data.map((c) => c.code).join('\n');
      const appUrl = env('APP_URL') || env('REACT_APP_APP_URL') || 'http://localhost:3000';
      const { subject, html } = buildNotificationEmail('lifetime_coupon', {
        couponCode,
        notes,
        signupUrl: appUrl,
      });
      if (!resend) {
        emailResult = { skipped: true };
      } else {
        const result = await resend.emails.send({
          from: emailFrom,
          to: [email],
          subject,
          html,
        });
        if (result.error) throw new Error(result.error.message || 'Failed to send email');
        emailResult = { id: result.data?.id };
      }
    } catch (err) {
      return res.json({
        success: true,
        coupons: data,
        emailSent: false,
        emailError: err.message || 'Coupon created but email failed',
      });
    }
  }

  return res.json({
    success: true,
    coupons: data,
    emailSent: Boolean(emailResult && !emailResult.skipped),
    emailSkipped: Boolean(emailResult?.skipped),
    emailId: emailResult?.id || null,
  });
});

function escapeIlikeProfiles(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const PROFILE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildAdminProfilesQuery(admin, params) {
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

  if (country) query = query.ilike('country', `%${escapeIlikeProfiles(country)}%`);

  if (q) {
    if (PROFILE_UUID_REGEX.test(q)) {
      query = query.eq('uuid', q.toLowerCase());
    } else {
      const term = escapeIlikeProfiles(q);
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
      /* ignore */
    }
  }));
  return profiles.map((p) => ({
    ...p,
    owner_email: p.user_id && p.user_id !== 'anonymous' ? emailById[p.user_id] || null : null,
  }));
}

/** GET/PATCH /api/admin-profiles — list/search/filter or archive/reactivate (admin only) */
app.all('/api/admin-profiles', async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await requireAdminExpress(req);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({
      success: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY is required to manage profiles',
    });
  }

  if (req.method === 'GET') {
    const { query, page, limit } = buildAdminProfilesQuery(admin, req.query || {});
    const { data, error, count } = await query;
    if (error) return res.status(500).json({ success: false, error: error.message });
    const enriched = await enrichProfilesWithOwnerEmail(admin, data || []);
    return res.json({
      success: true,
      profiles: enriched,
      total: count ?? enriched.length,
      page,
      limit,
    });
  }

  if (req.method === 'PATCH') {
    const body = req.body || {};
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
    return res.json({ success: true, profile: data });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ensure unknown routes return JSON (so the frontend never receives an HTML 404 page).
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Express error handler (keep responses JSON)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: err?.message || 'Server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Square payment backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
  console.log(`Endpoints: GET /api/config, POST /api/create-payment, /api/process-subscription, /api/process-payment, GET/PATCH /api/admin-profiles, GET/POST /api/admin-coupons`);
});
