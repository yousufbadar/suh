# Environment Variables Setup Guide

## Quick Setup Steps

### 1. Create Supabase Project (if you haven't already)

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Login
3. Click **"New Project"**
4. Fill in:
   - **Name**: Your project name
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
5. Click **"Create new project"**
6. Wait ~2 minutes for setup to complete

### 2. Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → This is your `SUPABASE_SERVICE_ROLE_KEY` (click "Reveal" to see it)

### 3. Create `.env.local` File

1. In your project root (`D:\yb\workspace\suh`), create a file named `.env.local`
2. Copy this template and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMTIzNDU2NywiZXhwIjoxOTQ2ODEwNTY3fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjMxMjM0NTY3LCJleHAiOjE5NDY4MTA1Njd9.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

### 4. Restart Your Dev Server

After creating `.env.local`:
1. Stop your dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

### 5. Verify It's Working

You should see:
- ✅ No more "Missing Supabase environment variables" error
- ✅ App loads successfully
- ✅ You can navigate to `/profiles` page

## Important Notes

- ⚠️ **Never commit `.env.local` to Git** - it's already in `.gitignore`
- ✅ The `.env.example` file is safe to commit (no real values)
- 🔐 Keep your `SUPABASE_SERVICE_ROLE_KEY` secret - it has admin access

## Troubleshooting

### Error: "Invalid API key"
- Check that you copied the entire key (they're very long)
- Make sure there are no extra spaces or quotes
- Verify you're using the correct key type (anon vs service_role)

### Error: "Connection refused"
- Verify your `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check that your Supabase project is active (not paused)

### Still getting "Missing environment variables"?
- Make sure the file is named exactly `.env.local` (not `.env.local.txt`)
- Verify the file is in the project root (same folder as `package.json`)
- Restart your dev server after creating the file
- Check for typos in variable names (must match exactly)

## Next Steps

Once your environment variables are set:
1. ✅ Run the database migration (`supabase/migrations/001_initial_schema.sql`)
2. ✅ Create the `logos` storage bucket
3. ✅ Start using the app!

See `SETUP.md` or `QUICKSTART.md` for detailed instructions.

