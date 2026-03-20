/**
 * Build subject and HTML for notification emails.
 * Types: payment_receipt, subscription_activated, trial_started, subscription_cancelled, trial_ending_reminder, weekly_dashboard_summary
 */
function buildNotificationEmail(type, data = {}) {
  const siteName = data.siteName || 'Share Your Heart Today';
  const baseHtml = (body) =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;line-height:1.5;color:#333;max-width:560px;margin:0 auto;padding:20px;} a{color:#059669;} .btn{display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;margin-top:12px;} .footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;}</style></head><body>${body}<div class="footer">You received this because you have an account at ${siteName}.</div></body></html>`;

  switch (type) {
    case 'payment_receipt': {
      const amount = data.amountCents != null ? `$${(Number(data.amountCents) / 100).toFixed(2)}` : data.amountFormatted || '—';
      const date = data.date ? new Date(data.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
      return {
        subject: `Payment receipt – ${siteName}`,
        html: baseHtml(`<h2>Payment received</h2><p>We've received your payment.</p><p><strong>Amount:</strong> ${amount}<br><strong>Date:</strong> ${date}</p><p>Thank you for your subscription.</p>`),
      };
    }
    case 'subscription_activated': {
      const plan = data.billingCycle === 'yearly' ? 'Pro (yearly)' : 'Pro (monthly)';
      const nextBilling = data.nextBillingDate ? new Date(data.nextBillingDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : '';
      return {
        subject: `Your Pro subscription is active – ${siteName}`,
        html: baseHtml(`<h2>Subscription activated</h2><p>Your <strong>${plan}</strong> subscription is now active. You have access to all premium features.</p>${nextBilling ? `<p><strong>Next billing date:</strong> ${nextBilling}</p>` : ''}<p><a href="${data.dashboardUrl || '#'}" class="btn">Go to dashboard</a></p>`),
      };
    }
    case 'trial_started': {
      const days = data.trialDays != null ? data.trialDays : 30;
      return {
        subject: `Your free trial has started – ${siteName}`,
        html: baseHtml(`<h2>Welcome! Your free trial has started</h2><p>You have <strong>${days} days</strong> of free Pro access. No payment required during the trial.</p><p>Explore your dashboard and profiles. When your trial ends, you can subscribe to keep access.</p><p><a href="${data.dashboardUrl || '#'}" class="btn">Go to dashboard</a></p>`),
      };
    }
    case 'subscription_cancelled': {
      const endDate = data.accessUntil ? new Date(data.accessUntil).toLocaleDateString(undefined, { dateStyle: 'long' }) : '';
      return {
        subject: `Subscription cancelled – ${siteName}`,
        html: baseHtml(`<h2>Subscription cancelled</h2><p>Your subscription has been cancelled as requested.</p>${endDate ? `<p>You will have access until <strong>${endDate}</strong>.</p>` : ''}<p>You can resubscribe anytime from your account.</p>`),
      };
    }
    case 'trial_ending_reminder': {
      const daysLeft = data.daysLeft != null ? data.daysLeft : 3;
      return {
        subject: `Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} – ${siteName}`,
        html: baseHtml(`<h2>Trial ending soon</h2><p>Your free trial ends in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>. Subscribe to Pro to keep access.</p><p><a href="${data.subscriptionUrl || '#'}" class="btn">Subscribe now</a></p>`),
      };
    }
    case 'weekly_dashboard_summary': {
      const profileCount = data.profileCount != null ? data.profileCount : 0;
      const totalClicks = data.totalClicks != null ? data.totalClicks : 0;
      const period = data.periodLabel || 'this week';
      return {
        subject: `Your weekly summary – ${siteName}`,
        html: baseHtml(`<h2>Weekly dashboard summary</h2><p>Here's your activity summary for <strong>${period}</strong>.</p><ul><li><strong>Profiles:</strong> ${profileCount}</li><li><strong>Total link/clicks:</strong> ${totalClicks}</li></ul><p><a href="${data.dashboardUrl || '#'}" class="btn">View dashboard</a></p>`),
      };
    }
    default:
      return { subject: `Notification from ${siteName}`, html: baseHtml('<p>' + (data.message || 'You have a new notification.') + '</p>') };
  }
}

module.exports = { buildNotificationEmail };
