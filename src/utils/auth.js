// Authentication utilities using Supabase Auth

import { supabase } from '../lib/supabase';
import { startTrial, clearSubscriptionStatusCache, getSubscriptionStatus } from './subscription';
import { checkCouponCode, redeemCouponCode } from './coupon';

const ADMIN_EMAILS = (process.env.REACT_APP_ADMIN_EMAILS || 'admin@admin.com,yousufbadar@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminFromUser = (user) => {
  if (!user) return false;
  const role = user.app_metadata?.role || user.user_metadata?.role || '';
  if (String(role).toLowerCase() === 'admin') return true;
  return ADMIN_EMAILS.includes(String(user.email || '').toLowerCase());
};

// Register new user with Supabase
export const registerUser = async (email, password, username, couponCode = null) => {
  // Validate inputs
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address');
  }
  
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const trimmedCoupon = (couponCode || '').trim();
  if (trimmedCoupon) {
    const couponCheck = await checkCouponCode(trimmedCoupon);
    if (!couponCheck.valid) {
      throw new Error(couponCheck.error || 'Invalid coupon code');
    }
  }

  // Sign up with Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username || email.split('@')[0]
      }
    }
  });

  if (error) {
    throw new Error(error.message || 'Registration failed');
  }
  
  // Start trial or activate lifetime access from coupon
  if (data.user?.id) {
    try {
      if (trimmedCoupon) {
        const redeemResult = await redeemCouponCode(data.user.id, trimmedCoupon);
        if (!redeemResult.success) {
          throw new Error(redeemResult.error || 'Failed to redeem coupon code');
        }
        clearSubscriptionStatusCache(data.user.id);
        await getSubscriptionStatus(data.user.id, true);
      } else {
        await startTrial(data.user.id);
      }
    } catch (subErr) {
      console.warn('Subscription setup on signup failed (user still registered):', subErr);
      if (trimmedCoupon) {
        throw new Error(subErr.message || 'Account created but coupon could not be applied. Please contact support.');
      }
    }
  }
  
  // Extract username/name from user metadata
  const extractedUsername = data.user?.user_metadata?.username || username || email.split('@')[0];
  const extractedName = data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || extractedUsername;

  return {
    id: data.user?.id,
    email: data.user?.email,
    username: extractedUsername,
    name: extractedName,
    isAdmin: isAdminFromUser(data.user),
  };
};

// Login user with Supabase
export const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Check if Supabase client is properly configured
  if (!supabase || !supabase.auth) {
    console.error('❌ Supabase client is not properly initialized');
    throw new Error('Database connection error. Please check your configuration and restart the server.');
  }

  try {
    console.log('🔐 Attempting login for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Invalid email or password';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account before logging in.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again.';
      }
      
      throw new Error(errorMessage);
    }

    if (!data || !data.user) {
      console.error('❌ Login succeeded but no user data returned');
      throw new Error('Login failed. Please try again.');
    }

    console.log('✅ Login successful for:', data.user.email);

    const user = userFromAuthUser(data.user);
    cacheUserFromAuth(user);
    return user;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
};

// Build app user object from Supabase auth user (no extra API calls)
export const userFromAuthUser = (authUser) => {
  if (!authUser) return null;

  const username = authUser.user_metadata?.username ||
                   authUser.user_metadata?.full_name ||
                   authUser.user_metadata?.name ||
                   authUser.user_metadata?.preferred_username ||
                   authUser.email?.split('@')[0];

  return {
    id: authUser.id,
    email: authUser.email,
    username,
    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.preferred_username || username,
    isAdmin: isAdminFromUser(authUser),
  };
};

// Cache for getCurrentUser to limit API calls to once per minute
let lastGetUserCall = null;
let cachedUserResult = null;
const GET_USER_CACHE_DURATION = 60000; // 60 seconds (1 minute)

export const cacheUserFromAuth = (user) => {
  if (!user) return;
  lastGetUserCall = Date.now();
  cachedUserResult = user;
};

// Clear getCurrentUser cache (call on logout so cached user isn't restored)
export const clearUserCache = () => {
  lastGetUserCall = null;
  cachedUserResult = null;
};

