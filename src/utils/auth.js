// Authentication utilities using Supabase Auth

import { supabase } from '../lib/supabase';

// Register new user with Supabase
export const registerUser = async (email, password, username) => {
  // Validate inputs
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address');
  }
  
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
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
  
  // Extract username/name from user metadata
  const extractedUsername = data.user?.user_metadata?.username || username || email.split('@')[0];
  const extractedName = data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || extractedUsername;

  return {
    id: data.user?.id,
    email: data.user?.email,
    username: extractedUsername,
    name: extractedName
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
    
    // Extract username/name from user metadata
    const username = data.user.user_metadata?.username || 
                     data.user.user_metadata?.full_name || 
                     data.user.user_metadata?.name ||
                     email.split('@')[0];

    const user = {
      id: data.user.id,
      email: data.user.email,
      username: username,
      name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || username
    };
    
    // Verify session was created
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('⚠️  Login succeeded but no session found');
    } else {
      console.log('✅ Session created successfully');
    }
    
    return user;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || 'Logout failed');
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    // Check if Supabase client is properly configured
    if (!supabase || !supabase.auth) {
      console.warn('⚠️  Supabase client is not properly initialized');
      return null;
    }

    // First check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError);
      return null;
    }

    if (!session) {
      console.log('ℹ️  No active session found');
      return null;
    }

    // Then get user
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
    
    if (!user) {
      return null;
    }

    // Extract username/name from user metadata (OAuth providers may use different fields)
    const username = user.user_metadata?.username || 
                     user.user_metadata?.full_name || 
                     user.user_metadata?.name ||
                     user.user_metadata?.preferred_username ||
                     user.email?.split('@')[0];

    return {
      id: user.id,
      email: user.email,
      username: username,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username || username
    };
  } catch (error) {
    console.error('❌ Unexpected error getting current user:', error);
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

