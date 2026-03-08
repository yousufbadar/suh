// OAuth Diagnostics Helper
// Run this in the browser console to diagnose OAuth issues

export const runOAuthDiagnostics = async () => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    issues: [],
    warnings: [],
    info: {},
  };

  console.log('🔍 Running OAuth Diagnostics...\n');

  // Check 1: Supabase Configuration
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
  
  diagnostics.info.supabaseUrl = supabaseUrl || 'NOT SET';
  diagnostics.info.supabaseAnonKey = supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT SET';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    diagnostics.issues.push('❌ Supabase environment variables not configured');
    diagnostics.issues.push('   → Check your .env file for REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
  } else {
    console.log('✅ Supabase environment variables are set');
  }

  // Check 2: Current URL
  const currentUrl = window.location.href;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const redirectUrl = `${origin}${pathname}`;
  
  diagnostics.info.currentUrl = currentUrl;
  diagnostics.info.redirectUrl = redirectUrl;
  
  console.log(`📍 Current URL: ${currentUrl}`);
  console.log(`📍 Redirect URL: ${redirectUrl}`);
  console.log(`💡 This redirect URL must be whitelisted in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs\n`);

  // Check 3: Supabase Client
  // Note: This will be called from within the app, so supabase should be available
  // For browser console usage, we'll need to access it differently
  console.log('\n⚠️  Note: For full diagnostics, run this from within the app context');
  console.log('   Or check the browser console when clicking "Sign in with Google"');
  
  // Try to import and test Supabase client
  try {
    const { supabase } = await import('../lib/supabase');
    
    if (!supabase?.auth) {
      diagnostics.issues.push('❌ Supabase auth is not available');
      console.log('❌ Supabase auth is not available');
    } else {
      console.log('✅ Supabase auth is available');
      
      // Check 4: Test OAuth Configuration
      console.log('\n🧪 Testing OAuth configuration...');
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true, // Don't actually redirect, just test
          },
        });

        if (error) {
          diagnostics.issues.push(`❌ OAuth test failed: ${error.message}`);
          console.error('❌ OAuth Error:', error);
          
          if (error.message?.includes('redirect') || error.message?.includes('whitelist')) {
            diagnostics.issues.push('   → Redirect URL not whitelisted in Supabase Dashboard');
            diagnostics.issues.push(`   → Add this URL to Supabase: ${redirectUrl}`);
          }
          if (error.message?.includes('provider_not_enabled')) {
            diagnostics.issues.push('   → Google OAuth provider not enabled in Supabase Dashboard');
            diagnostics.issues.push('   → Go to Authentication → Providers → Google and enable it');
          }
          if (error.message?.includes('invalid_client') || error.message?.includes('credentials')) {
            diagnostics.issues.push('   → Invalid OAuth credentials in Supabase Dashboard');
            diagnostics.issues.push('   → Check Google OAuth Client ID and Secret in Supabase');
          }
        } else {
          console.log('✅ OAuth configuration test passed');
          if (data?.url) {
            console.log('✅ OAuth redirect URL generated successfully');
          }
        }
      } catch (testError) {
        diagnostics.issues.push(`❌ OAuth test exception: ${testError.message}`);
        console.error('❌ OAuth Test Exception:', testError);
      }

      // Check 5: Current Session
      console.log('\n🔐 Checking current session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        diagnostics.warnings.push(`⚠️  Session check error: ${sessionError.message}`);
      } else if (session) {
        console.log('✅ Active session found');
        diagnostics.info.hasSession = true;
        diagnostics.info.userEmail = session.user?.email || 'Unknown';
      } else {
        console.log('ℹ️  No active session');
        diagnostics.info.hasSession = false;
      }
    }
  } catch (importError) {
    diagnostics.issues.push(`❌ Failed to import Supabase client: ${importError.message}`);
    console.error('❌ Failed to import Supabase client:', importError);
  }

  // Check 6: URL Hash (OAuth callback)
  const hash = window.location.hash;
  if (hash) {
    console.log('\n🔗 URL Hash detected:', hash.substring(0, 100) + (hash.length > 100 ? '...' : ''));
    if (hash.includes('access_token')) {
      console.log('✅ OAuth callback detected in URL');
      diagnostics.info.hasOAuthCallback = true;
      diagnostics.warnings.push('⚠️  OAuth callback in URL - session should be processed automatically');
    } else if (hash.includes('error')) {
      diagnostics.issues.push('❌ OAuth error in URL hash');
      diagnostics.issues.push(`   → Check the error in the URL hash: ${hash}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  
  if (diagnostics.issues.length === 0) {
    console.log('✅ No critical issues found!');
  } else {
    console.log(`❌ Found ${diagnostics.issues.length} issue(s):`);
    diagnostics.issues.forEach(issue => console.log(`   ${issue}`));
  }
  
  if (diagnostics.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${diagnostics.warnings.length}):`);
    diagnostics.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  console.log('\n📋 Configuration Info:');
  console.log(JSON.stringify(diagnostics.info, null, 2));

  console.log('\n💡 Next Steps:');
  if (diagnostics.issues.some(i => i.includes('whitelisted'))) {
    console.log('   1. Go to Supabase Dashboard → Authentication → URL Configuration');
    console.log(`   2. Add this URL to Redirect URLs: ${redirectUrl}`);
    console.log('   3. Save and wait a few seconds');
    console.log('   4. Try signing in again');
  }
  if (diagnostics.issues.some(i => i.includes('not enabled'))) {
    console.log('   1. Go to Supabase Dashboard → Authentication → Providers');
    console.log('   2. Find Google and click to configure');
    console.log('   3. Enable the provider and add your Google OAuth credentials');
    console.log('   4. Save and try again');
  }
  if (diagnostics.issues.some(i => i.includes('environment variables'))) {
    console.log('   1. Create or update your .env file in the project root');
    console.log('   2. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
    console.log('   3. Restart your development server');
  }

  return diagnostics;
};

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  window.runOAuthDiagnostics = runOAuthDiagnostics;
}

