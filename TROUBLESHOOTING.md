# Troubleshooting: Profile Not Saving to Database

## Common Issues and Solutions

### 1. Database Migration Not Run

**Problem:** The `profiles` table doesn't exist in your Supabase database.

**Solution:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Run the query
6. Verify the table was created by checking the Table Editor

### 2. Row Level Security (RLS) Policies

**Problem:** RLS policies might be blocking the insert.

**Solution:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Check that the `profiles` table has these policies:
   - "Users can insert own profiles" - Should allow INSERT with `WITH CHECK (auth.uid() = user_id)`
   - "Users can view own profiles" - Should allow SELECT with `USING (auth.uid() = user_id)`

### 3. Storage Bucket Not Created

**Problem:** If you're uploading logos, the storage bucket might not exist.

**Solution:**
1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `logos`
3. Make it **Public**
4. Set up storage policies if needed

### 4. Environment Variables Missing

**Problem:** Supabase credentials not configured.

**Solution:**
1. Check that `.env.local` exists
2. Verify it contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Restart your dev server after adding/changing environment variables

### 5. User Not Authenticated

**Problem:** User session expired or not logged in.

**Solution:**
1. Make sure you're logged in before creating a profile
2. Check the browser console for authentication errors
3. Try logging out and logging back in

## Debugging Steps

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for errors in the Console tab
   - Check the Network tab for failed API calls

2. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs
   - Look for errors related to `profiles` table

3. **Test Database Connection:**
   - Try creating a profile
   - Check the browser console for detailed error messages
   - The error should now include Supabase error codes

## Common Error Codes

- **PGRST116**: No rows found (table might not exist)
- **23505**: Unique constraint violation
- **42501**: Permission denied (RLS policy issue)
- **PGRST301**: Row Level Security policy violation

## Quick Fix: Disable RLS (Development Only)

⚠️ **Warning:** Only use this for development/testing!

1. Go to SQL Editor in Supabase
2. Run:
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ```
3. Test if profiles save
4. Re-enable RLS after testing:
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify all steps in DEPLOYMENT.md were completed
3. Check Supabase Dashboard → Database → Tables to confirm `profiles` table exists
4. Verify your user is authenticated in Supabase Dashboard → Authentication → Users
