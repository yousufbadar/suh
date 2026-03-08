/**
 * Backend Server for Square Payment Processing
 *
 * Uses the Square Payments API contract: createPayment with idempotencyKey, sourceId,
 * amountMoney, billingAddress, buyerEmailAddress, etc. Returns the full payment response;
 * the frontend saves it to the database.
 *
 * SETUP:
 * 1. npm install express square dotenv
 * 2. .env: SQUARE_ACCESS_TOKEN=..., SQUARE_ENVIRONMENT=sandbox (optional), SQUARE_LOCATION_ID=... (optional)
 * 3. REACT_APP_BACKEND_API_URL=http://localhost:3001 in the React app .env
 * 4. node backend-example.js
 */

const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const token = process.env.SQUARE_ACCESS_TOKEN;
const locationId = process.env.SQUARE_LOCATION_ID || null;

let squareClient = null;
try {
  const { Client, Environment } = require('square');
  squareClient = token
    ? new Client({
        environment: process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox,
        token,
      })
    : null;
} catch (e) {
  try {
    const squareup = require('squareup');
    squareClient = token
      ? new squareup.Client({
          accessToken: token,
          environment: process.env.SQUARE_ENVIRONMENT === 'production' ? squareup.Environment.Production : squareup.Environment.Sandbox,
        })
      : null;
  } catch (e2) {
    console.warn('Install square or squareup: npm install square');
  }
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
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
    const payment = response.result?.payment || response.payment;

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
      return res.status(400).json({
        success: false,
        error: errMsg,
        payment,
      });
    }

    return res.json({
      success: true,
      paymentId: payment.id,
      amount: payment.amountMoney?.amount != null ? Number(payment.amountMoney.amount) : amountCents,
      currency: payment.amountMoney?.currency || 'USD',
      status: payment.status,
      payment,
    });
  } catch (error) {
    console.error('Payment error:', error);
    const details = error.errors?.[0]?.detail || error.message || 'Payment processing failed';
    return res.status(400).json({
      success: false,
      error: details,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Square payment backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
  console.log(`Endpoint: http://localhost:${PORT}/api/process-subscription`);
});
