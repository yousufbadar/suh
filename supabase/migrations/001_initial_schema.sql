-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  entity_name TEXT NOT NULL,
  description TEXT,
  email TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  contact_person_name TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,
  social_media JSONB DEFAULT '{}',
  logo TEXT,
  custom_links JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  user_id TEXT DEFAULT 'anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  reactivated_at TIMESTAMPTZ
);

-- QR scans table
CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_uuid UUID NOT NULL REFERENCES profiles(uuid) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social clicks table
CREATE TABLE IF NOT EXISTS social_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom link clicks table
CREATE TABLE IF NOT EXISTS custom_link_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  link_index INTEGER NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_uuid ON profiles(uuid);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_profile_uuid ON qr_scans(profile_uuid);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_social_clicks_profile_id ON social_clicks(profile_id);
CREATE INDEX IF NOT EXISTS idx_social_clicks_clicked_at ON social_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_custom_link_clicks_profile_id ON custom_link_clicks(profile_id);
CREATE INDEX IF NOT EXISTS idx_custom_link_clicks_clicked_at ON custom_link_clicks(clicked_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - allowing all operations for now
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_link_clicks ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (no authentication required for this app)
CREATE POLICY "Allow all operations on profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on qr_scans" ON qr_scans
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on social_clicks" ON social_clicks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on custom_link_clicks" ON custom_link_clicks
  FOR ALL USING (true) WITH CHECK (true);

