import React, { useState, useEffect, useCallback } from 'react';
import { FaTicketAlt, FaEnvelope, FaCopy, FaCheck, FaArrowLeft, FaSync } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import './AdminCoupons.css';

const getBackendUrl = () => {
  const configured = (process.env.REACT_APP_BACKEND_API_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
};

async function adminFetch(path, options = {}) {
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    throw new Error('Backend URL is not configured. Set REACT_APP_BACKEND_API_URL in .env');
  }
  let res;
  try {
    res = await fetch(`${backendUrl}${path}`, options);
  } catch (_) {
    throw new Error(
      `Cannot reach the backend at ${backendUrl}. Make sure it is running (node backend-example.js).`
    );
  }
  const contentType = res.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Backend returned an unexpected response (${res.status}). Restart the backend after pulling latest changes.`
    );
  }
  return res;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not signed in');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

function AdminCoupons({ onBack }) {
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [count, setCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generated, setGenerated] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [copiedCode, setCopiedCode] = useState('');

  const loadCoupons = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const headers = await getAuthHeaders();
      const res = await adminFetch('/api/admin-coupons', { headers });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load coupons');
      }
      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err.message || 'Failed to load coupons');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGenerated([]);

    if (sendEmail && !email.trim()) {
      setError('Enter a recipient email, or uncheck “Send email”.');
      return;
    }
    if (sendEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await adminFetch('/api/admin-coupons', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
          sendEmail,
          count: Number(count) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate coupon');
      }

      setGenerated(data.coupons || []);
      if (data.emailError) {
        setSuccess(`Coupon created, but email failed: ${data.emailError}`);
      } else if (data.emailSent) {
        setSuccess(`Coupon generated and emailed to ${email.trim()}`);
      } else if (data.emailSkipped) {
        setSuccess('Coupon generated (email skipped — Resend not configured)');
      } else {
        setSuccess('Coupon generated');
      }
      await loadCoupons();
    } catch (err) {
      setError(err.message || 'Failed to generate coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (_) {
      setError('Could not copy to clipboard');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="admin-coupons-page">
      <div className="admin-coupons-header">
        {onBack && (
          <button type="button" className="admin-coupons-back" onClick={onBack}>
            <FaArrowLeft /> Back
          </button>
        )}
        <h1><FaTicketAlt /> Lifetime Coupons</h1>
        <p>Generate UUID coupon codes and email them for free-for-life Pro signup.</p>
      </div>

      <div className="admin-coupons-layout">
        <form className="admin-coupons-form" onSubmit={handleGenerate}>
          <h2>Generate &amp; send</h2>

          {error && <div className="admin-coupons-error">{error}</div>}
          {success && <div className="admin-coupons-success">{success}</div>}

          <label htmlFor="couponRecipient">
            <FaEnvelope className="admin-coupons-icon" />
            Recipient email
          </label>
          <input
            id="couponRecipient"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            maxLength={254}
            disabled={isSubmitting}
          />

          <label htmlFor="couponNotes">Notes (optional)</label>
          <input
            id="couponNotes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Launch invite, partner promo…"
            maxLength={200}
            disabled={isSubmitting}
          />

          <label htmlFor="couponCount">Number of codes</label>
          <input
            id="couponCount"
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            disabled={isSubmitting}
          />

          <label className="admin-coupons-checkbox">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              disabled={isSubmitting}
            />
            Send coupon by email
          </label>

          <button type="submit" className="admin-coupons-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Working…' : sendEmail ? 'Generate & email' : 'Generate only'}
          </button>

          {generated.length > 0 && (
            <div className="admin-coupons-generated">
              <h3>Just created</h3>
              <ul>
                {generated.map((c) => (
                  <li key={c.id || c.code}>
                    <code>{c.code}</code>
                    <button type="button" onClick={() => copyCode(c.code)} title="Copy">
                      {copiedCode === c.code ? <FaCheck /> : <FaCopy />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <div className="admin-coupons-list">
          <div className="admin-coupons-list-header">
            <h2>Recent codes</h2>
            <button type="button" className="admin-coupons-refresh" onClick={loadCoupons} disabled={isLoadingList}>
              <FaSync className={isLoadingList ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {isLoadingList && coupons.length === 0 ? (
            <p className="admin-coupons-empty">Loading…</p>
          ) : coupons.length === 0 ? (
            <p className="admin-coupons-empty">No coupons yet. Generate one to get started.</p>
          ) : (
            <div className="admin-coupons-table-wrap">
              <table className="admin-coupons-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Used by</th>
                    <th>Used at</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const used = c.times_used >= c.max_uses || Boolean(c.redeemed_at);
                    return (
                      <tr key={c.id}>
                        <td><code>{c.code}</code></td>
                        <td>
                          <span className={`admin-coupons-badge ${used ? 'used' : c.is_active ? 'active' : 'inactive'}`}>
                            {used ? 'Used' : c.is_active ? 'Available' : 'Inactive'}
                          </span>
                        </td>
                        <td>{formatDate(c.created_at)}</td>
                        <td className="admin-coupons-user">
                          {c.redeemed_by_email || (c.redeemed_by_user_id ? `User ${c.redeemed_by_user_id.slice(0, 8)}…` : '—')}
                        </td>
                        <td>{used ? formatDate(c.redeemed_at) : '—'}</td>
                        <td className="admin-coupons-notes">{c.notes || '—'}</td>
                        <td>
                          <button type="button" className="admin-coupons-copy" onClick={() => copyCode(c.code)}>
                            {copiedCode === c.code ? <FaCheck /> : <FaCopy />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminCoupons;
