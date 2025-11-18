# Deployment Guide

This guide covers the best hosting options for your React + Supabase application.

## 🚀 Recommended Hosting Options

### 1. **Vercel** (Recommended) ⭐
**Best for:** React apps, automatic deployments, excellent performance

**Pros:**
- Free tier with generous limits
- Automatic deployments from GitHub
- Built-in CI/CD
- Excellent performance with global CDN
- Easy environment variable management
- Zero configuration needed for React apps

**Steps to Deploy:**

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Sign up at [vercel.com](https://vercel.com)** (free with GitHub)

3. **Import your GitHub repository**

4. **Configure environment variables:**
   - Go to Project Settings → Environment Variables
   - Add:
     - `REACT_APP_SUPABASE_URL` = Your Supabase project URL
     - `REACT_APP_SUPABASE_ANON_KEY` = Your Supabase anon key

5. **Deploy!** Vercel will automatically:
   - Detect it's a React app
   - Run `npm run build`
   - Deploy to production

**Build Settings (auto-detected):**
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

**URL:** Your app will be live at `your-app-name.vercel.app`

---

### 2. **Netlify** ⭐
**Best for:** Static sites, easy drag-and-drop, great free tier

**Pros:**
- Free tier with 100GB bandwidth/month
- Drag-and-drop deployment option
- Automatic deployments from Git
- Built-in form handling
- Easy environment variable setup

**Steps to Deploy:**

1. **Build your app locally:**
   ```bash
   npm run build
   ```

2. **Option A - Drag & Drop (Easiest):**
   - Go to [netlify.com](https://netlify.com) and sign up
   - Drag the `build` folder to Netlify's deploy area
   - Done! Your app is live

3. **Option B - Git Integration (Recommended):**
   - Push code to GitHub
   - Sign up at [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect GitHub and select your repository
   - Configure:
     - Build command: `npm run build`
     - Publish directory: `build`
   - Add environment variables in Site Settings → Environment Variables

**URL:** Your app will be live at `your-app-name.netlify.app`

---

### 3. **GitHub Pages** (Free but Limited)
**Best for:** Simple static hosting, free forever

**Pros:**
- Completely free
- Easy setup
- Good for portfolios/simple apps

**Cons:**
- No server-side features
- Limited to static files
- Custom domain requires setup

**Steps to Deploy:**

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   ```json
   {
     "homepage": "https://yourusername.github.io/your-repo-name",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
   }
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

4. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Select source: `gh-pages` branch
   - Your app will be at `yourusername.github.io/your-repo-name`

---

### 4. **Render** (Good Alternative)
**Best for:** Full-stack apps, Docker support

**Pros:**
- Free tier available
- Automatic SSL
- Easy environment variable management
- Good for React apps

**Steps:**
1. Sign up at [render.com](https://render.com)
2. Connect GitHub repository
3. Create new "Static Site"
4. Configure build: `npm run build`
5. Add environment variables
6. Deploy!

---

### 5. **Railway** (Modern Option)
**Best for:** Full-stack apps, easy database integration

**Pros:**
- $5 free credit monthly
- Easy Supabase integration
- Automatic deployments
- Great developer experience

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] **Environment Variables are set:**
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`

- [ ] **Build works locally:**
  ```bash
  npm run build
  ```

- [ ] **Test the build:**
  ```bash
  npx serve -s build
  ```

- [ ] **Supabase RLS policies are configured** (for production)

- [ ] **CORS settings in Supabase** allow your production domain

---

## 🔧 Environment Variables Setup

For all hosting platforms, you need to set these environment variables:

1. **REACT_APP_SUPABASE_URL**
   - Get from: Supabase Dashboard → Project Settings → API
   - Format: `https://xxxxx.supabase.co`

2. **REACT_APP_SUPABASE_ANON_KEY**
   - Get from: Supabase Dashboard → Project Settings → API
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Important:** 
- React requires `REACT_APP_` prefix for environment variables
- Never commit `.env` files with real keys to Git
- Add `.env` to `.gitignore`

---

## 🌐 Custom Domain Setup

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### Netlify:
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Configure DNS as instructed

---

## 🚨 Common Issues & Solutions

### Issue: Environment variables not working
**Solution:** 
- Make sure they start with `REACT_APP_`
- Rebuild after adding variables
- Check variable names match exactly

### Issue: Build fails
**Solution:**
- Check Node version (should be 14+)
- Run `npm install` locally first
- Check build logs for specific errors

### Issue: Supabase connection fails
**Solution:**
- Verify environment variables are set correctly
- Check Supabase project is active
- Verify RLS policies allow public access where needed
- Check CORS settings in Supabase

### Issue: Routing doesn't work (404 on refresh)
**Solution:**
- For Vercel: Create `vercel.json`:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- For Netlify: Create `public/_redirects`:
  ```
  /*    /index.html   200
  ```

---

## 📊 Comparison Table

| Platform | Free Tier | Ease of Use | Performance | Best For |
|----------|-----------|-------------|-------------|----------|
| **Vercel** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | React apps |
| **Netlify** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Static sites |
| **GitHub Pages** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Simple sites |
| **Render** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Full-stack |
| **Railway** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Modern apps |

---

## 🎯 My Recommendation

**Start with Vercel** - It's the easiest and best option for React apps:
- Zero configuration
- Automatic deployments
- Excellent performance
- Great free tier
- Perfect for React + Supabase

---

## 📚 Additional Resources

- [Vercel Deployment Docs](https://vercel.com/docs)
- [Netlify Deployment Docs](https://docs.netlify.com)
- [Supabase Production Guide](https://supabase.com/docs/guides/hosting)

---

## 🆘 Need Help?

If you encounter issues:
1. Check the build logs in your hosting platform
2. Verify environment variables are set correctly
3. Test the build locally first: `npm run build && npx serve -s build`
4. Check Supabase dashboard for connection issues

