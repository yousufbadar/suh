# Speak your heart online

A modern Next.js application for managing social media profiles with QR codes. Built with Next.js, Supabase, and deployed on Vercel.

## Features

- 🔐 **Authentication**: Local auth + SSO (Google, Facebook, Twitter)
- 📝 **Profile Management**: Create and manage multiple profiles
- 🔗 **Social Media Links**: Support for 18+ social media platforms
- 📱 **QR Codes**: Generate QR codes for easy profile sharing
- 📊 **Analytics**: Track QR scans and social media clicks
- 🎨 **Modern UI**: Beautiful, responsive design
- ☁️ **Cloud-Based**: Fully hosted on Supabase + Vercel

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel
- **Styling**: CSS Modules + Global CSS

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier available)

### 2. Clone and Install

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your credentials
3. Copy `.env.local.example` to `.env.local`
4. Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and run the SQL from `supabase/migrations/001_initial_schema.sql`

### 5. Enable Social Auth (Optional)

In Supabase Dashboard:
- Go to Authentication → Providers
- Enable Google, Facebook, or Twitter
- Add your OAuth credentials

### 6. Set Up Storage Bucket

1. Go to Storage in Supabase dashboard
2. Create a new bucket named `logos`
3. Make it public or set up RLS policies

### 7. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. Push your code to GitHub
2. Import your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically detect Next.js and deploy your app.

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/             # Utility libraries (Supabase clients)
│   ├── utils/           # Helper functions
│   └── types/           # TypeScript types
├── supabase/
│   └── migrations/      # Database migrations
└── public/             # Static assets
```

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server-side only)

## License

MIT
