-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  description TEXT,
  email TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  logo_url TEXT,
  social_media JSONB DEFAULT '{}',
  uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  active BOOLEAN DEFAULT true,
  qr_scans INTEGER DEFAULT 0,
  social_clicks JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  reactivated_at TIMESTAMPTZ
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- Create index on uuid for QR code lookups
CREATE INDEX IF NOT EXISTS profiles_uuid_idx ON profiles(uuid);

-- Create index on active status
CREATE INDEX IF NOT EXISTS profiles_active_idx ON profiles(active);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profiles
CREATE POLICY "Users can view own profiles"
  ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own profiles
CREATE POLICY "Users can insert own profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own profiles
CREATE POLICY "Users can update own profiles"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own profiles
CREATE POLICY "Users can delete own profiles"
  ON profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Public can read profiles by UUID (for QR code pages)
CREATE POLICY "Public can read profiles by UUID"
  ON profiles
  FOR SELECT
  USING (true); -- Allow public read, but we'll filter by UUID in application

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to track QR scans (can be called publicly)
CREATE OR REPLACE FUNCTION track_qr_scan(profile_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET qr_scans = COALESCE(qr_scans, 0) + 1,
      updated_at = NOW()
  WHERE uuid = profile_uuid
  AND active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track social clicks (can be called publicly)
CREATE OR REPLACE FUNCTION track_social_click(profile_uuid UUID, platform TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET social_clicks = jsonb_set(
    COALESCE(social_clicks, '{}'::jsonb),
    ARRAY[platform],
    to_jsonb(COALESCE((social_clicks->>platform)::integer, 0) + 1)
  ),
  updated_at = NOW()
  WHERE uuid = profile_uuid
  AND active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

