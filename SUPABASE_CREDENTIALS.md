# How to Find Your Supabase Credentials

You need **2 credentials** to connect your app to Supabase:

1. **REACT_APP_SUPABASE_URL** - Your project URL
2. **REACT_APP_SUPABASE_ANON_KEY** - Your public/anonymous key

---

## 📍 Step-by-Step: Finding Your Credentials

### Step 1: Log into Supabase
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account

### Step 2: Select Your Project
1. If you have multiple projects, click on the project you want to use
2. If you don't have a project yet, create one:
   - Click **"New Project"**
   - Enter a project name
   - Set a database password (save this!)
   - Choose a region
   - Click **"Create new project"**
   - Wait 2-3 minutes for setup

### Step 3: Get Your Credentials
1. In your Supabase project dashboard, look at the **left sidebar**
2. Click on **Settings** (⚙️ gear icon at the bottom)
3. Click on **API** in the settings menu
4. You'll see a page with your API credentials

### Step 4: Copy the Values

You'll see two important sections:

#### 🔗 Project URL
- **Label**: "Project URL" or "URL"
- **Location**: Usually at the top of the API settings page
- **Format**: `https://xxxxxxxxxxxxx.supabase.co`
- **This is your**: `REACT_APP_SUPABASE_URL`

#### 🔑 API Keys
- **Label**: "Project API keys" or "API Keys"
- **Find**: The key labeled **"anon"** or **"public"**
- **Format**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long string)
- **This is your**: `REACT_APP_SUPABASE_ANON_KEY`

⚠️ **Important**: Use the **"anon"** or **"public"** key, NOT the **"service_role"** key!

---

## 📝 Visual Guide

```
Supabase Dashboard
├── Left Sidebar
│   ├── Table Editor
│   ├── SQL Editor
│   ├── Authentication
│   ├── Storage
│   └── Settings ⚙️  ← Click here
│       ├── General
│       ├── API ← Click here
│       ├── Database
│       └── ...
│
API Settings Page Shows:
├── Project URL: https://xxxxx.supabase.co  ← Copy this
└── API Keys:
    ├── anon public: eyJhbG...  ← Copy this one
    └── service_role: eyJhbG...  ← Don't use this!
```

---

## 💻 Where to Use These Credentials

### For Local Development (.env file):
Create a `.env` file in your project root:

```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-long-key-here
```

### For Production Deployment (Vercel/Netlify/etc):
Add these as **Environment Variables** in your hosting platform:

1. **Vercel**: Project Settings → Environment Variables
2. **Netlify**: Site Settings → Environment Variables
3. **Render**: Environment → Environment Variables

---

## 🔍 Example of What You'll See

In Supabase API Settings, you'll see something like:

```
Project URL
https://abcdefghijklmnop.supabase.co

Project API keys
┌─────────────────────────────────────────────────┐
│ anon public                                      │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi... │ ← Copy this
│ [Reveal] [Copy]                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ service_role                                    │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi... │ ← Don't use
│ [Reveal] [Copy]                                  │
└─────────────────────────────────────────────────┘
```

---

## ✅ Quick Checklist

- [ ] Logged into Supabase dashboard
- [ ] Selected your project
- [ ] Went to Settings → API
- [ ] Copied the **Project URL** (starts with `https://`)
- [ ] Copied the **anon public** key (long string starting with `eyJ`)
- [ ] Added both to `.env` file (for local) or hosting platform (for production)

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Using service_role key instead of anon key**
   - ✅ Use the **anon/public** key for client-side apps

2. ❌ **Missing the `REACT_APP_` prefix**
   - ✅ Must be: `REACT_APP_SUPABASE_URL` (not `SUPABASE_URL`)

3. ❌ **Adding quotes around the values**
   - ✅ Correct: `REACT_APP_SUPABASE_URL=https://xxx.supabase.co`
   - ❌ Wrong: `REACT_APP_SUPABASE_URL="https://xxx.supabase.co"`

4. ❌ **Forgetting to restart the dev server**
   - ✅ After creating/updating `.env`, restart: `npm start`

---

## 🆘 Still Can't Find It?

1. **Check if you're in the right project**
   - Look at the project name in the top-left of the dashboard

2. **Check if the project is active**
   - Paused projects won't show credentials
   - Reactivate if needed

3. **Try the direct link**
   - Go to: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api`
   - Replace `YOUR_PROJECT_ID` with your actual project ID

4. **Check browser console**
   - If credentials are missing, you'll see error messages
   - Look for: "Missing Supabase configuration!"

---

## 📚 Need More Help?

- Supabase Docs: https://supabase.com/docs/guides/getting-started
- Supabase Dashboard: https://supabase.com/dashboard
- Check your project: https://supabase.com/dashboard/projects

---

## 🔐 Security Note

- ✅ The **anon key** is safe to use in client-side code (it's public)
- ✅ It's designed to be exposed in your React app
- ❌ Never use the **service_role** key in client-side code
- ❌ Never commit your `.env` file to Git (it's already in `.gitignore`)

