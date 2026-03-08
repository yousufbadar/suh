# Subscription Tracking System

## Overview

This application now includes a comprehensive subscription tracking system that monitors, logs, and manages all subscription-related activities. The system tracks subscription changes, payment history, events, and automatically handles expirations.

## Database Schema

### Tables Created

1. **subscription_history** - Audit log of all subscription changes
   - Tracks every change to subscriptions
   - Stores old and new status for comparison
   - Includes metadata for additional context

2. **subscription_payments** - Complete payment history
   - Records all payment transactions
   - Tracks payment status, amounts, and billing periods
   - Links payments to subscriptions

3. **subscription_events** - System and user events
   - Logs all subscription-related events
   - Tracks events from multiple sources (user actions, system, webhooks)
   - Supports event processing workflows

### Enhanced subscriptions Table

The existing `subscriptions` table has been enhanced with additional columns:
- `cancelled_at` - When subscription was cancelled
- `cancellation_reason` - Reason for cancellation
- `last_payment_date` - Date of last successful payment
- `next_billing_date` - Next scheduled billing date
- `billing_cycle` - Billing frequency (monthly/yearly)
- `auto_renew` - Whether subscription auto-renews
- `payment_failed_count` - Number of failed payment attempts
- `last_payment_failed_at` - Date of last failed payment
- `status` - Current subscription status (inactive, trial, active, cancelled, expired, past_due)
- `square_customer_id` - Square customer ID
- `square_subscription_id` - Square subscription ID

## Features

### 1. Automatic History Tracking

Every change to a subscription is automatically logged:
- Subscription creation
- Activation/deactivation
- Renewals
- Cancellations
- Trial starts/ends
- Status changes

### 2. Payment Tracking

All payments are recorded with:
- Payment amount and currency
- Payment status (pending, completed, failed, refunded)
- Payment method
- Billing period information
- Transaction dates

### 3. Event Logging

Events are logged from multiple sources:
- **user_action** - User-initiated changes
- **system** - Automated system events
- **webhook** - External webhook events
- **payment_processor** - Payment processor events

### 4. Automatic Expiration Handling

The system automatically:
- Detects expired subscriptions
- Updates subscription status
- Logs expiration events
- Can be run manually or on a schedule

### 5. Statistics and Reporting

Get comprehensive subscription statistics:
- Total subscriptions
- Active/trial/expired/cancelled counts
- Revenue metrics
- Monthly recurring revenue (MRR)

## Setup

### 1. Run Database Migration

Execute the migration file in your Supabase SQL Editor:

```sql
-- Run: supabase/migrations/005_subscription_tracking.sql
```

This will create all necessary tables, functions, triggers, and policies.

### 2. Import Tracking Functions

The tracking functions are available in:
- `src/utils/subscriptionTracking.js` - Core tracking functions
- `src/utils/subscriptionMonitor.js` - Monitoring service

### 3. Enable Monitoring (Optional)

Start the subscription monitor in your App component:

```javascript
import subscriptionMonitor from './utils/subscriptionMonitor';

// In your App component
useEffect(() => {
  // Start monitoring (checks every hour)
  subscriptionMonitor.start();
  
  // Or with custom interval (e.g., every 30 minutes)
  // subscriptionMonitor.start(30 * 60 * 1000);
  
  return () => {
    subscriptionMonitor.stop();
  };
}, []);
```

## Usage

### Log Subscription Events

```javascript
import { logSubscriptionEvent } from './utils/subscriptionTracking';

await logSubscriptionEvent(
  subscriptionId,
  userId,
  'user_action', // event_source
  'subscription_activated', // event_type
  { /* event data */ }
);
```

### Record Payments

```javascript
import { recordPayment } from './utils/subscriptionTracking';

await recordPayment(subscriptionId, userId, {
  paymentId: 'square_payment_id',
  amountCents: 999, // $9.99
  currency: 'USD',
  paymentStatus: 'completed',
  paymentMethod: 'card',
  billingPeriodStart: '2024-01-01T00:00:00Z',
  billingPeriodEnd: '2024-02-01T00:00:00Z',
});
```

### Get Subscription History

```javascript
import { getSubscriptionHistory } from './utils/subscriptionTracking';

const history = await getSubscriptionHistory(userId, 50); // Last 50 events
```

### Get Payment History

```javascript
import { getPaymentHistory } from './utils/subscriptionTracking';

const payments = await getPaymentHistory(userId, 50); // Last 50 payments
```

### Check Expired Subscriptions

```javascript
import { checkExpiredSubscriptions } from './utils/subscriptionTracking';

const result = await checkExpiredSubscriptions();
console.log(`Found ${result.expiredCount} expired subscriptions`);
```

### Get Statistics

```javascript
import { getSubscriptionStats } from './utils/subscriptionTracking';

// Get stats for all users
const stats = await getSubscriptionStats();

// Get stats for specific user
const userStats = await getSubscriptionStats(userId);
```

### Monitor Subscriptions

```javascript
import { monitorSubscriptions } from './utils/subscriptionTracking';

const result = await monitorSubscriptions();
// Automatically checks expirations and returns statistics
```

## Database Functions

### `log_subscription_history()`

Logs a subscription history event.

**Parameters:**
- `p_subscription_id` - UUID of subscription
- `p_user_id` - User ID
- `p_event_type` - Type of event
- `p_old_status` - Previous status (JSONB)
- `p_new_status` - New status (JSONB)
- `p_metadata` - Additional metadata (JSONB)

### `log_subscription_event()`

Logs a subscription event.

**Parameters:**
- `p_subscription_id` - UUID of subscription
- `p_user_id` - User ID
- `p_event_source` - Source of event
- `p_event_type` - Type of event
- `p_event_data` - Event data (JSONB)

### `check_expired_subscriptions()`

Checks and updates expired subscriptions.

**Returns:**
- Table with expired subscription IDs and count

### `get_subscription_stats()`

Gets subscription statistics.

**Parameters:**
- `p_user_id` - Optional user ID filter

**Returns:**
- Statistics including counts and revenue metrics

## Automatic Triggers

The system includes automatic triggers that:
- Log subscription history on every INSERT/UPDATE
- Update `updated_at` timestamps
- Track status changes automatically

## Security

All tables use Row Level Security (RLS):
- Users can only view their own subscription data
- Users can only view their own payment history
- Users can only view their own events

## Integration with Existing Code

The tracking system is integrated into:
- `src/utils/subscription.js` - Subscription management functions now log events
- Payment processing automatically records payments
- Cancellation includes event logging

## Monitoring

The subscription monitor can be:
- Started manually: `subscriptionMonitor.start()`
- Stopped: `subscriptionMonitor.stop()`
- Checked on demand: `subscriptionMonitor.check()`
- Configured with custom intervals

## Best Practices

1. **Run Expiration Checks Regularly**
   - Set up a cron job or scheduled task to run `checkExpiredSubscriptions()` daily
   - Or use the subscription monitor service

2. **Log All Events**
   - Always log subscription events for audit purposes
   - Include relevant metadata in event data

3. **Monitor Payment Failures**
   - Track failed payments using `payment_failed_count`
   - Implement retry logic for failed payments

4. **Use Statistics for Reporting**
   - Regularly check subscription stats
   - Monitor MRR and churn rates

5. **Keep History Clean**
   - Consider archiving old history records periodically
   - Maintain indexes for performance

## Future Enhancements

Potential improvements:
- Email notifications for expirations
- Automatic renewal processing
- Payment retry logic
- Subscription analytics dashboard
- Webhook integration for Square events
- Subscription upgrade/downgrade tracking

