// Script to create admin user via Supabase Management API
// Run this once: node scripts/create-admin-user.js
// 
// Prerequisites:
// 1. Install dotenv: npm install dotenv
// 2. Get your service_role key from Supabase Dashboard > Settings > API > service_role key
// 3. Add SUPABASE_SERVICE_ROLE_KEY to your .env file

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set the following in your .env file:');
  console.error('  REACT_APP_SUPABASE_URL=your_supabase_url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('\nTo get your service_role key:');
  console.error('  Go to Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const adminEmail = 'admin@admin.com'; // Valid email format required by Supabase
  const adminPassword = 'admin@123';

  console.log('🔐 Creating admin user...');
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const adminExists = existingUsers?.users?.find(u => u.email === adminEmail);

    if (adminExists) {
      console.log('✅ Admin user already exists!');
      console.log('User ID:', adminExists.id);
      return;
    }

    // Create admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: 'admin',
        role: 'admin'
      }
    });

    if (error) {
      throw error;
    }

    console.log('✅ Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('User ID:', data.user.id);
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.message.includes('Invalid API key') || error.message.includes('service_role')) {
      console.error('\n💡 Troubleshooting:');
      console.error('  1. Make sure you\'re using the service_role key, not the anon key!');
      console.error('  2. Verify the service_role key matches your Supabase project URL');
      console.error('  3. Check that REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are from the same project');
      console.error('\n  Current URL:', supabaseUrl);
      console.error('\n  To get the correct key:');
      console.error('    Go to Supabase Dashboard > Settings > API > service_role key');
    }
    process.exit(1);
  }
}

createAdminUser();

