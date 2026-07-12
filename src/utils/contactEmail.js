const getBackendUrl = () => {
  const configured = (process.env.REACT_APP_BACKEND_API_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
};

export async function submitContactForm({ name, email, subject, message }) {
  const url = getBackendUrl();
  if (!url) {
    throw new Error('Contact form is not configured. Please try again later.');
  }

  const res = await fetch(`${url}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, subject, message }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send message. Please try again.');
  }
  return data;
}
