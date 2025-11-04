# Migration Guide: React → Next.js + Supabase

## Summary of Changes

### File Structure
- ✅ Next.js App Router structure (`src/app/`)
- ✅ Supabase client setup (`src/lib/supabase/`)
- ✅ API routes (`src/app/api/`)
- ✅ Components migrated (kept existing structure)

### Key Changes

1. **Authentication**
   - Old: Local storage with SHA-256 hashing
   - New: Supabase Auth with built-in SSO support
   - File: `src/components/LoginSupabase.js` (new)

2. **Data Storage**
   - Old: `localStorage` via `src/utils/storage.js`
   - New: Supabase PostgreSQL database
   - Migration: Need to update components to use Supabase client

3. **Routing**
   - Old: Client-side routing with state
   - New: Next.js App Router (`src/app/`)
   - Pages:
     - `/` → Home page
     - `/profiles` → Profile list
     - `/profiles/[id]` → Profile view
     - `/profiles/new` → Create profile
     - `/profiles/edit/[id]` → Edit profile
     - `/icons?uuid=...` → Public QR code page

4. **API**
   - Old: Direct localStorage access
   - New: API routes (`src/app/api/profiles/route.js`)

## Migration Steps

### Step 1: Update Login Component
Replace `Login.js` with `LoginSupabase.js` in all imports:
```js
// Old
import Login from '@/components/Login'

// New  
import LoginSupabase from '@/components/LoginSupabase'
```

### Step 2: Update Storage Calls
Replace localStorage calls with Supabase:
```js
// Old
import { getEntities, saveEntity } from '@/utils/storage'
const entities = getEntities()

// New
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
const { data: entities } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
```

### Step 3: Update RegistrationForm
- Replace `getCurrentUser()` from `@/utils/auth` with Supabase auth
- Replace `saveEntity()` with API call or direct Supabase call
- Update file upload to use Supabase Storage

### Step 4: Update Components
- `EntityList`: Use Supabase queries
- `EntityView`: Use Supabase queries
- `SocialMediaIconsPage`: Use Supabase for tracking

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run database migration
3. ⏳ Update all components to use Supabase
4. ⏳ Set up file storage
5. ⏳ Test authentication
6. ⏳ Deploy to Vercel

## Breaking Changes

- All localStorage data will need to be migrated manually
- Authentication flow changed completely
- File paths changed (use Next.js routing)

