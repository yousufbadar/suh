// Subscription management utilities

import { supabase } from '../lib/supabase';
import {
  logSubscriptionEvent,
  recordPayment,
  updateSubscriptionWithPayment,
} from './subscriptionTracking';

// eslint-disable-next-line no-unused-vars
const SUBSCRIPTION_PRICE = 999; // $9.99 in cents (for backend API use)
const TRIAL_DAYS = 30;

// Cache for getSubscriptionStatus to limit API calls and reduce egress
let subscriptionStatusCache = new Map();
let lastSubscriptionStatusCall = new Map();
const SUBSCRIPTION_STATUS_CACHE_DURATION = 60000; // 60 seconds (1 minute)

/**
 * Get subscription status for a user (cached to reduce egress)
 */
export const getSubscriptionStatus = async (userId, forceRefresh = false) => {
  try {
    if (!supabase || !supabase.from) {
      console.warn('⚠️  Supabase not configured');
      return {
        isActive: false,
        trialActive: false,
        trialStartDate: null,
        subscriptionEndDate: null,
      };
    }

    // Check cache first (unless force refresh is requested)
    const now = Date.now();
    if (!forceRefresh && subscriptionStatusCache.has(userId) && lastSubscriptionStatusCall.has(userId)) {
      const timeSinceLastCall = now - lastSubscriptionStatusCall.get(userId);
      if (timeSinceLastCall < SUBSCRIPTION_STATUS_CACHE_DURATION) {
        const cached = subscriptionStatusCache.get(userId);
        console.log(`📦 Using cached subscription status (${Math.round((SUBSCRIPTION_STATUS_CACHE_DURATION - timeSinceLastCall) / 1000)}s remaining)`);
        return cached;
      }
    }

    // Only select needed fields to minimize egress
    const { data, error } = await supabase
      .from('subscriptions')
      .select('is_active, trial_start_date, subscription_end_date, plan_type, status, last_payment_date, next_billing_date, billing_cycle')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription:', error);
      return {
        hasSubscriptionRecord: false,
        isActive: false,
        trialActive: false,
        trialDaysRemaining: 0,
        trialStartDate: null,
        subscriptionEndDate: null,
        lastPaymentDate: null,
        nextBillingDate: null,
        billingCycle: 'monthly',
      };
    }

    if (!data) {
      // No subscription found - trial will start on signup/first login
      return {
        hasSubscriptionRecord: false,
        isActive: false,
        trialActive: false,
        trialDaysRemaining: 0,
        trialStartDate: null,
        subscriptionEndDate: null,
        lastPaymentDate: null,
        nextBillingDate: null,
        billingCycle: 'monthly',
      };
    }

    const currentDate = new Date();
    const trialStartDate = data.trial_start_date ? new Date(data.trial_start_date) : null;
    const subscriptionEndDate = data.subscription_end_date ? new Date(data.subscription_end_date) : null;

    // Check if trial is active and compute remaining days
    let trialActive = false;
    let trialDaysRemaining = 0;
    if (trialStartDate && !data.is_active) {
      const daysSinceTrialStart = Math.floor((currentDate - trialStartDate) / (1000 * 60 * 60 * 24));
      trialActive = daysSinceTrialStart < TRIAL_DAYS;
      trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysSinceTrialStart);
    }

    // Check if subscription is active
    const isActive = data.is_active && subscriptionEndDate && subscriptionEndDate > currentDate;

    const status = {
      hasSubscriptionRecord: true,
      isActive,
      trialActive,
      trialDaysRemaining,
      trialStartDate: trialStartDate?.toISOString() || null,
      subscriptionEndDate: subscriptionEndDate?.toISOString() || null,
      planType: data.plan_type || 'pro',
      lastPaymentDate: data.last_payment_date || null,
      nextBillingDate: data.next_billing_date || null,
      billingCycle: data.billing_cycle || 'monthly',
    };

    // Cache the result
    subscriptionStatusCache.set(userId, status);
    lastSubscriptionStatusCall.set(userId, now);

    return status;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    const defaultStatus = {
      hasSubscriptionRecord: false,
      isActive: false,
      trialActive: false,
      trialDaysRemaining: 0,
      trialStartDate: null,
      subscriptionEndDate: null,
      lastPaymentDate: null,
      nextBillingDate: null,
      billingCycle: 'monthly',
    };
    // Cache error result too (shorter duration) to prevent repeated failed calls
    const errorCacheTime = Date.now();
    subscriptionStatusCache.set(userId, defaultStatus);
    lastSubscriptionStatusCall.set(userId, errorCacheTime);
    return defaultStatus;
  }
};

