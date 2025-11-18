-- Migration to add minute-based click tracking
-- This adds new tables to track clicks aggregated by date, hour, and minute

-- QR scans by minute table
CREATE TABLE IF NOT EXISTS qr_scans_by_minute (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_uuid UUID NOT NULL REFERENCES profiles(uuid) ON DELETE CASCADE,
  click_date DATE NOT NULL,
  click_hour INTEGER NOT NULL CHECK (click_hour >= 0 AND click_hour <= 23),
  click_minute INTEGER NOT NULL CHECK (click_minute >= 0 AND click_minute <= 59),
  click_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_qr_scan_minute UNIQUE(profile_uuid, click_date, click_hour, click_minute)
);

-- Social clicks by minute table
CREATE TABLE IF NOT EXISTS social_clicks_by_minute (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  click_date DATE NOT NULL,
  click_hour INTEGER NOT NULL CHECK (click_hour >= 0 AND click_hour <= 23),
  click_minute INTEGER NOT NULL CHECK (click_minute >= 0 AND click_minute <= 59),
  click_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_social_click_minute UNIQUE(profile_id, platform, click_date, click_hour, click_minute)
);

-- Custom link clicks by minute table
CREATE TABLE IF NOT EXISTS custom_link_clicks_by_minute (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  link_index INTEGER NOT NULL,
  click_date DATE NOT NULL,
  click_hour INTEGER NOT NULL CHECK (click_hour >= 0 AND click_hour <= 23),
  click_minute INTEGER NOT NULL CHECK (click_minute >= 0 AND click_minute <= 59),
  click_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_custom_link_click_minute UNIQUE(profile_id, link_index, click_date, click_hour, click_minute)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_scans_by_minute_profile_uuid ON qr_scans_by_minute(profile_uuid);
CREATE INDEX IF NOT EXISTS idx_qr_scans_by_minute_date_hour_min ON qr_scans_by_minute(click_date, click_hour, click_minute);
CREATE INDEX IF NOT EXISTS idx_social_clicks_by_minute_profile_id ON social_clicks_by_minute(profile_id);
CREATE INDEX IF NOT EXISTS idx_social_clicks_by_minute_date_hour_min ON social_clicks_by_minute(click_date, click_hour, click_minute);
CREATE INDEX IF NOT EXISTS idx_custom_link_clicks_by_minute_profile_id ON custom_link_clicks_by_minute(profile_id);
CREATE INDEX IF NOT EXISTS idx_custom_link_clicks_by_minute_date_hour_min ON custom_link_clicks_by_minute(click_date, click_hour, click_minute);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_click_minute_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update updated_at
CREATE TRIGGER update_qr_scans_by_minute_updated_at BEFORE UPDATE ON qr_scans_by_minute
  FOR EACH ROW EXECUTE FUNCTION update_click_minute_updated_at();

CREATE TRIGGER update_social_clicks_by_minute_updated_at BEFORE UPDATE ON social_clicks_by_minute
  FOR EACH ROW EXECUTE FUNCTION update_click_minute_updated_at();

CREATE TRIGGER update_custom_link_clicks_by_minute_updated_at BEFORE UPDATE ON custom_link_clicks_by_minute
  FOR EACH ROW EXECUTE FUNCTION update_click_minute_updated_at();

-- Enable Row Level Security
ALTER TABLE qr_scans_by_minute ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_clicks_by_minute ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_link_clicks_by_minute ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching the existing click tables)
CREATE POLICY "Public can track QR scans by minute" ON qr_scans_by_minute
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own QR scans by minute" ON qr_scans_by_minute
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.uuid = qr_scans_by_minute.profile_uuid 
      AND profiles.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Public can track social clicks by minute" ON social_clicks_by_minute
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own social clicks by minute" ON social_clicks_by_minute
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = social_clicks_by_minute.profile_id 
      AND profiles.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Public can track custom link clicks by minute" ON custom_link_clicks_by_minute
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own custom link clicks by minute" ON custom_link_clicks_by_minute
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = custom_link_clicks_by_minute.profile_id 
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Function to increment or insert click count for a minute
CREATE OR REPLACE FUNCTION increment_click_count(
  table_name TEXT,
  profile_identifier TEXT,
  click_date DATE,
  click_hour INTEGER,
  click_minute INTEGER,
  additional_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
DECLARE
  sql_query TEXT;
BEGIN
  -- Build dynamic SQL based on table name
  IF table_name = 'qr_scans_by_minute' THEN
    sql_query := format('
      INSERT INTO %I (profile_uuid, click_date, click_hour, click_minute, click_count)
      VALUES ($1::UUID, $2, $3, $4, 1)
      ON CONFLICT (profile_uuid, click_date, click_hour, click_minute)
      DO UPDATE SET click_count = %I.click_count + 1, updated_at = NOW()',
      table_name, table_name);
    EXECUTE sql_query USING profile_identifier::UUID, click_date, click_hour, click_minute;
    
  ELSIF table_name = 'social_clicks_by_minute' THEN
    sql_query := format('
      INSERT INTO %I (profile_id, platform, click_date, click_hour, click_minute, click_count)
      VALUES ($1, $2, $3, $4, $5, 1)
      ON CONFLICT (profile_id, platform, click_date, click_hour, click_minute)
      DO UPDATE SET click_count = %I.click_count + 1, updated_at = NOW()',
      table_name, table_name);
    EXECUTE sql_query USING profile_identifier, additional_data->>'platform', click_date, click_hour, click_minute;
    
  ELSIF table_name = 'custom_link_clicks_by_minute' THEN
    sql_query := format('
      INSERT INTO %I (profile_id, link_index, click_date, click_hour, click_minute, click_count)
      VALUES ($1, $2, $3, $4, $5, 1)
      ON CONFLICT (profile_id, link_index, click_date, click_hour, click_minute)
      DO UPDATE SET click_count = %I.click_count + 1, updated_at = NOW()',
      table_name, table_name);
    EXECUTE sql_query USING profile_identifier, (additional_data->>'link_index')::INTEGER, click_date, click_hour, click_minute;
  END IF;
END;
$$ LANGUAGE plpgsql;

