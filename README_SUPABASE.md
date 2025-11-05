# Supabase Database Setup

This application uses Supabase for database persistence. Follow these steps to set up your Supabase database:

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Wait for the project to be fully provisioned

## 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy your **Project URL** (this is your `REACT_APP_SUPABASE_URL`)
3. Copy your **anon/public** key (this is your `REACT_APP_SUPABASE_ANON_KEY`)

## 3. Set Up Environment Variables

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the following variables:

```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `your_supabase_project_url` and `your_supabase_anon_key` with your actual Supabase credentials.

## 4. Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the migration

This will create:
- `profiles` table - Stores all entity/profile data
- `qr_scans` table - Tracks QR code scans
- `social_clicks` table - Tracks social media link clicks
- `custom_link_clicks` table - Tracks custom link clicks
- Indexes for better performance
- Row Level Security (RLS) policies allowing all operations

## 5. Verify Setup

1. Restart your React development server (`npm start`)
2. The application should now be using Supabase for data persistence
3. Check the browser console for any connection errors

## Database Schema

### Profiles Table
- `id` - TEXT PRIMARY KEY
- `uuid` - UUID UNIQUE (for public QR codes)
- `entity_name` - Company/Brand name
- `description` - Profile description
- `email`, `website`, `phone` - Contact information
- `address`, `city`, `country` - Location information
- `contact_person_name`, `contact_person_email`, `contact_person_phone` - Contact person details
- `social_media` - JSONB object with social media links
- `logo` - TEXT (base64 data URL)
- `custom_links` - JSONB array with custom links
- `active` - BOOLEAN (archive status)
- `user_id` - TEXT (defaults to 'anonymous')
- `created_at`, `updated_at` - Timestamps
- `deactivated_at`, `reactivated_at` - Archive timestamps

### QR Scans Table
- `id` - UUID PRIMARY KEY
- `profile_uuid` - UUID (references profiles.uuid)
- `scanned_at` - TIMESTAMPTZ

### Social Clicks Table
- `id` - UUID PRIMARY KEY
- `profile_id` - TEXT (references profiles.id)
- `platform` - TEXT (platform name)
- `clicked_at` - TIMESTAMPTZ

### Custom Link Clicks Table
- `id` - UUID PRIMARY KEY
- `profile_id` - TEXT (references profiles.id)
- `link_index` - INTEGER (index of custom link)
- `clicked_at` - TIMESTAMPTZ

## Troubleshooting

### Connection Issues
- Verify your environment variables are set correctly
- Check that your Supabase project is active
- Ensure the migration has been run successfully

### Data Not Persisting
- Check browser console for errors
- Verify RLS policies are set correctly
- Check Supabase logs in the dashboard

### Migration Errors
- Make sure you're running the migration as the project owner
- Check that the `uuid-ossp` extension is available
- Verify table names don't conflict with existing tables

