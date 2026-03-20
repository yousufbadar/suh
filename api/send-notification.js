const path = require('path');
const { buildNotificationEmail } = require('../email-templates.js');

const projectRoot = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({ path: path.join(projectRoot, '.env.local') });
require('dotenv').config({ path: path.join(projectRoot, 'build', '.env.local') });

function env(key, defaultValue = null) {
  const raw = process.env[key];
  if (raw == null || raw === '') return defaultValue;
  return String(raw).trim().replace(/\r?\n/g, '');
}

let resend = null;
function getResend() {
  if (resend) return resend;
  const key = env('RESEND_API_KEY');
  if (!key) return null;
  const { Resend } = require('resend');
  resend = new Resend(key);
  return resend;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const to = body.to;
  const type = body.type;
  const data = body.data || {};
  if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ success: false, error: 'Valid "to" email is required' });
  }

  const allowedTypes = ['payment_receipt', 'subscription_activated', 'trial_started', 'subscription_cancelled', 'trial_ending_reminder', 'weekly_dashboard_summary'];
  const notificationType = allowedTypes.includes(type) ? type : 'weekly_dashboard_summary';
  const { subject, html } = buildNotificationEmail(notificationType, data);
  const emailFrom = env('EMAIL_FROM') || 'Share Your Heart Today <onboarding@resend.dev>';
  const client = getResend();

  if (!client) {
    return res.status(200).json({ success: true, skipped: true, message: 'Email not sent (Resend not configured)' });
  }

  try {
    const result = await client.emails.send({
      from: emailFrom,
      to: [to],
      subject,
      html,
    });
    if (result.error) {
      return res.status(500).json({ success: false, error: result.error.message || 'Failed to send email' });
    }
    return res.status(200).json({ success: true, id: result.data?.id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to send email' });
  }
};
