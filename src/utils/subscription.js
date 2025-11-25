// Subscription management utilities

import { supabase } from '../lib/supabase';

// eslint-disable-next-line no-unused-vars
const SUBSCRIPTION_PRICE = 999; // $9.99 in cents (for backend API use)
const TRIAL_DAYS = 30;

/**
 * Get subscription status for a user
 */
export const getSubscriptionStatus = async (userId) => {
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

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription:', error);
      return {
        isActive: false,
        trialActive: false,
        trialStartDate: null,
        subscriptionEndDate: null,
      };
    }

    if (!data) {
      // No subscription found - user can start trial
      return {
        isActive: false,
        trialActive: false,
        trialStartDate: null,
        subscriptionEndDate: null,
      };
    }

    const now = new Date();
    const trialStartDate = data.trial_start_date ? new Date(data.trial_start_date) : null;
    const subscriptionEndDate = data.subscription_end_date ? new Date(data.subscription_end_date) : null;

    // Check if trial is active
    let trialActive = false;
    if (trialStartDate && !data.is_active) {
      const daysSinceTrialStart = Math.floor((now - trialStartDate) / (1000 * 60 * 60 * 24));
      trialActive = daysSinceTrialStart < TRIAL_DAYS;
    }

    // Check if subscription is active
    const isActive = data.is_active && subscriptionEndDate && subscriptionEndDate > now;

    return {
      isActive,
      trialActive,
      trialStartDate: trialStartDate?.toISOString() || null,
      subscriptionEndDate: subscriptionEndDate?.toISOString() || null,
      planType: data.plan_type || 'pro',
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      isActive: false,
      trialActive: false,
      trialStartDate: null,
      subscriptionEndDate: null,
    };
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
      .select()
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
export const processSubscription = async (userId, paymentToken, isTrialStart = false) => {
  try {
    if (!supabase || !supabase.from) {
      throw new Error('Database not configured');
    }

    // In a real implementation, you would:
    // 1. Send paymentToken to your backend API
    // 2. Backend processes payment with Square using the access token
    // 3. Backend creates subscription record
    // For now, we'll simulate the subscription creation

    const now = new Date();
    let subscriptionData = {
      user_id: userId,
      plan_type: 'pro',
      is_active: true,
      created_at: now.toISOString(),
    };

    if (isTrialStart) {
      // Starting trial - no payment yet
      subscriptionData.trial_start_date = now.toISOString();
      subscriptionData.is_active = false;
      
      // Set subscription end date to 30 days from now (trial period)
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
      subscriptionData.subscription_end_date = trialEndDate.toISOString();
    } else {
      // Converting from trial or new subscription - payment required
      // In production, verify payment was successful before creating subscription
      subscriptionData.is_active = true;
      
      // Set subscription end date to 1 month from now
      const subscriptionEndDate = new Date(now);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      subscriptionData.subscription_end_date = subscriptionEndDate.toISOString();
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // TODO: In production, call your backend API to process the actual payment
    // const response = await fetch('/api/process-subscription', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     userId,
    //     paymentToken,
    //     amount: SUBSCRIPTION_PRICE,
    //     isTrialStart,
    //   }),
    // });
    // const paymentResult = await response.json();
    // if (!paymentResult.success) {
    //   throw new Error(paymentResult.error || 'Payment processing failed');
    // }

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
 */
export const cancelSubscription = async (userId) => {
  try {
    if (!supabase || !supabase.from) {
      throw new Error('Database not configured');
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

