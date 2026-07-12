/**
 * Generate a UUID lifetime coupon code for free-for-life signup.
 *
 * Usage:
 *   node scripts/generate-coupon.js
 *   node scripts/generate-coupon.js --count 5
 *   node scripts/generate-coupon.js --notes "Launch promo"
 *
 * Requires in .env:
 *   REACT_APP_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing REACT_APP_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 1;
  let notes = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = Math.max(1, parseInt(args[++i], 10) || 1);
    } else if (args[i] === '--notes' && args[i + 1]) {
      notes = args[++i];
    }
  }
  return { count, notes };
}

async function main() {
  const { count, notes } = parseArgs();
  const rows = Array.from({ length: count }, () => ({
    code: crypto.randomUUID(),
    coupon_type: 'lifetime',
    max_uses: 1,
    notes: notes || 'Generated lifetime coupon',
  }));

  const { data, error } = await supabase
    .from('coupon_codes')
    .insert(rows)
    .select('code, coupon_type, max_uses, created_at');

  if (error) {
    console.error('Failed to create coupon(s):', error.message);
    if (error.message?.includes('coupon_codes')) {
      console.error('\nRun supabase/migrations/007_coupon_codes.sql in the Supabase SQL Editor first.');
    }
    process.exit(1);
  }

  console.log(`Created ${data.length} lifetime coupon code(s):\n`);
  data.forEach((row, i) => {
    console.log(`${i + 1}. ${row.code}`);
  });
  console.log('\nShare a code with a user — they enter it when creating an account.');
}

main();
