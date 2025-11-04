# ⚡ Quick Environment Setup

## You're seeing this error because `.env.local` is missing!

### Quick Fix (5 steps):

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Open your project (or create one)

2. **Get Your API Keys**
   - Click **Settings** (gear icon) → **API**
   - Copy these 3 values:
     - **Project URL** (looks like: `https://xxxxx.supabase.co`)
     - **anon public** key (very long, starts with `eyJ...`)
     - **service_role secret** key (click "Reveal", also long)

3. **Create `.env.local` file**
   - I've created a template for you (`env.template`)
   - Copy it:
     ```powershell
     Copy-Item env.template .env.local
     ```
   - Or manually create `.env.local` in your project root

4. **Edit `.env.local`**
   - Open the file
   - Replace the placeholder values with your actual Supabase credentials
   - Example:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMTIzNDU2NywiZXhwIjoxOTQ2ODEwNTY3fQ...
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjMxMjM0NTY3LCJleHAiOjE5NDY4MTA1Njd9...
     ```

5. **Restart Dev Server**
   ```powershell
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### Can't Find the Service Role Key?

The `SUPABASE_SERVICE_ROLE_KEY` is in:
- **Settings** → **API** → Scroll to **"Project API keys"** section
- Look for **"service_role" `secret`** (it's hidden by default)
- Click **"Reveal"** button to show it
- Copy the entire key (it's very long!)

See `GET_SERVICE_ROLE_KEY.md` for detailed step-by-step instructions with screenshots guide.

### Don't have a Supabase project yet?

1. **Create one:**
   - Go to https://supabase.com
   - Sign up (free)
   - Click "New Project"
   - Fill in details, wait ~2 minutes

2. **Then follow steps above!**

### Still having issues?

See `ENV_SETUP.md` for detailed troubleshooting.

