# Setup Guide: Next.js + Supabase + Vercel

## Quick Start Checklist

### 1. Supabase Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project (free tier is fine)
   - Wait for database to initialize (~2 minutes)

2. **Get Your Credentials**
   - Go to Settings → API
   - Copy:
     - Project URL
     - `anon` `public` key
     - `service_role` `secret` key (keep this secret!)

3. **Set Environment Variables**
   - Create `.env.local` file in project root
   - Add:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```

### 2. Database Setup

1. **Run Migration**
   - Go to Supabase Dashboard → SQL Editor
   - Open `supabase/migrations/001_initial_schema.sql`
   - Copy the entire SQL
   - Paste and click "Run"

2. **Verify Tables**
   - Go to Table Editor
   - You should see `profiles` table

### 3. Storage Setup

1. **Create Storage Bucket**
   - Go to Storage in Supabase Dashboard
   - Click "New bucket"
   - Name: `logos`
   - Make it **Public** (or set up RLS if you prefer)

2. **Set Storage Policies** (if bucket is not public)
   - Go to Storage → Policies
   - Add policy for `logos` bucket:
     - Policy name: "Users can upload own logos"
     - Allowed operation: INSERT
     - Policy definition: `bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]`

### 4. Authentication Setup (Optional - for SSO)

1. **Enable OAuth Providers**
   - Go to Authentication → Providers
   - Enable Google, Facebook, or Twitter
   - Add OAuth credentials from each provider:
     - **Google**: [Google Cloud Console](https://console.cloud.google.com)
     - **Facebook**: [Facebook Developers](https://developers.facebook.com)
     - **Twitter**: [Twitter Developer Portal](https://developer.twitter.com)

2. **Set Redirect URLs**
   - In each OAuth provider, add redirect URL:
     - `https://your-project-url.supabase.co/auth/v1/callback`
   - For production: Add your Vercel domain too

### 5. Test Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your_repo_url
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables (same as `.env.local`)
   - Deploy!

3. **Update Supabase URLs**
   - After deployment, update OAuth redirect URLs in Supabase
   - Add your Vercel domain to allowed redirect URLs

## Troubleshooting

### Issue: "Invalid API key"
- Check `.env.local` file exists
- Verify keys are correct (no extra spaces)
- Restart dev server after adding env vars

### Issue: "Relation does not exist"
- Run the SQL migration again
- Check table exists in Supabase dashboard

### Issue: OAuth not working
- Verify redirect URLs in OAuth provider settings
- Check Supabase project URL is correct
- Ensure provider is enabled in Supabase dashboard

### Issue: Can't upload logos
- Verify storage bucket exists and is public
- Check file size limits (default 50MB)
- Verify RLS policies if bucket is private

## Next Steps

- [ ] Customize branding
- [ ] Add custom domain
- [ ] Set up email templates (Supabase)
- [ ] Configure analytics
- [ ] Set up backup strategy

## Support

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)

