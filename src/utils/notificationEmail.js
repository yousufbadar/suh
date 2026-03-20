/**
 * Send customer notification emails via backend.
 * Fire-and-forget; failures are logged but do not block the UI.
 */

const getBackendUrl = () => {
  const configured = (process.env.REACT_APP_BACKEND_API_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
};

export async function sendNotification(to, type, data = {}) {
  const url = getBackendUrl();
  if (!url) {
    if (process.env.NODE_ENV === 'development') console.warn('[notificationEmail] REACT_APP_BACKEND_API_URL not set');
    return;
  }
  try {
    const res = await fetch(`${url}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, type, data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[notificationEmail] send failed:', type, err?.error || res.status);
    }
  } catch (err) {
    console.warn('[notificationEmail] request failed:', type, err?.message);
  }
}

/** Base URL for links in emails (dashboard, subscription page) */
function getBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return (process.env.REACT_APP_APP_URL || '').trim() || 'https://shareyourhearttoday.com';
}

export function sendPaymentReceipt(email, { amountCents, date }) {
  sendNotification(email, 'payment_receipt', {
    amountCents,
    date: date || new Date().toISOString(),
    dashboardUrl: `${getBaseUrl()}/`,
  });
}

export function sendSubscriptionActivated(email, { billingCycle, nextBillingDate }) {
  sendNotification(email, 'subscription_activated', {
    billingCycle: billingCycle || 'monthly',
    nextBillingDate: nextBillingDate || null,
    dashboardUrl: `${getBaseUrl()}/`,
  });
}

export function sendTrialStarted(email) {
  sendNotification(email, 'trial_started', {
    trialDays: 30,
    dashboardUrl: `${getBaseUrl()}/`,
  });
}

export function sendSubscriptionCancelled(email, { accessUntil }) {
  sendNotification(email, 'subscription_cancelled', {
    accessUntil: accessUntil || null,
  });
}

export function sendTrialEndingReminder(email, { daysLeft }) {
  sendNotification(email, 'trial_ending_reminder', {
    daysLeft: daysLeft ?? 3,
    subscriptionUrl: `${getBaseUrl()}/`,
  });
}

export function sendWeeklyDashboardSummary(email, { profileCount, totalClicks, periodLabel }) {
  sendNotification(email, 'weekly_dashboard_summary', {
    profileCount: profileCount ?? 0,
    totalClicks: totalClicks ?? 0,
    periodLabel: periodLabel || 'this week',
    dashboardUrl: `${getBaseUrl()}/`,
  });
}
