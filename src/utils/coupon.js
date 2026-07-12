import { supabase } from '../lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidCouponFormat = (code) => {
  if (!code || typeof code !== 'string') return false;
  return UUID_REGEX.test(code.trim());
};

export const checkCouponCode = async (code) => {
  const trimmed = (code || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Coupon code is required' };
  }
  if (!isValidCouponFormat(trimmed)) {
    return { valid: false, error: 'Coupon code must be a valid UUID' };
  }

  if (!supabase || !supabase.rpc) {
    return { valid: false, error: 'Database not configured' };
  }

  const { data, error } = await supabase.rpc('check_coupon_code', { p_code: trimmed });

  if (error) {
    console.error('Coupon check error:', error);
    return { valid: false, error: error.message || 'Failed to validate coupon' };
  }

  return {
    valid: Boolean(data?.valid),
    couponType: data?.coupon_type || null,
    error: data?.error || null,
  };
};

export const redeemCouponCode = async (userId, code) => {
  const trimmed = (code || '').trim();
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }
  if (!isValidCouponFormat(trimmed)) {
    return { success: false, error: 'Coupon code must be a valid UUID' };
  }

  if (!supabase || !supabase.rpc) {
    return { success: false, error: 'Database not configured' };
  }

  const { data, error } = await supabase.rpc('redeem_coupon_code', {
    p_code: trimmed,
    p_user_id: userId,
  });

  if (error) {
    console.error('Coupon redeem error:', error);
    return { success: false, error: error.message || 'Failed to redeem coupon' };
  }

  if (!data?.success) {
    return { success: false, error: data?.error || 'Invalid or expired coupon code' };
  }

  return {
    success: true,
    couponType: data.coupon_type,
    subscriptionId: data.subscription_id,
  };
};
