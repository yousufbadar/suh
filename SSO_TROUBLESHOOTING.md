# SSO Troubleshooting Guide

If SSO (Single Sign-On) is not working, follow these steps to diagnose and fix the issue.

## Quick Diagnostic

1. **Open your browser console** (F12)
2. **Click "Sign in with Google"**
3. **Look for error messages** in the console
4. **Check the redirect URL** that's logged - it should match what's in Supabase

## Common Issues and Solutions

### Issue 1: "Redirect URL not whitelisted" or "redirect_uri_mismatch"

**Symptoms:**
- Error message mentions redirect URL
- OAuth flow starts but fails immediately
- Console shows redirect URL mismatch

**Solution:**
1. Check the browser console for the exact redirect URL (it will be logged)
2. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, add the exact URL shown in the console
4. Common redirect URLs to add:
   - `http://localhost:3000` (for local development)
   - `http://localhost:3000/` (with trailing slash - add both if needed)
   - `https://yourdomain.com` (for production)
5. **Save** and wait a few seconds for changes to propagate
6. Try again

**Important:** The redirect URL must match EXACTLY, including:
- Protocol (http:// or https://)
- Domain (localhost or your domain)
- Port (if using non-standard port like :3000)
- Trailing slash (or lack thereof)

### Issue 2: "Provider not enabled" or "provider_not_enabled"

**Symptoms:**
- Error says provider is not enabled
- OAuth button doesn't work

**Solution:**
1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Google** (or your provider)
3. Click to configure
4. **Enable** the provider
5. Add your OAuth credentials (Client ID and Client Secret)
6. **Save**
7. Try again

### Issue 3: "Invalid client credentials" or "invalid_client"

**Symptoms:**
- Error mentions invalid credentials
- OAuth flow fails after redirect

**Solution:**
1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Google**
2. Verify your **Client ID** and **Client Secret** are correct
3. Make sure there are no extra spaces or characters
4. If using Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Check that your OAuth credentials are active
   - Verify the callback URL in Google matches: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
5. Update credentials in Supabase if needed
6. **Save** and try again

### Issue 4: "ERR_NAME_NOT_RESOLVED" or "Cannot connect to Supabase"

**Symptoms:**
- Network error when clicking SSO button
- Cannot resolve Supabase URL

**Solution:**
1. Check your `.env` file has correct `REACT_APP_SUPABASE_URL`
2. Verify your Supabase project exists and is **Active** (not paused)
3. Go to **Supabase Dashboard** → **Settings** → **API**
4. Copy the correct **Project URL**
5. Update `.env` file:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
   ```
6. **Restart your development server** (important!)
7. Try again

### Issue 5: OAuth redirects but doesn't log in

**Symptoms:**
- Redirects to Google/Provider
- Authentication succeeds
- But doesn't log in when redirected back

**Solution:**
1. Check browser console for errors after redirect
2. Verify the redirect URL is whitelisted (see Issue 1)
3. Check that `detectSessionInUrl` is enabled in Supabase client (it should be)
4. Clear browser cache and cookies
5. Try in an incognito/private window
6. Check if popup blockers are interfering

### Issue 6: OAuth button does nothing

**Symptoms:**
- Clicking SSO button has no effect
- No console errors

**Solution:**
1. Check browser console for any errors
2. Verify Supabase client is initialized (should see "✅ Supabase client initialized successfully")
3. Check network tab for failed requests
4. Verify `.env` file is in project root and server was restarted
5. Try refreshing the page

## Step-by-Step Setup Verification

### 1. Verify Supabase Configuration

```bash
# Check your .env file has:
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Verify OAuth Provider Setup (Google Example)

1. **Google Cloud Console:**
   - OAuth 2.0 Client ID created
   - Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Client ID and Secret copied

2. **Supabase Dashboard:**
   - Authentication → Providers → Google
   - Provider **Enabled**
   - Client ID and Secret entered correctly
   - **Saved**

3. **Supabase Redirect URLs:**
   - Authentication → URL Configuration → Redirect URLs
   - Your app URL is listed (e.g., `http://localhost:3000`)

### 3. Test the Flow

1. Open browser console
2. Click "Sign in with Google"
3. Watch console for:
   - Redirect URL being logged
   - Any error messages
   - Successful redirect to Google
4. After Google authentication, check:
   - Redirect back to your app
   - Session created
   - User logged in

## Debugging Tools

### Browser Console Diagnostics

The app logs detailed information when you click SSO:

```
🔐 Initiating google OAuth flow...
📋 Diagnostic Info: { ... }
📍 Redirect URL: http://localhost:3000
💡 Make sure this URL is whitelisted...
```

### Run OAuth Diagnostics

In the browser console, you can run:

```javascript
// This will run comprehensive diagnostics
window.runOAuthDiagnostics()
```

This will check:
- Supabase configuration
- OAuth provider setup
- Redirect URL configuration
- Current session status

## Still Not Working?

1. **Check the exact error message** in browser console
2. **Verify all steps** in the setup guide (SSO_SETUP.md)
3. **Test with a different browser** or incognito mode
4. **Check Supabase project status** - ensure it's not paused
5. **Review Supabase logs** in Dashboard → Logs → Auth

## Quick Checklist

- [ ] Supabase project is active (not paused)
- [ ] `.env` file has correct `REACT_APP_SUPABASE_URL`
- [ ] Development server restarted after `.env` changes
- [ ] OAuth provider enabled in Supabase Dashboard
- [ ] OAuth credentials (Client ID/Secret) configured correctly
- [ ] Redirect URL whitelisted in Supabase Dashboard
- [ ] Callback URL configured in OAuth provider (Google, etc.)
- [ ] Browser console checked for specific error messages
- [ ] Tried in incognito/private window (to rule out cache issues)

