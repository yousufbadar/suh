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

function getContactRecipient() {
  const direct = env('CONTACT_EMAIL');
  if (direct) return direct;
  const adminList = env('ADMIN_EMAILS') || env('REACT_APP_ADMIN_EMAILS') || 'admin@admin.com';
  return adminList.split(',')[0].trim();
}

function sanitizeText(value, maxLen) {
  return String(value || '').trim().slice(0, maxLen);
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
  const name = sanitizeText(body.name, 120);
  const email = sanitizeText(body.email, 254);
  const subject = sanitizeText(body.subject, 200);
  const message = sanitizeText(body.message, 5000);

  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Valid email is required' });
  }
  if (!subject) return res.status(400).json({ success: false, error: 'Subject is required' });
  if (!message || message.length < 10) {
    return res.status(400).json({ success: false, error: 'Message must be at least 10 characters' });
  }

  const to = getContactRecipient();
  const { subject: emailSubject, html } = buildNotificationEmail('contact_form', { name, email, subject, message });
  const emailFrom = env('EMAIL_FROM') || 'Share Your Heart Today <onboarding@resend.dev>';
  const client = getResend();

  if (!client) {
    return res.status(200).json({ success: true, skipped: true, message: 'Message received (email not configured)' });
  }

  try {
    const result = await client.emails.send({
      from: emailFrom,
      to: [to],
      replyTo: email,
      subject: emailSubject,
      html,
    });
    if (result.error) {
      return res.status(500).json({ success: false, error: result.error.message || 'Failed to send message' });
    }
    return res.status(200).json({ success: true, id: result.data?.id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to send message' });
  }
};
