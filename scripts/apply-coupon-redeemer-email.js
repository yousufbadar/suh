/**
 * Apply migration 008: add redeemed_by_email to coupon_codes and backfill.
 * Run: node scripts/apply-coupon-redeemer-email.js
 *
 * Requires DATABASE_URL in .env (Supabase → Settings → Database → Connection string URI)
 * Or run supabase/migrations/008_coupon_redeemer_email.sql in the SQL Editor manually.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_coupon_redeemer_email.sql');

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    console.log('No DATABASE_URL in .env — run this SQL in Supabase SQL Editor:\n');
    console.log(fs.readFileSync(migrationPath, 'utf8'));
    process.exit(0);
  }

  let pg;
  try {
    pg = require('pg');
  } catch {
    console.error('Install pg: npm install pg');
    console.log('\nOr run the SQL manually in Supabase SQL Editor:\n');
    console.log(fs.readFileSync(migrationPath, 'utf8'));
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('Migration 008 applied successfully.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  console.log('\nRun manually in Supabase SQL Editor:\n');
  console.log(fs.readFileSync(migrationPath, 'utf8'));
  process.exit(1);
});
