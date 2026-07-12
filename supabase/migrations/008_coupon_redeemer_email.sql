-- Store redeemer email on coupon redemption for admin reporting

ALTER TABLE coupon_codes
  ADD COLUMN IF NOT EXISTS redeemed_by_email TEXT;

-- Backfill from auth.users for existing redemptions
UPDATE coupon_codes c
SET redeemed_by_email = u.email
FROM auth.users u
WHERE c.redeemed_by_user_id IS NOT NULL
  AND c.redeemed_by_user_id = u.id::text
  AND (c.redeemed_by_email IS NULL OR c.redeemed_by_email = '');

CREATE OR REPLACE FUNCTION redeem_coupon_code(p_code TEXT, p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupon_codes%ROWTYPE;
  v_subscription_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_lifetime_end TIMESTAMPTZ := '2099-12-31T23:59:59+00'::timestamptz;
  v_redeemer_email TEXT;
BEGIN
  IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid()::text IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_redeemer_email
  FROM auth.users
  WHERE id = p_user_id::uuid;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coupon code is required');
  END IF;

  IF trim(p_code) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coupon code must be a valid UUID');
  END IF;

  SELECT * INTO v_coupon
  FROM coupon_codes
  WHERE code = trim(p_code)::uuid
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid coupon code');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coupon code has expired');
  END IF;

  IF v_coupon.times_used >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coupon code has already been used');
  END IF;

  IF v_coupon.coupon_type = 'lifetime' THEN
    INSERT INTO subscriptions (
      user_id,
      plan_type,
      is_active,
      subscription_start_date,
      subscription_end_date,
      billing_cycle,
      status,
      auto_renew,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      'pro',
      true,
      v_now,
      v_lifetime_end,
      'lifetime',
      'active',
      false,
      v_now,
      v_now
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan_type = 'pro',
      is_active = true,
      subscription_start_date = COALESCE(subscriptions.subscription_start_date, v_now),
      subscription_end_date = v_lifetime_end,
      billing_cycle = 'lifetime',
      status = 'active',
      auto_renew = false,
      trial_start_date = NULL,
      cancelled_at = NULL,
      cancellation_reason = NULL,
      updated_at = v_now
    RETURNING id INTO v_subscription_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported coupon type');
  END IF;

  UPDATE coupon_codes
  SET
    times_used = times_used + 1,
    redeemed_by_user_id = p_user_id,
    redeemed_by_email = v_redeemer_email,
    redeemed_at = v_now,
    is_active = CASE WHEN times_used + 1 >= max_uses THEN false ELSE is_active END
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'success', true,
    'coupon_type', v_coupon.coupon_type,
    'subscription_id', v_subscription_id
  );
END;
$$;
