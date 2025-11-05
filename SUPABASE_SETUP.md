# Supabase Configuration Guide

This guide will walk you through setting up Supabase for your application.

## Step 1: Create a Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"**
3. Create an account or sign in with GitHub
4. Click **"New Project"**
5. Fill in the project details:
   - **Name**: Your project name (e.g., "speak-your-heart-online")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Select Free tier to start
6. Click **"Create new project"**
7. Wait 2-3 minutes for the project to be provisioned

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on **Settings** (gear icon) in the left sidebar
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL**: This is your `REACT_APP_SUPABASE_URL`
   - **anon public key**: This is your `REACT_APP_SUPABASE_ANON_KEY`

   Example:
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Step 3: Set Up Environment Variables

1. In your project root directory (`D:\yb\workspace\suh`), create a `.env` file
2. Add the following content:

   ```env
   REACT_APP_SUPABASE_URL=your_project_url_here
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. Replace `your_project_url_here` with your actual Project URL
4. Replace `your_anon_key_here` with your actual anon key

   Example:
   ```env
   REACT_APP_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0ODk2ODg4MCwiZXhwIjoxOTY0NTQ0ODgwfQ.example
   ```

## Step 4: Run the Database Migration

1. In your Supabase project dashboard, click on **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase/migrations/001_initial_schema.sql` from your project
4. Copy **ALL** the contents of that file
5. Paste it into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)
7. You should see a success message: "Success. No rows returned"

The migration will create:
- `profiles` table - Stores all entity/profile data
- `qr_scans` table - Tracks QR code scans
- `social_clicks` table - Tracks social media link clicks
- `custom_link_clicks` table - Tracks custom link clicks
- Indexes for performance
- Row Level Security (RLS) policies

## Step 5: Verify the Setup

1. Restart your React development server:
   ```bash
   # Stop the current server (Ctrl+C)
   npm start
   ```

2. Check the browser console for any errors
3. If you see warnings about Supabase URL or Anon Key, double-check your `.env` file

## Step 6: Test the Connection

1. Open your application in the browser
2. Try creating a new profile
3. Check your Supabase dashboard:
   - Go to **Table Editor** in the left sidebar
   - Click on **profiles** table
   - You should see your newly created profile

## Troubleshooting

### Error: "Supabase URL or Anon Key not found"
- Make sure your `.env` file is in the project root directory
- Make sure the variable names are exactly: `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`
- Restart your development server after creating/updating `.env`

### Error: "Failed to fetch" or Network errors
- Check that your Supabase project is active (not paused)
- Verify your Project URL is correct
- Check your internet connection

### Error: "relation does not exist"
- Make sure you ran the migration SQL script
- Check the SQL Editor for any error messages
- Verify tables exist in **Table Editor** > **profiles**

### Error: "permission denied" or RLS errors
- The migration script sets up RLS policies that allow all operations
- If you see permission errors, re-run the migration script
- Check **Authentication** > **Policies** in Supabase dashboard

### Migration errors
- Make sure you're running the migration as the project owner
- Check that the `uuid-ossp` extension is enabled (it should be by default)
- If tables already exist, you may need to drop them first or modify the migration

## Additional Configuration

### Enable Email Auth (Optional - Not Required)
This app doesn't use authentication, but if you want to add it later:
1. Go to **Authentication** > **Providers** in Supabase dashboard
2. Configure email provider if needed

### Database Backups
Supabase automatically backs up your database. To view backups:
1. Go to **Settings** > **Database**
2. Click on **Backups** tab

### Viewing Your Data
- **Table Editor**: View and edit data directly in Supabase dashboard
- **SQL Editor**: Run custom queries
- **API Docs**: Auto-generated API documentation (available in Supabase dashboard)

## Security Notes

⚠️ **Important**: 
- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore` (should be)
- The `anon` key is safe to use in client-side code (it's public)
- Row Level Security (RLS) policies control access to your data

## Next Steps

After configuration:
1. Your app will now persist all data to Supabase
2. Data will be available across devices and sessions
3. You can view analytics in the Supabase dashboard
4. All click tracking will be stored in separate tables for better performance

## Need Help?

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Check the browser console for detailed error messages

