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
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
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
  const allowedTypes = ['payment_receipt', 'subscription_activated', 'trial_started', 'subscription_cancelled', 'trial_ending_reminder', 'weekly_dashboard_summary'];
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
  console.log(`Endpoints: GET /api/config, POST /api/create-payment, /api/process-subscription, /api/process-payment`);
});