// Logout user
export const logoutUser = async () => {
  clearUserCache();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || 'Logout failed');
  }
};

// Get current user (rate limited to once per minute)
export const getCurrentUser = async (forceRefresh = false) => {
  try {
    // Check if Supabase client is properly configured
    if (!supabase || !supabase.auth) {
      console.warn('⚠️  Supabase client is not properly initialized');
      return null;
    }

    // Check cache first (unless force refresh is requested)
    const now = Date.now();
    if (!forceRefresh && lastGetUserCall && cachedUserResult !== null) {
      const timeSinceLastCall = now - lastGetUserCall;
      if (timeSinceLastCall < GET_USER_CACHE_DURATION) {
        console.log(`📦 Using cached user data (${Math.round((GET_USER_CACHE_DURATION - timeSinceLastCall) / 1000)}s remaining)`);
        return cachedUserResult;
      }
    }

    // First check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError);
      lastGetUserCall = now;
      cachedUserResult = null;
      return null;
    }

    if (!session) {
      console.log('ℹ️  No active session found');
      lastGetUserCall = now;
      cachedUserResult = null;
      return null;
    }

    // Then get user (this is the API call we want to limit)
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('❌ Error getting current user:', error);
      lastGetUserCall = now;
      cachedUserResult = null;
      return null;
    }
    
    if (!user) {
      lastGetUserCall = now;
      cachedUserResult = null;
      return null;
    }

    // Extract username/name from user metadata (OAuth providers may use different fields)
    const username = user.user_metadata?.username || 
                     user.user_metadata?.full_name || 
                     user.user_metadata?.name ||
                     user.user_metadata?.preferred_username ||
                     user.email?.split('@')[0];

    const userData = {
      id: user.id,
      email: user.email,
      username: username,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username || username,
      isAdmin: isAdminFromUser(user),
    };

    // Cache the result
    lastGetUserCall = now;
    cachedUserResult = userData;
    console.log('✅ User data fetched and cached');

    return userData;
  } catch (error) {
    console.error('❌ Unexpected error getting current user:', error);
    lastGetUserCall = Date.now();
    cachedUserResult = null;
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Get user by ID
export const getUserById = async (userId) => {
  const { data: { user }, error } = await supabase.auth.admin?.getUserById(userId);
  if (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
  return user;
};

// Request a password reset email
export const requestPasswordReset = async (email) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address');
  }

  if (!supabase || !supabase.auth) {
    throw new Error('Database connection error. Please check your configuration and restart the server.');
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    if (error.message?.includes('Too many requests')) {
      throw new Error('Too many reset requests. Please wait a moment and try again.');
    }
    throw new Error(error.message || 'Failed to send reset email');
  }
};

// Set a new password (after user clicks the reset link in their email)
export const updatePassword = async (newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  if (!supabase || !supabase.auth) {
    throw new Error('Database connection error. Please check your configuration and restart the server.');
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(error.message || 'Failed to update password');
  }
};

// SSO Login with OAuth providers
export const ssoLogin = async (provider) => {
  // Validate provider
  const validProviders = ['google', 'facebook', 'twitter', 'github', 'discord', 'azure', 'apple'];
  const normalizedProvider = provider.toLowerCase();
  
  if (!validProviders.includes(normalizedProvider)) {
    throw new Error(`Unsupported provider: ${provider}. Supported providers: ${validProviders.join(', ')}`);
  }

  // Check if Supabase client is properly configured
  if (!supabase || !supabase.auth) {
    console.error('❌ Supabase client is not properly initialized');
    throw new Error('Database connection error. Please check your configuration and restart the server.');
  }

  try {
    console.log(`🔐 Initiating ${normalizedProvider} OAuth flow...`);
    
    // Get the current URL for redirect
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: normalizedProvider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error(`❌ ${normalizedProvider} OAuth error:`, error);
      throw new Error(error.message || `${provider} login failed`);
    }

    // OAuth flow will redirect the user, so we don't need to return anything
    // The redirect will happen automatically
    console.log(`✅ ${normalizedProvider} OAuth flow initiated, redirecting...`);
    return data;
  } catch (error) {
    console.error(`❌ ${normalizedProvider} SSO failed:`, error);
    throw error;
  }
};

