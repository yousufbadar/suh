import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Check if environment variables are properly set
const isConfigured = supabaseUrl && supabaseAnonKey && 
                     supabaseUrl !== '' && 
                     supabaseAnonKey !== '' &&
                     !supabaseUrl.includes('placeholder') &&
                     !supabaseAnonKey.includes('placeholder');

if (!isConfigured) {
  console.error('❌ Missing or invalid Supabase configuration!');
  console.error('Please set the following in your .env file:');
  console.error('  REACT_APP_SUPABASE_URL=your_supabase_project_url');
  console.error('  REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('');
  console.error('Current values:');
  console.error('  REACT_APP_SUPABASE_URL:', supabaseUrl || '(not set)');
  console.error('  REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '(not set)');
  console.error('');
  console.error('⚠️  Database operations will fail until this is fixed.');
  console.error('💡 Make sure to restart your development server after updating .env file');
}

// Create Supabase client with error handling
let supabase;
let isClientValid = false;

try {
  if (isConfigured) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
    isClientValid = true;
    console.log('✅ Supabase client initialized successfully');
  } else {
    // Create a placeholder client that will fail gracefully
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
    isClientValid = false;
    console.warn('⚠️  Supabase client created with placeholder values - database operations will fail');
  }
} catch (error) {
  console.error('❌ Error initializing Supabase client:', error);
  // Create a minimal client to prevent crashes
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
  isClientValid = false;
}

// Test connection function
export const testConnection = async () => {
  if (!isClientValid) {
    return {
      success: false,
      error: 'Supabase client is not properly configured. Check your .env file and restart the server.',
    };
  }

  try {
    // Simple query to test connection
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return {
        success: false,
        error: error.message || 'Database connection failed',
        details: error,
      };
    }

    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to connect to database',
      details: error,
    };
  }
};

export { supabase, isClientValid };

