# Subscription Setup Guide

This guide will help you set up the subscription system with Square payments for $9.99/month with a 30-day free trial.

## Overview

The subscription system includes:
- **Price**: $9.99/month
- **Trial**: 30 days free
- **Payment**: Processed through Square
- **Features**: Unlimited profiles, advanced analytics, custom branding, priority support, API access, export data, white-label option

---

## Step 1: Set Up Square Account

1. **Create Square Developer Account**
   - Visit [https://developer.squareup.com](https://developer.squareup.com)
   - Sign up or log in
   - Create a new application

2. **Get Your Square Credentials**
   - **Application ID**: Found in your Square Developer Dashboard
   - **Location ID**: Found in Square Dashboard → Settings → Locations
   - **Access Token**: Generate in Square Developer Dashboard (keep this secret!)

3. **Add to Environment Variables**
   Add to your `.env` file:
   ```env
   REACT_APP_SQUARE_APPLICATION_ID=your_square_application_id
   REACT_APP_SQUARE_LOCATION_ID=your_square_location_id
   ```

---

## Step 2: Set Up Database

1. **Run the Migration**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**
   - Copy and paste the contents of `supabase/migrations/002_subscriptions.sql`
   - Click **Run** to execute

   This will create:
   - `subscriptions` table
   - Indexes for performance
   - Row Level Security policies
   - Automatic timestamp updates

---

## Step 3: Backend API Setup (Required for Production)

**Important**: The current implementation simulates payment processing. For production, you **must** create a backend API to securely process payments.

### Why a Backend is Required

- Square Access Tokens must be kept secret (never expose in frontend)
- Payment processing must be done server-side
- Webhook handling for subscription events

### Backend API Endpoints Needed

1. **POST /api/process-subscription**
   - Receives payment token from frontend
   - Processes payment with Square using server-side access token
   - Creates/updates subscription in database
   - Returns success/error

2. **POST /api/webhooks/square** (Optional but recommended)
   - Handles Square webhook events
   - Updates subscription status based on payment events

### Example Backend Implementation (Node.js/Express)

```javascript
// server.js
const express = require('express');
const { Client, Environment } = require('squareup');

const app = express();
app.use(express.json());

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Sandbox, // or Environment.Production
});

app.post('/api/process-subscription', async (req, res) => {
  const { userId, paymentToken, amount, isTrialStart } = req.body;
  
  try {
    if (!isTrialStart) {
      // Process payment for subscription
      const { result } = await squareClient.paymentsApi.createPayment({
        sourceId: paymentToken,
        amountMoney: {
          amount: amount, // 999 = $9.99
          currency: 'USD',
        },
        idempotencyKey: crypto.randomUUID(),
      });
      
      if (result.payment.status !== 'COMPLETED') {
        throw new Error('Payment not completed');
      }
    }
    
    // Update subscription in database
    // ... database update logic ...
    
    res.json({ success: true });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

---

## Step 4: Update Frontend Code

The frontend code is already set up, but you need to:

1. **Update `src/utils/subscription.js`**
   - Uncomment the backend API call in `processSubscription` function
   - Update the API URL to point to your backend

2. **Test the Integration**
   - Use Square sandbox test cards
   - Test the subscription flow
   - Verify subscription status updates

---

## Step 5: Test Cards (Sandbox)

Use these test cards in Square sandbox mode:

- **Success**: `4111 1111 1111 1111`
- **Decline**: `4000 0000 0000 0002`
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **ZIP**: Any 5 digits

---

## Step 6: Production Deployment

1. **Switch to Production**
   - Get production credentials from Square
   - Update environment variables
   - Change Square SDK URL from sandbox to production:
     ```javascript
     // In Subscription.js, change:
     script.src = 'https://web.squarecdn.com/v1/square.js'; // Production
     ```

2. **Set Up Webhooks** (Recommended)
   - Configure webhook URL in Square Dashboard
   - Handle subscription events (payment success, failure, etc.)

3. **Security Checklist**
   - ✅ Access tokens stored on backend only
   - ✅ HTTPS enabled
   - ✅ Payment validation on backend
   - ✅ Webhook signature verification

---

## Current Implementation Status

### ✅ Completed
- Subscription UI component
- Square Web Payments SDK integration
- Trial period management (30 days)
- Subscription status checking
- Database schema

### ⚠️ Needs Backend (For Production)
- Payment processing API
- Webhook handling
- Secure token storage

---

## Usage

1. **User clicks "Upgrade Plan"** on the home page
2. **Subscription page loads** with Square payment form
3. **User enters card details** (or starts trial)
4. **Payment is processed** (currently simulated, needs backend)
5. **Subscription is activated** and stored in database

---

## Troubleshooting

### Square SDK Not Loading
- Check that `REACT_APP_SQUARE_APPLICATION_ID` is set
- Verify the script tag is loading correctly
- Check browser console for errors

### Payment Not Processing
- Verify Square credentials are correct
- Check that backend API is running (for production)
- Review Square Dashboard for payment logs

### Subscription Status Not Updating
- Check database connection
- Verify RLS policies allow user access
- Check subscription table exists

---

## Additional Resources

- **Square Developer Docs**: https://developer.squareup.com/docs
- **Web Payments SDK**: https://developer.squareup.com/docs/web-payments/overview
- **Square API Reference**: https://developer.squareup.com/reference/square

---

## Support

For issues or questions:
- Check Square Developer Forums
- Review Square API documentation
- Contact Square Support

