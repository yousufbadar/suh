// Script to verify Supabase keys match the correct project
// Run: node scripts/verify-keys.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying Supabase Keys...\n');

// Extract project reference from URL
function getProjectRef(url) {
  if (!url) return null;
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

// Decode JWT token (without verification) to see payload
function decodeJWT(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch (error) {
    return null;
  }
}

// Check URL
const projectRefFromUrl = getProjectRef(supabaseUrl);
console.log('📋 Project Information:');
console.log('  URL:', supabaseUrl || '❌ Not set');
console.log('  Project Reference:', projectRefFromUrl || '❌ Could not extract');

// Check Anon Key
const anonPayload = decodeJWT(supabaseAnonKey);
console.log('\n🔑 Anon Key:');
if (anonPayload) {
  console.log('  Project Reference (ref):', anonPayload.ref || '❌ Not found');
  console.log('  Role:', anonPayload.role || '❌ Not found');
  console.log('  Matches URL:', anonPayload.ref === projectRefFromUrl ? '✅ YES' : '❌ NO');
} else {
  console.log('  ❌ Invalid or missing anon key');
}

// Check Service Role Key
const servicePayload = decodeJWT(supabaseServiceKey);
console.log('\n🔐 Service Role Key:');
if (servicePayload) {
  console.log('  Project Reference (ref):', servicePayload.ref || '❌ Not found');
  console.log('  Role:', servicePayload.role || '❌ Not found');
  console.log('  Matches URL:', servicePayload.ref === projectRefFromUrl ? '✅ YES' : '❌ NO');
  
  if (servicePayload.role !== 'service_role') {
    console.log('  ⚠️  WARNING: This key is not a service_role key!');
  }
} else {
  console.log('  ❌ Invalid or missing service role key');
}

// Summary
console.log('\n📊 Summary:');
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.log('  ❌ Missing required keys in .env file');
} else if (anonPayload && servicePayload) {
  const anonMatches = anonPayload.ref === projectRefFromUrl;
  const serviceMatches = servicePayload.ref === projectRefFromUrl;
  const serviceIsCorrect = servicePayload.role === 'service_role';
  
  if (anonMatches && serviceMatches && serviceIsCorrect) {
    console.log('  ✅ All keys are correct and match the project!');
    console.log('  ✅ Service role key is valid');
  } else {
    console.log('  ❌ Key mismatch detected!');
    if (!anonMatches) {
      console.log('    - Anon key does not match the project URL');
    }
    if (!serviceMatches) {
      console.log('    - Service role key does not match the project URL');
      console.log('    - Service key is for project:', servicePayload.ref);
      console.log('    - URL is for project:', projectRefFromUrl);
    }
    if (!serviceIsCorrect) {
      console.log('    - Service role key is not actually a service_role key');
    }
    console.log('\n💡 To fix:');
    console.log('  1. Go to Supabase Dashboard > Settings > API');
    console.log('  2. Make sure you\'re in the project:', projectRefFromUrl);
    console.log('  3. Copy the service_role key (not the anon key)');
    console.log('  4. Update SUPABASE_SERVICE_ROLE_KEY in your .env file');
  }
} else {
  console.log('  ❌ Could not verify keys - check if they are valid JWT tokens');
}

