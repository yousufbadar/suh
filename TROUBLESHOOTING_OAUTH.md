# Troubleshooting: ERR_NAME_NOT_RESOLVED Error

## Problem
You're seeing this error when trying to sign in with Google:
```
Error: ERR_NAME_NOT_RESOLVED
Error Code: -105
URL: https://spyfbmyoxcltrqfubabq.supabase.co/auth/v1/authorize?provider=google&...
```

## What This Means
The browser cannot resolve (find) your Supabase project URL. This typically means:
- The Supabase project doesn't exist
- The project was deleted
- The project is paused
- The project URL in your `.env` file is incorrect

## How to Fix

### Step 1: Verify Your Supabase Project Exists

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Check if you see a project with the reference `spyfbmyoxcltrqfubabq`
4. If you don't see this project:
   - It may have been deleted
   - You may be logged into the wrong account
   - The project reference in your `.env` file is incorrect

### Step 2: Check Project Status

1. In your Supabase Dashboard, find your project
2. Check if the project shows as "Active" or "Paused"
3. If paused, you need to reactivate it:
   - Click on the project
   - Look for a "Resume" or "Reactivate" button
   - Wait for the project to become active

### Step 3: Get the Correct Project URL

1. In Supabase Dashboard, select your project
2. Go to **Settings** (⚙️ icon in the left sidebar)
3. Click on **API**
4. Find the **Project URL** section
5. Copy the URL (it should look like: `https://xxxxxxxxxxxxx.supabase.co`)
6. **Important**: Make sure you copy the entire URL, including `https://`

### Step 4: Update Your .env File

1. Open your `.env` file in the project root directory
2. Find the line with `REACT_APP_SUPABASE_URL`
3. Update it with the correct URL from Step 3:
   ```
   REACT_APP_SUPABASE_URL=https://your-actual-project-id.supabase.co
   ```
4. **Important**: 
   - Don't add quotes around the URL
   - Don't add a trailing slash
   - Make sure there are no spaces

### Step 5: Restart Your Development Server

1. Stop your current development server (Ctrl+C)
2. Start it again:
   ```bash
   npm start
   ```
3. The environment variables are only loaded when the server starts

### Step 6: Verify the Fix

1. Open your browser console (F12)
2. Look for the diagnostic messages when you click "Sign in with Google"
3. Check that the Supabase URL matches your project URL
4. Try signing in again

## Still Not Working?

### Check Your .env File Location
- The `.env` file must be in the **root directory** of your project (same level as `package.json`)
- Not in `src/` or any subdirectory

### Check for Typos
- Compare the URL in your `.env` file with the URL in Supabase Dashboard
- Make sure there are no extra characters or spaces
- The project reference (the part before `.supabase.co`) should match exactly

### Create a New Project (If Needed)
If your project doesn't exist:
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Follow the setup wizard
4. Copy the new project URL
5. Update your `.env` file
6. Restart your server

## Quick Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Project exists and is active (not paused)
- [ ] Copied the correct Project URL from Settings → API
- [ ] Updated `REACT_APP_SUPABASE_URL` in `.env` file (no quotes, no trailing slash)
- [ ] `.env` file is in the project root directory
- [ ] Restarted the development server after updating `.env`
- [ ] Verified the URL in browser console matches Supabase Dashboard

## Need More Help?

- Check the browser console for detailed error messages
- Verify your network connection
- Try accessing the Supabase project URL directly in your browser to see if it loads

