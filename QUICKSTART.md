# 🚀 Quick Start: Next.js + Supabase + Vercel

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → Sign up/Login
2. Click "New Project"
3. Choose organization, name your project
4. Set database password (save it!)
5. Choose region, click "Create new project"
6. Wait ~2 minutes for setup

### 3. Get Credentials
1. In Supabase Dashboard → Settings → API
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Set Environment Variables
Create `.env.local` in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...
```

### 5. Run Database Migration
1. Supabase Dashboard → SQL Editor
2. Click "New query"
3. Open `supabase/migrations/001_initial_schema.sql`
4. Copy entire SQL, paste in editor
5. Click "Run" (or press Ctrl+Enter)
6. ✅ Should see "Success. No rows returned"

### 6. Create Storage Bucket
1. Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `logos`
4. Check "Public bucket"
5. Click "Create bucket"

### 7. Run Locally
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000)

### 8. Deploy to Vercel
1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Import your repo
4. Add environment variables (same as `.env.local`)
5. Click "Deploy"
6. ✨ Done! Your app is live!

## Enable SSO (Optional)

### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com)
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add authorized redirect URI:
   - `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID & Secret
6. Supabase → Authentication → Providers → Google
7. Enable, paste credentials, Save

### Facebook OAuth
1. [Facebook Developers](https://developers.facebook.com)
2. Create app → Facebook Login
3. Settings → Valid OAuth Redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
4. Copy App ID & Secret
5. Supabase → Authentication → Providers → Facebook
6. Enable, paste credentials, Save

### Twitter OAuth
1. [Twitter Developer Portal](https://developer.twitter.com)
2. Create app → OAuth 2.0
3. Callback URL:
   - `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID & Secret
5. Supabase → Authentication → Providers → Twitter
6. Enable, paste credentials, Save

## Test Your Setup

### ✅ Checklist
- [ ] Can create account (email/password)
- [ ] Can login
- [ ] Can create profile
- [ ] Can view profile list
- [ ] QR code generates correctly
- [ ] QR code page loads publicly
- [ ] Logo uploads work
- [ ] Analytics tracking works

## Common Issues

**"Invalid API key"**
→ Check `.env.local` exists, keys are correct, restart dev server

**"Table doesn't exist"**
→ Run SQL migration again in Supabase SQL Editor

**"Storage upload fails"**
→ Check bucket exists and is public, check file size limits

**"OAuth not working"**
→ Verify redirect URLs match exactly, including https://

## Next Steps

- 📧 Set up email templates in Supabase
- 🔒 Review RLS policies
- 📊 Add analytics tracking
- 🌐 Add custom domain
- 🎨 Customize branding

## Need Help?

- 📖 [Full Setup Guide](./SETUP.md)
- 🔄 [Migration Guide](./MIGRATION.md)
- 📚 [Next.js Docs](https://nextjs.org/docs)
- 🔥 [Supabase Docs](https://supabase.com/docs)

