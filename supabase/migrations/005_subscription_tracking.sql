-- Comprehensive Subscription Tracking System
-- This migration adds subscription history, payment tracking, and event logging

-- ============================================
-- 1. Subscription History/Audit Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'activated', 'renewed', 'cancelled', 'expired', 'trial_started', 'trial_ended', 'payment_failed', 'payment_succeeded'
  old_status JSONB, -- Previous subscription state
  new_status JSONB, -- New subscription state
  metadata JSONB, -- Additional event data (payment amount, reason, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- ============================================
-- 2. Payment History Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  payment_id TEXT, -- Square payment ID
  amount_cents INTEGER NOT NULL, -- Amount in cents (e.g., 999 = $9.99)
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  payment_method TEXT, -- 'card', 'bank_transfer', etc.
  payment_token TEXT, -- Encrypted payment token (for reference)
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  metadata JSONB, -- Additional payment data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payment history
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_status ON subscription_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_transaction_date ON subscription_payments(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_id ON subscription_payments(payment_id) WHERE payment_id IS NOT NULL;

-- ============================================
-- 3. Subscription Events Table (for webhooks and system events)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  event_source TEXT NOT NULL, -- 'user_action', 'system', 'webhook', 'payment_processor'
  event_type TEXT NOT NULL, -- 'subscription_created', 'subscription_activated', 'subscription_renewed', 'subscription_cancelled', 'subscription_expired', 'payment_processed', 'payment_failed', 'trial_started', 'trial_ended'
  event_data JSONB NOT NULL, -- Full event payload
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for subscription events
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_processed ON subscription_events(processed);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);

-- ============================================
-- 4. Add missing columns to subscriptions table
-- ============================================
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly', -- 'monthly', 'yearly'
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_failed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive', -- 'inactive', 'trial', 'active', 'cancelled', 'expired', 'past_due'
  ADD COLUMN IF NOT EXISTS square_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS square_subscription_id TEXT;

-- Index for status lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);

-- ============================================
-- 5. Function to log subscription history
-- ============================================
CREATE OR REPLACE FUNCTION log_subscription_history(
  p_subscription_id UUID,
  p_user_id TEXT,
  p_event_type TEXT,
  p_old_status JSONB DEFAULT NULL,
  p_new_status JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO subscription_history (
    subscription_id,
    user_id,
    event_type,
    old_status,
    new_status,
    metadata
  ) VALUES (
    p_subscription_id,
    p_user_id,
    p_event_type,
    p_old_status,
    p_new_status,
    p_metadata
  ) RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Function to log subscription events
-- ============================================
CREATE OR REPLACE FUNCTION log_subscription_event(
  p_subscription_id UUID,
  p_user_id TEXT,
  p_event_source TEXT,
  p_event_type TEXT,
  p_event_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO subscription_events (
    subscription_id,
    user_id,
    event_source,
    event_type,
    event_data
  ) VALUES (
    p_subscription_id,
    p_user_id,
    p_event_source,
    p_event_type,
    p_event_data
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Trigger to automatically log subscription changes
-- ============================================
CREATE OR REPLACE FUNCTION trigger_subscription_history()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
  v_old_status JSONB;
  v_new_status JSONB;
BEGIN
  -- Determine event type based on what changed
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'created';
    v_new_status := row_to_json(NEW)::JSONB;
    PERFORM log_subscription_history(
      NEW.id,
      NEW.user_id,
      v_event_type,
      NULL,
      v_new_status
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_status := row_to_json(OLD)::JSONB;
    v_new_status := row_to_json(NEW)::JSONB;
    
    -- Determine specific event type
    IF OLD.is_active = false AND NEW.is_active = true THEN
      v_event_type := 'activated';
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      IF NEW.cancelled_at IS NOT NULL THEN
        v_event_type := 'cancelled';
      ELSE
        v_event_type := 'deactivated';
      END IF;
    ELSIF OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date AND NEW.is_active = true THEN
      v_event_type := 'renewed';
    ELSIF OLD.trial_start_date IS NULL AND NEW.trial_start_date IS NOT NULL THEN
      v_event_type := 'trial_started';
    ELSE
      v_event_type := 'updated';
    END IF;
    
    PERFORM log_subscription_history(
      NEW.id,
      NEW.user_id,
      v_event_type,
      v_old_status,
      v_new_status
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS subscription_history_trigger ON subscriptions;
CREATE TRIGGER subscription_history_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_subscription_history();

-- ============================================
-- 8. Function to check and update expired subscriptions
-- ============================================
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS TABLE(
  subscription_id UUID,
  user_id TEXT,
  expired_count INTEGER
) AS $$
DECLARE
  v_expired_count INTEGER := 0;
BEGIN
  -- Update expired subscriptions
  UPDATE subscriptions
  SET 
    is_active = false,
    status = 'expired',
    updated_at = NOW()
  WHERE 
    is_active = true
    AND subscription_end_date IS NOT NULL
    AND subscription_end_date < NOW()
    AND status != 'expired';
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Log expiration events
  INSERT INTO subscription_events (
    subscription_id,
    user_id,
    event_source,
    event_type,
    event_data
  )
  SELECT 
    id,
    user_id,
    'system',
    'subscription_expired',
    jsonb_build_object(
      'expired_at', NOW(),
      'subscription_end_date', subscription_end_date
    )
  FROM subscriptions
  WHERE 
    status = 'expired'
    AND updated_at > NOW() - INTERVAL '1 minute';
  
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    v_expired_count
  FROM subscriptions s
  WHERE s.status = 'expired'
    AND s.updated_at > NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Function to get subscription statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_subscription_stats(p_user_id TEXT DEFAULT NULL)
RETURNS TABLE(
  total_subscriptions BIGINT,
  active_subscriptions BIGINT,
  trial_subscriptions BIGINT,
  expired_subscriptions BIGINT,
  cancelled_subscriptions BIGINT,
  total_revenue_cents BIGINT,
  monthly_recurring_revenue_cents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE TRUE) as total_subscriptions,
    COUNT(*) FILTER (WHERE status = 'active' AND is_active = true) as active_subscriptions,
    COUNT(*) FILTER (WHERE status = 'trial') as trial_subscriptions,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_subscriptions,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_subscriptions,
    COALESCE(SUM(amount_cents) FILTER (WHERE payment_status = 'completed'), 0) as total_revenue_cents,
    COALESCE(SUM(amount_cents) FILTER (WHERE payment_status = 'completed' AND status = 'active'), 0) as monthly_recurring_revenue_cents
  FROM subscriptions s
  LEFT JOIN subscription_payments sp ON s.id = sp.subscription_id
  WHERE (p_user_id IS NULL OR s.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. Row Level Security Policies
-- ============================================

-- Subscription History Policies
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription history"
  ON subscription_history
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Payment History Policies
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
  ON subscription_payments
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Subscription Events Policies
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription events"
  ON subscription_events
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- ============================================
-- 11. Function to update payment updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_subscription_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_payments_updated_at();

