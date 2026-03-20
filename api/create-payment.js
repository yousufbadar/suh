const path = require('path');
const crypto = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({ path: path.join(projectRoot, '.env.local') });
require('dotenv').config({ path: path.join(projectRoot, 'build', '.env.local') });

function env(key, defaultValue = null) {
  const raw = process.env[key];
  if (raw == null || raw === '') return defaultValue;
  return String(raw).trim().replace(/\r?\n/g, '');
}

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

let squareClient = null;
function getSquareClient() {
  if (squareClient) return squareClient;
  const token = env('SQUARE_ACCESS_TOKEN');
  const sandbox = env('SQUARE_ENVIRONMENT') !== 'production';
  if (!token) return null;
  try {
    const { SquareClient, SquareEnvironment } = require('square');
    squareClient = new SquareClient({
      environment: sandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
      token,
    });
  } catch (e) {
    squareClient = null;
  }
  return squareClient;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const sourceId = body.sourceId;
  const amount = body.amount;
  const idempotencyKey = body.idempotencyKey || crypto.randomUUID();
  const locationId = env('SQUARE_LOCATION_ID');

  if (!sourceId || amount == null) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: sourceId, amount',
    });
  }

  const client = getSquareClient();
  if (!client) {
    return res.status(500).json({
      success: false,
      error: 'Square is not configured. Set SQUARE_ACCESS_TOKEN',
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
    const payload = {
      idempotencyKey,
      sourceId,
      amountMoney: { amount: amountCents, currency: 'USD' },
    };
    if (locationId) payload.locationId = locationId;

    const response = await client.payments.create(payload);
    const payment = response.data?.payment ?? response.result?.payment ?? response.payment;
    if (!payment) {
      return res.status(500).json({ success: false, error: 'No payment in Square response' });
    }

    const approved = payment.status === 'APPROVED' || payment.status === 'COMPLETED';
    if (!approved) {
      const errMsg = payment.cardDetails?.errors?.[0]?.detail || payment.status || 'Payment not approved';
      return res.status(400).json(sanitizeForJson({ success: false, error: errMsg, payment }));
    }

    return res.status(200).json(sanitizeForJson({
      success: true,
      paymentId: payment.id,
      amount: Number(payment.amountMoney?.amount ?? amountCents),
      currency: payment.amountMoney?.currency || 'USD',
      status: payment.status,
      payment,
    }));
  } catch (error) {
    const details = error?.errors?.[0]?.detail || error?.message || 'Payment processing failed';
    return res.status(400).json({ success: false, error: details });
  }
};
