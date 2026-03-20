/**
 * Weekly dashboard summary & trial-ending reminder emails.
 * Run via cron (e.g. weekly for summaries, daily for trial reminders).
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKEND_API_URL (or REACT_APP_BACKEND_API_URL)
 * Optional: RESEND_API_KEY and EMAIL_FROM set in backend .env for sending.
 *
 * Usage:
 *   node scripts/weekly-email-summary.js              # weekly summary + trial reminders
 *   node scripts/weekly-email-summary.js --summary     # weekly summary only
 *   node scripts/weekly-email-summary.js --trial      # trial-ending reminders only
 */

const path = require('path');
const projectRoot = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({ path: path.join(projectRoot, '.env.local') });

function env(key, def = '') {
  const v = process.env[key];
  return (v != null && String(v).trim() !== '') ? String(v).trim() : def;
}

const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL') || env('REACT_APP_SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const backendUrl = env('BACKEND_API_URL') || env('REACT_APP_BACKEND_API_URL');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!backendUrl) {
  console.error('Missing BACKEND_API_URL or REACT_APP_BACKEND_API_URL');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function listAllUserEmails() {
  const emailsById = new Map();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('listUsers error:', error.message);
      break;
    }
    for (const u of users || []) {
      if (u.email) emailsById.set(u.id, u.email);
    }
    if (!users || users.length < perPage) break;
    page++;
  }
  return emailsById;
}

async function sendNotification(to, type, data) {
  const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/send-notification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, type, data }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`send-notification ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function runWeeklySummary(emailsById) {
  if (process.argv.includes('--trial')) return;

  const { data: rows, error } = await supabase
    .from('profiles')
    .select('user_id')
    .not('user_id', 'is', null);
  if (error) {
    console.error('profiles query error:', error.message);
    return;
  }
  const countByUser = new Map();
  for (const r of rows || []) {
    const uid = r.user_id;
    if (uid) countByUser.set(uid, (countByUser.get(uid) || 0) + 1);
  }

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const periodLabel = `week of ${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  let sent = 0;
  for (const [userId, profileCount] of countByUser) {
    const email = emailsById.get(userId);
    if (!email || profileCount < 1) continue;
    try {
      await sendNotification(email, 'weekly_dashboard_summary', {
        profileCount,
        totalClicks: 0,
        periodLabel,
        dashboardUrl: env('APP_URL') || backendUrl.replace(/:\d+$/, ''),
      });
      sent++;
    } catch (e) {
      console.warn('Weekly summary send failed for', email, e.message);
    }
  }
  console.log('Weekly summary emails sent:', sent);
}

async function runTrialReminders(emailsById) {
  if (process.argv.includes('--summary')) return;

  const now = new Date();
  const inThreeDays = new Date(now);
  inThreeDays.setDate(inThreeDays.getDate() + 3);

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('user_id, subscription_end_date, trial_start_date')
    .not('trial_start_date', 'is', null)
    .not('subscription_end_date', 'is', null)
    .gte('subscription_end_date', now.toISOString())
    .lte('subscription_end_date', inThreeDays.toISOString());

  if (error) {
    console.error('subscriptions query error:', error.message);
    return;
  }

  let sent = 0;
  for (const s of subs || []) {
    const email = emailsById.get(s.user_id);
    if (!email) continue;
    const end = s.subscription_end_date ? new Date(s.subscription_end_date) : null;
    const daysLeft = end ? Math.max(1, Math.ceil((end - now) / (24 * 60 * 60 * 1000))) : 3;
    try {
      await sendNotification(email, 'trial_ending_reminder', {
        daysLeft,
        subscriptionUrl: env('APP_URL') || backendUrl.replace(/:\d+$/, ''),
      });
      sent++;
    } catch (e) {
      console.warn('Trial reminder send failed for', email, e.message);
    }
  }
  console.log('Trial ending reminder emails sent:', sent);
}

async function main() {
  const emailsById = await listAllUserEmails();
  console.log('Loaded', emailsById.size, 'user emails');

  if (!process.argv.includes('--trial')) await runWeeklySummary(emailsById);
  if (!process.argv.includes('--summary')) await runTrialReminders(emailsById);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
