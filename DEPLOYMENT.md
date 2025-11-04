# 🚀 Deployment Guide: Next.js + Supabase + Vercel

## ✅ Migration Complete!

All components have been successfully updated to use Supabase instead of localStorage.

## Quick Deployment Steps

### 1. Set Up Supabase (5 minutes)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for database initialization (~2 minutes)

2. **Get Credentials**
   - Settings → API
   - Copy:
     - Project URL
     - `anon` `public` key
     - `service_role` `secret` key

3. **Run Database Migration**
   - SQL Editor → New Query
   - Copy/paste `supabase/migrations/001_initial_schema.sql`
   - Run it

4. **Create Storage Bucket**
   - Storage → New bucket
   - Name: `logos`
   - Make it **Public**

### 2. Set Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://gobcyniwhfptzjttkcoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvYmN5bml3aGZwdHpqdHRrY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjU1MzgsImV4cCI6MjA3NzYwMTUzOH0.MXFX8dJlc-Ojzx-RpKeIz1MpwiCpdfNWr69PjOzMQjs
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvYmN5bml3aGZwdHpqdHRrY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjU1MzgsImV4cCI6MjA3NzYwMTUzOH0.MXFX8dJlc-Ojzx-RpKeIz1MpwiCpdfNWr69PjOzMQjs
```

### 3. Test Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Next.js + Supabase migration"
   git remote add origin your_repo_url
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables (same as `.env.local`)
   - Deploy!

3. **Update Redirect URLs** (for SSO)
   - After deployment, update OAuth redirect URLs in Supabase
   - Add: `https://your-app.vercel.app/auth/callback`

## What's Changed

### ✅ Components Updated
- ✅ `RegistrationForm.js` - Uses Supabase Storage & Database
- ✅ `LoginSupabase.js` - New Supabase auth component
- ✅ `EntityList.js` - Uses Supabase queries
- ✅ `EntityView.js` - Uses Supabase queries & RPC functions
- ✅ `SocialMediaIconsPage.js` - Uses Supabase queries & RPC functions

### ✅ Database Fields Mapping
- `entityName` → `entity_name`
- `socialMedia` → `social_media`
- `logo` → `logo_url`
- `userId` → `user_id`
- `qrScans` → `qr_scans`
- `socialClicks` → `social_clicks`

### ✅ Features
- ✅ Authentication with Supabase Auth
- ✅ SSO support (Google, Facebook, Twitter)
- ✅ File uploads to Supabase Storage
- ✅ Real-time analytics tracking
- ✅ Row Level Security (RLS) policies

## Troubleshooting

### Error: "Invalid API key"
→ Check `.env.local` exists and keys are correct

### Error: "Table doesn't exist"
→ Run SQL migration again

### Error: "Storage upload fails"
→ Check `logos` bucket exists and is public

### Error: "RPC function not found"
→ Run the SQL migration which creates the functions

## Next Steps

1. Enable SSO providers in Supabase dashboard
2. Test all features locally
3. Deploy to Vercel
4. Add custom domain (optional)
5. Monitor analytics

## Support

- 📖 [Next.js Docs](https://nextjs.org/docs)
- 🔥 [Supabase Docs](https://supabase.com/docs)
- 🚀 [Vercel Docs](https://vercel.com/docs)

