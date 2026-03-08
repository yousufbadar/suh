// Comprehensive Subscription Tracking System
// This module provides functions to track subscription changes, payments, and events

import { supabase } from '../lib/supabase';

/**
 * Log a subscription history event
 */
export const logSubscriptionHistory = async (subscriptionId, userId, eventType, oldStatus = null, newStatus = null, metadata = null) => {
  try {
    if (!supabase || !supabase.rpc) {
      console.warn('⚠️  Supabase not configured');
      return null;
    }

    const { data, error } = await supabase.rpc('log_subscription_history', {
      p_subscription_id: subscriptionId,
      p_user_id: userId,
      p_event_type: eventType,
      p_old_status: oldStatus ? JSON.stringify(oldStatus) : null,
      p_new_status: newStatus ? JSON.stringify(newStatus) : null,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
    });

    if (error) {
      console.error('Error logging subscription history:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error logging subscription history:', error);
    return null;
  }
};

/**
 * Log a subscription event
 */
export const logSubscriptionEvent = async (subscriptionId, userId, eventSource, eventType, eventData) => {
  try {
    if (!supabase || !supabase.rpc) {
      console.warn('⚠️  Supabase not configured');
      return null;
    }

    const { data, error } = await supabase.rpc('log_subscription_event', {
      p_subscription_id: subscriptionId,
      p_user_id: userId,
      p_event_source: eventSource, // 'user_action', 'system', 'webhook', 'payment_processor'
      p_event_type: eventType,
      p_event_data: JSON.stringify(eventData),
    });

    if (error) {
      console.error('Error logging subscription event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error logging subscription event:', error);
    return null;
  }
};

/**
 * Record a payment in the payment history
 */
export const recordPayment = async (subscriptionId, userId, paymentData) => {
  try {
    if (!supabase || !supabase.from) {
      console.warn('⚠️  Supabase not configured');
      return null;
    }

    const {
      paymentId,
      amountCents,
      currency = 'USD',
      paymentStatus = 'completed',
      paymentMethod = 'card',
      paymentToken = null,
      transactionDate = new Date().toISOString(),
      billingPeriodStart = null,
      billingPeriodEnd = null,
      metadata = null,
    } = paymentData;
    
    // Minimize metadata size - only include essential data to reduce egress
    const minimalMetadata = metadata ? {
      planType: metadata.planType,
      isTrialStart: metadata.isTrialStart,
    } : null;

    // Only return essential fields to minimize egress
    const { data, error } = await supabase
      .from('subscription_payments')
      .insert({
        subscription_id: subscriptionId,
        user_id: userId,
        payment_id: paymentId,
        amount_cents: amountCents,
        currency: currency,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        payment_token: paymentToken,
        transaction_date: transactionDate,
        billing_period_start: billingPeriodStart,
        billing_period_end: billingPeriodEnd,
        metadata: minimalMetadata ? JSON.stringify(minimalMetadata) : null,
      })
      .select('id, subscription_id, payment_id, amount_cents, currency, payment_status, transaction_date')
      .single();

    if (error) {
      console.error('Error recording payment:', error);
      return null;
    }

    // Log payment event (non-blocking to avoid slowing down payment recording)
    logSubscriptionEvent(
      subscriptionId,
      userId,
      'payment_processor',
      paymentStatus === 'completed' ? 'payment_processed' : 'payment_failed',
      {
        paymentId,
        amountCents,
        paymentStatus,
        paymentMethod,
      }
    ).catch(err => console.error('Error logging payment event (non-blocking):', err));

    return data;
  } catch (error) {
    console.error('Error recording payment:', error);
    return null;
  }
};

/**
 * Get subscription history for a user (optimized for egress)
 */
export const getSubscriptionHistory = async (userId, limit = 50) => {
  try {
    if (!supabase || !supabase.from) {
      console.warn('⚠️  Supabase not configured');
      return [];
    }

    // Only select needed fields to minimize egress
    const { data, error } = await supabase
      .from('subscription_history')
      .select('id, subscription_id, event_type, old_status, new_status, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching subscription history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    return [];
  }
};

/**
 * Get payment history for a user (optimized for egress)
 */
export const getPaymentHistory = async (userId, limit = 50) => {
  try {
    if (!supabase || !supabase.from) {
      console.warn('⚠️  Supabase not configured');
      return [];
    }

    // Only select needed fields to minimize egress (exclude payment_token for security)
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('id, subscription_id, payment_id, amount_cents, currency, payment_status, payment_method, transaction_date, billing_period_start, billing_period_end, created_at')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
};

/**
 * Get subscription events for a user (optimized for egress)
 */
export const getSubscriptionEvents = async (userId, limit = 50, eventType = null) => {
  try {
    if (!supabase || !supabase.from) {
      console.warn('⚠️  Supabase not configured');
      return [];
    }

    // Only select needed fields to minimize egress
    let query = supabase
      .from('subscription_events')
      .select('id, subscription_id, event_source, event_type, event_data, processed, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching subscription events:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching subscription events:', error);
    return [];
  }
};

/**
 * Check and update expired subscriptions
 */
export const checkExpiredSubscriptions = async () => {
  try {
    if (!supabase || !supabase.rpc) {
      console.warn('⚠️  Supabase not configured');
      return { expiredCount: 0, expiredSubscriptions: [] };
    }

    const { data, error } = await supabase.rpc('check_expired_subscriptions');

    if (error) {
      console.error('Error checking expired subscriptions:', error);
      return { expiredCount: 0, expiredSubscriptions: [] };
    }

    const expiredCount = data?.[0]?.expired_count || 0;
    const expiredSubscriptions = data || [];

    return {
      expiredCount,
      expiredSubscriptions,
    };
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    return { expiredCount: 0, expiredSubscriptions: [] };
  }
};

/**
 * Get subscription statistics
 */
export const getSubscriptionStats = async (userId = null) => {
  try {
    if (!supabase || !supabase.rpc) {
      console.warn('⚠️  Supabase not configured');
      return null;
    }

    const { data, error } = await supabase.rpc('get_subscription_stats', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching subscription stats:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return null;
  }
};

/**
 * Monitor subscription status and check for expirations
 * Call this periodically (e.g., daily) to keep subscriptions up to date
 */
export const monitorSubscriptions = async () => {
  try {
    console.log('🔍 Starting subscription monitoring...');
    
    // Check for expired subscriptions
    const expiredResult = await checkExpiredSubscriptions();
    
    if (expiredResult.expiredCount > 0) {
      console.log(`⚠️  Found ${expiredResult.expiredCount} expired subscription(s)`);
    } else {
      console.log('✅ No expired subscriptions found');
    }

    // Get overall statistics
    const stats = await getSubscriptionStats();
    if (stats) {
      console.log('📊 Subscription Statistics:', {
        total: stats.total_subscriptions,
        active: stats.active_subscriptions,
        trial: stats.trial_subscriptions,
        expired: stats.expired_subscriptions,
        cancelled: stats.cancelled_subscriptions,
        totalRevenue: `$${(stats.total_revenue_cents / 100).toFixed(2)}`,
        mrr: `$${(stats.monthly_recurring_revenue_cents / 100).toFixed(2)}`,
      });
    }

    return {
      expiredCount: expiredResult.expiredCount,
      expiredSubscriptions: expiredResult.expiredSubscriptions,
      stats,
    };
  } catch (error) {
    console.error('Error monitoring subscriptions:', error);
    return null;
  }
};

/**
 * Update subscription with payment information
 */
export const updateSubscriptionWithPayment = async (subscriptionId, userId, paymentData) => {
  try {
    if (!supabase || !supabase.from) {
      throw new Error('Database not configured');
    }

    // Record the payment
    const payment = await recordPayment(subscriptionId, userId, paymentData);

    if (!payment) {
      throw new Error('Failed to record payment');
    }

    // Update subscription with payment info
    const updateData = {
      last_payment_date: paymentData.transactionDate || new Date().toISOString(),
      payment_failed_count: 0, // Reset failed count on successful payment
    };

    // Calculate next billing date
    if (paymentData.billingPeriodEnd) {
      updateData.next_billing_date = paymentData.billingPeriodEnd;
    } else {
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      updateData.next_billing_date = nextBilling.toISOString();
    }

    // Only return essential fields to minimize egress
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select('id, user_id, last_payment_date, next_billing_date, payment_failed_count')
      .single();

    if (error) {
      throw error;
    }

    return { subscription: data, payment };
  } catch (error) {
    console.error('Error updating subscription with payment:', error);
    throw error;
  }
};

