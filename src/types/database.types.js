// Database types for Supabase
// These will be generated from Supabase, but here's a template

export const profilesTable = {
  name: 'profiles',
  columns: {
    id: 'uuid',
    user_id: 'uuid',
    entity_name: 'text',
    description: 'text',
    email: 'text',
    website: 'text',
    phone: 'text',
    address: 'text',
    city: 'text',
    country: 'text',
    logo_url: 'text',
    social_media: 'jsonb',
    uuid: 'uuid',
    active: 'boolean',
    qr_scans: 'integer',
    social_clicks: 'jsonb',
    created_at: 'timestamptz',
    updated_at: 'timestamptz',
    deactivated_at: 'timestamptz',
  }
}

export const usersTable = {
  name: 'users',
  // Supabase Auth handles users table automatically
  // We'll create a profiles table linked to auth.users
}

