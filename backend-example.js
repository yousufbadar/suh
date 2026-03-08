/**
 * Example Backend Server for Square Payment Processing
 * 
 * This is a simple Express.js server that processes Square payments securely.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install dependencies: npm install express squareup dotenv
 * 2. Create a .env file with: SQUARE_ACCESS_TOKEN=your_square_access_token
 * 3. Set REACT_APP_BACKEND_API_URL=http://localhost:3001 in your React app's .env
 * 4. Run this server: node backend-example.js
 * 
 * IMPORTANT: Never expose your Square Access Token in the frontend!
 */

const express = require('express');
const { Client, Environment } = require('squareup');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS configuration (adjust for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' 
    ? Environment.Production 
    : Environment.Sandbox,
});

// Payment processing endpoint
app.post('/api/process-subscription', async (req, res) => {
  const { userId, paymentToken, amount, isTrialStart } = req.body;
  
  console.log('📥 Received payment request:', {
    userId,
    amount,
    isTrialStart,
    hasToken: !!paymentToken
  });
  
  try {
    // Validate input
    if (!userId || !paymentToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId and paymentToken'
      });
    }

    if (!isTrialStart) {
      // Process payment for subscription
      console.log('💳 Processing payment with Square...');
      
      const { result, statusCode } = await squareClient.paymentsApi.createPayment({
        sourceId: paymentToken,
        amountMoney: {
          amount: amount || 999, // Default to $9.99
          currency: 'USD',
        },
        idempotencyKey: require('crypto').randomUUID(),
      });
      
      console.log('📊 Square API Response:', {
        statusCode,
        paymentStatus: result.payment?.status,
        paymentId: result.payment?.id
      });
      
      if (result.payment?.status !== 'COMPLETED') {
        const errorMessage = result.errors?.[0]?.detail || 'Payment not completed';
        console.error('❌ Payment failed:', errorMessage);
        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }
      
      console.log('✅ Payment successful:', {
        paymentId: result.payment.id,
        amount: result.payment.amountMoney.amount,
        status: result.payment.status
      });
      
      // Return payment details
      return res.json({
        success: true,
        paymentId: result.payment.id,
        amount: result.payment.amountMoney.amount,
        status: result.payment.status
      });
    } else {
      // Trial start - no payment needed
      console.log('✅ Trial start - no payment required');
      return res.json({
        success: true,
        isTrialStart: true
      });
    }
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    
    // Handle Square API errors
    if (error.errors && error.errors.length > 0) {
      const squareError = error.errors[0];
      return res.status(400).json({
        success: false,
        error: squareError.detail || squareError.code || 'Payment processing failed'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Square Payment Backend running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/process-subscription`);
  console.log(`💡 Make sure REACT_APP_BACKEND_API_URL=http://localhost:${PORT} in your React app's .env`);
});

