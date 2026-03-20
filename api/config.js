const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({ path: path.join(projectRoot, '.env.local') });
require('dotenv').config({ path: path.join(projectRoot, 'build', '.env.local') });

function env(key, defaultValue = null) {
  const raw = process.env[key];
  if (raw == null || raw === '') return defaultValue;
  return String(raw).trim().replace(/\r?\n/g, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const applicationId = env('SQUARE_APPLICATION_ID');
  const locationId = env('SQUARE_LOCATION_ID');
  const sandbox = env('SQUARE_ENVIRONMENT') !== 'production';

  if (!applicationId || !locationId) {
    return res.status(500).json({
      error: 'Square not configured. Set SQUARE_APPLICATION_ID and SQUARE_LOCATION_ID',
    });
  }

  return res.status(200).json({ applicationId, locationId, sandbox });
};