/**
 * Clear subscription status cache for a user (call after subscription changes)
 */
export const clearSubscriptionStatusCache = (userId) => {
  if (userId) {
    subscriptionStatusCache.delete(userId);
    lastSubscriptionStatusCall.delete(userId);
  } else {
    // Clear all cache
    subscriptionStatusCache.clear();
    lastSubscriptionStatusCall.clear();
  }
};

/**
 * Start a free trial
 */
export const startTrial = async (userId) => {
  try {
    if (!supabase || !supabase.from) {
      throw new Error('Database not configured');
    }

    const trialStartDate = new Date();
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: 'pro',
        is_active: false,
        trial_start_date: trialStartDate.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select('id, user_id, plan_type, is_active, trial_start_date, subscription_end_date, status')
      .single();

    if (error) {
      console.error('Error starting trial:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error starting trial:', error);
    throw error;
  }
};

/**
 * Process subscription payment
 * Note: In production, this should call your backend API which processes the payment securely
 */
export const processSubscription = async (userId, paymentToken, isTrialStart = false, buyerEmailAddress = null, billingAddress = null) => {
  try {
    if (!supabase || !supabase.from) {
      throw new Error('Database not configured');
    }

    const backendApiUrl = process.env.REACT_APP_BACKEND_API_URL;
    let backendPayment = null;

    if (!isTrialStart && backendApiUrl) {
      // Call backend first: Square payments.create contract; backend returns full payment response
      console.log('💳 Processing payment through backend API...');
      const response = await fetch(`${backendApiUrl}/api/process-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          paymentToken,
          amount: SUBSCRIPTION_PRICE,
          isTrialStart,
          buyerEmailAddress: buyerEmailAddress || undefined,
          billingAddress: billingAddress || undefined,
        }),
      });

      const paymentResult = await response.json();

      if (!response.ok) {
        throw new Error(paymentResult.error || `Payment failed: ${response.status} ${response.statusText}`);
      }
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment processing failed');
      }

      backendPayment = paymentResult.payment;
      console.log('✅ Payment processed successfully through Square:', paymentResult.paymentId);
    } else if (!isTrialStart && !backendApiUrl) {
      console.warn('⚠️  Backend API not configured. Payment is being simulated only.');
    }

    const now = new Date();
    let subscriptionData = {
      user_id: userId,
      plan_type: 'pro',
      is_active: true,
      created_at: now.toISOString(),
    };

    if (isTrialStart) {
      subscriptionData.trial_start_date = now.toISOString();
      subscriptionData.is_active = false;
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
      subscriptionData.subscription_end_date = trialEndDate.toISOString();
    } else {
      subscriptionData.is_active = true;
      const subscriptionEndDate = new Date(now);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      subscriptionData.subscription_end_date = subscriptionEndDate.toISOString();
    }

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId)
        .select('id, user_id, plan_type, is_active, trial_start_date, subscription_end_date, status')
        .single();
      if (error) throw error;
      result = data;
      clearSubscriptionStatusCache(userId);
      logSubscriptionEvent(result.id, userId, 'user_action', isTrialStart ? 'trial_started' : 'subscription_activated', {
        isTrialStart,
        planType: subscriptionData.plan_type,
        isActive: subscriptionData.is_active,
      }).catch(err => console.error('Error logging subscription event (non-blocking):', err));
    } else {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select('id, user_id, plan_type, is_active, trial_start_date, subscription_end_date, status')
        .single();
      if (error) throw error;
      result = data;
      clearSubscriptionStatusCache(userId);
      logSubscriptionEvent(result.id, userId, 'user_action', isTrialStart ? 'trial_started' : 'subscription_created', {
        isTrialStart,
        planType: subscriptionData.plan_type,
        isActive: subscriptionData.is_active,
      }).catch(err => console.error('Error logging subscription event (non-blocking):', err));
    }

    if (!isTrialStart) {
      const amountMoney = backendPayment?.amountMoney || backendPayment?.amount_money;
      const amountCents = amountMoney?.amount != null ? Number(amountMoney.amount) : SUBSCRIPTION_PRICE;
      const paymentStatus = backendPayment?.status === 'APPROVED' || backendPayment?.status === 'COMPLETED' ? 'completed' : 'pending';
      Promise.all([
        recordPayment(result.id, userId, {
          paymentId: backendPayment?.id || null,
          amountCents,
          currency: amountMoney?.currency || 'USD',
          paymentStatus,
          paymentMethod: 'card',
          paymentToken: paymentToken || null,
          transactionDate: now.toISOString(),
          billingPeriodStart: now.toISOString(),
          billingPeriodEnd: subscriptionData.subscription_end_date,
          metadata: {
            isTrialStart: false,
            planType: subscriptionData.plan_type,
            ...(backendPayment && { squareResponse: backendPayment }),
          },
        }),
        updateSubscriptionWithPayment(result.id, userId, {
          transactionDate: now.toISOString(),
          billingPeriodStart: now.toISOString(),
          billingPeriodEnd: subscriptionData.subscription_end_date,
        }),
      ]).catch(paymentError => {
        console.error('Error recording payment (non-blocking):', paymentError);
      });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error processing subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to process subscription',
    };
  }
};

/**
 * Cancel subscription
 * Minimal update (is_active + trial_start_date) works with base schema.
 * Optionally sets status/cancelled_at if those columns exist (migration 005).
 */
export const cancelSubscription = async (userId, reason = null) => {
  if (!supabase || !supabase.from) {
    throw new Error('Database not configured');
  }

  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id, user_id, is_active, trial_start_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching subscription for cancel:', fetchError);
    throw new Error(fetchError.message || 'Failed to load subscription');
  }

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const basePayload = {
    is_active: false,
    trial_start_date: null,
  };
  const fullPayload = {
    ...basePayload,
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason ?? null,
    auto_renew: false,
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .update(fullPayload)
    .eq('user_id', userId)
    .select('id, user_id, is_active')
    .maybeSingle();

  if (error) {
    const msg = error.message || '';
    if (msg.includes('column') && (msg.includes('does not exist') || msg.includes('status') || msg.includes('cancelled'))) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('subscriptions')
        .update(basePayload)
        .eq('user_id', userId)
        .select('id, user_id, is_active')
        .maybeSingle();
      if (fallbackError) {
        console.error('Error updating subscription (cancel fallback):', fallbackError);
        throw new Error(fallbackError.message || 'Failed to cancel subscription');
      }
      clearSubscriptionStatusCache(userId);
      return { success: true, data: fallbackData };
    }
    console.error('Error updating subscription (cancel):', error);
    throw new Error(error.message || 'Failed to cancel subscription');
  }

  clearSubscriptionStatusCache(userId);

  try {
    await logSubscriptionEvent(
      subscription.id,
      userId,
      'user_action',
      'subscription_cancelled',
      { reason, cancelledAt: new Date().toISOString() }
    );
  } catch (logErr) {
    console.warn('Error logging cancellation event (non-blocking):', logErr);
  }

  return { success: true, data };
};

