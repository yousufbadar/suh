# SSO (Social Login) Configuration Guide

This guide will help you configure Google authentication for your application using Supabase.

## Overview

Supabase provides built-in OAuth support for multiple providers. Once configured, users can sign in with their social media accounts instead of creating a new account.

---

## Step 1: Configure OAuth Providers in Supabase

### For Google OAuth:

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com](https://console.cloud.google.com)
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Enter project name and click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" or "Google Identity"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     Replace `YOUR_PROJECT_REF` with your Supabase project reference (found in your Supabase project URL)
   - Click "Create"
   - **Copy the Client ID and Client Secret**

5. **Configure in Supabase**
   - Go to your Supabase Dashboard
   - Navigate to **Authentication** → **Providers**
   - Find **Google** and click to configure
   - Enable Google provider
   - Paste your **Client ID** and **Client Secret**
   - Click "Save"

---

## Step 2: Find Your Supabase Project Reference

Your project reference is part of your Supabase URL:

```
https://YOUR_PROJECT_REF.supabase.co
```

Example:
- If your URL is `https://abcdefghijklmnop.supabase.co`
- Then your project reference is `abcdefghijklmnop`

You'll need this for the callback URL in Google OAuth.

---

## Step 3: Test the Integration

1. **Restart your development server** (if running)
2. **Open your application**
3. **Click on the Google login button**
4. **You should be redirected** to the provider's login page
5. **After authentication**, you'll be redirected back to your app
6. **Check the browser console** for any errors

---

## Common Issues & Solutions

### Issue: "Redirect URI mismatch"
**Solution:**
- Make sure the callback URL in your OAuth provider matches exactly:
  ```
  https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
  ```
- Check for trailing slashes or typos
- Wait a few minutes after updating (some providers cache settings)

### Issue: "Invalid client credentials"
**Solution:**
- Double-check that you copied the Client ID and Secret correctly
- Make sure there are no extra spaces
- Verify the credentials are active in the provider's dashboard

### Issue: "Provider not enabled"
**Solution:**
- Go to Supabase Dashboard → Authentication → Providers
- Make sure the provider is toggled "ON"
- Click "Save" after enabling

### Issue: "OAuth flow not redirecting"
**Solution:**
- Check browser console for errors
- Verify Supabase client is properly initialized
- Make sure your `.env` file has correct Supabase credentials
- Check that popup blockers aren't blocking the redirect

---

## Additional Providers

Supabase also supports:
- **GitHub** - Similar setup process
- **Discord** - Similar setup process
- **Azure** - Enterprise setup
- **Apple** - Requires Apple Developer account

Follow similar steps for any additional providers you want to add.

---

## Security Notes

⚠️ **Important:**
- Never commit OAuth credentials to version control
- Keep your Client Secrets secure
- Use environment variables for sensitive data
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in provider dashboards

---

## Testing in Production

When deploying to production:

1. **Update redirect URIs** in each OAuth provider to include your production domain:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   https://yourdomain.com/auth/callback
   ```

2. **Update Supabase Site URL**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Set "Site URL" to your production domain
   - Add your production domain to "Redirect URLs"

---

## Need Help?

- **Supabase OAuth Docs**: https://supabase.com/docs/guides/auth/social-login
- **Google OAuth Setup**: https://developers.google.com/identity/protocols/oauth2

---

## Quick Checklist

- [ ] Google OAuth configured in Google Cloud Console
- [ ] Google provider enabled in Supabase
- [ ] Callback URL matches in Google OAuth
- [ ] Tested Google login flow
- [ ] Production redirect URIs configured (if deploying)

