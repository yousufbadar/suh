-- Option to show custom links above social icons on the public QR/icons page
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_links_above_social BOOLEAN DEFAULT false;
