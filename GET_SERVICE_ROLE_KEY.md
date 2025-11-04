# How to Get SUPABASE_SERVICE_ROLE_KEY

## Step-by-Step Guide

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard
- Log in to your account

### 2. Open Your Project
- Click on your project (or create a new one if you don't have one yet)

### 3. Navigate to Settings
- Look for the **Settings** icon (gear icon ⚙️) in the left sidebar
- Click on it

### 4. Go to API Settings
- In the Settings menu, click on **"API"** (or "API Settings")

### 5. Find the Service Role Key
- Scroll down to the **"Project API keys"** section
- You'll see multiple keys:
  - **anon** `public` - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **service_role** `secret` - This is your `SUPABASE_SERVICE_ROLE_KEY` ⚠️

### 6. Reveal the Service Role Key
- The `service_role` key is hidden by default for security
- Click the **"Reveal"** button (eye icon 👁️) next to the `service_role` key
- It will show the full key (a long JWT token starting with `eyJ...`)

### 7. Copy the Key
- Select the entire key (it's very long, usually 200+ characters)
- Copy it (Ctrl+C)
- Paste it into your `.env.local` file as `SUPABASE_SERVICE_ROLE_KEY`

## ⚠️ Important Security Notes

### Keep This Key Secret!
- **Never commit** `SUPABASE_SERVICE_ROLE_KEY` to Git (it's already in `.gitignore`)
- **Never share** this key publicly
- **Never expose** it in client-side code
- This key has **full admin access** to your database

### When to Use Service Role Key
- ✅ Server-side operations only
- ✅ Backend API routes
- ✅ Database migrations
- ✅ Administrative tasks

### When NOT to Use Service Role Key
- ❌ Client-side code (use `anon` key instead)
- ❌ Browser JavaScript
- ❌ Public repositories

## Visual Guide

```
Supabase Dashboard
├── Settings (gear icon)
    ├── API
        ├── Project URL → NEXT_PUBLIC_SUPABASE_URL
        ├── anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY
        └── service_role secret → SUPABASE_SERVICE_ROLE_KEY [Click Reveal!]
```

## Your `.env.local` Should Look Like:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMTIzNDU2NywiZXhwIjoxOTQ2ODEwNTY3fQ...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjMxMjM0NTY3LCJleHAiOjE5NDY4MTA1Njd9...
```

## Quick Checklist

- [ ] Opened Supabase Dashboard
- [ ] Selected my project
- [ ] Clicked Settings → API
- [ ] Found the `service_role` key section
- [ ] Clicked "Reveal" to show the key
- [ ] Copied the entire key (it's very long!)
- [ ] Pasted it into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Saved `.env.local`
- [ ] Restarted dev server

## Still Can't Find It?

1. **Make sure you're logged in** to the correct Supabase account
2. **Check you're in the right project** (top left shows project name)
3. **Look for "service_role"** - it's labeled differently in some versions:
   - "service_role secret"
   - "service_role (secret)"
   - "Service Role Key"
4. **The key starts with `eyJ`** - if you see something else, double-check you're looking at the right field

## Need More Help?

- 📖 [Supabase Docs: API Keys](https://supabase.com/docs/guides/api/api-keys)
- 💬 [Supabase Discord Community](https://discord.supabase.com)

