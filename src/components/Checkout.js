import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { checkCouponCode, redeemCouponCode, isValidCouponFormat } from '../utils/coupon';
import { clearSubscriptionStatusCache } from '../utils/subscription';
import { FaCreditCard, FaTicketAlt } from 'react-icons/fa';
import './Checkout.css';

const SQUARE_SDK_SANDBOX = 'https://sandbox.web.squarecdn.com/v1/square.js';
const SQUARE_SDK_PRODUCTION = 'https://web.squarecdn.com/v1/square.js';

const PRO_SUBSCRIPTION_ID = 'pro-subscription';

const getBackendUrl = () => {
  const configured = (process.env.REACT_APP_BACKEND_API_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
};

function Checkout({ onSuccess, onBack, currentUser, onSubscriptionPaid, onCouponApplied }) {
  const { items, totalCents, clearCart } = useCart();
  const [paymentMode, setPaymentMode] = useState('card');
  const [couponCode, setCouponCode] = useState('');
  const [config, setConfig] = useState(null);
  const [squareCard, setSquareCard] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [subscriptionActivated, setSubscriptionActivated] = useState(false);
  const attachedRef = useRef(false);
  const [billing, setBilling] = useState({
    givenName: '',
    familyName: '',
    email: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
  });

  // Fetch backend config (applicationId, locationId, sandbox) — card payments only
  useEffect(() => {
    if (paymentMode !== 'card') {
      setIsInitializing(false);
      return;
    }
    const backendUrl = getBackendUrl();
    if (!backendUrl || totalCents < 1) {
      if (totalCents < 1) setError('Cart is empty.');
      if (!backendUrl) setError('Payment backend URL is not configured.');
      setIsInitializing(false);
      return;
    }
    fetch(`${backendUrl}/api/config`)
      .then(async (r) => {
        const contentType = r.headers.get('Content-Type') || '';
        if (!r.ok || !contentType.includes('application/json')) {
          const text = await r.text();
          if (text.trim().startsWith('<')) {
            throw new Error(
              `Backend response was HTML, not JSON. This usually means your production \`REACT_APP_BACKEND_API_URL\` points to the frontend host (SPA), not the Node backend.\n\n` +
                `Checked URL: ${backendUrl}/api/config\n` +
                `HTTP status: ${r.status} ${r.statusText}\n\n` +
                `Make sure the backend is deployed/running and that REACT_APP_BACKEND_API_URL points to it.`
            );
          }
          throw new Error(r.statusText || `Server error ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setConfig(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load payment config.');
        setIsInitializing(false);
      });
  }, [totalCents, paymentMode]);

  // Load Square SDK from sandbox or production URL, then attach card after 350ms
  useEffect(() => {
    if (paymentMode !== 'card' || !config || totalCents < 1) return;

    const scriptUrl = config.sandbox ? SQUARE_SDK_SANDBOX : SQUARE_SDK_PRODUCTION;

    function attachCard() {
      const container = document.getElementById('card-container');
      if (!container || !window.Square || !window.Square.payments || attachedRef.current) return;
      attachedRef.current = true;
      container.innerHTML = '';
      const payments = window.Square.payments(config.applicationId, config.locationId);
      let cardInstance;
      payments
        .card()
        .then((card) => {
          cardInstance = card;
          return card.attach('#card-container');
        })
        .then(() => {
          if (cardInstance && typeof cardInstance.recalculateSize === 'function') {
            cardInstance.recalculateSize();
          }
          setSquareCard(cardInstance);
          setError(null);
        })
        .catch((err) => {
          console.error('Square card init:', err);
          setError(err.message || 'Payment form failed to load.');
          attachedRef.current = false;
        })
        .finally(() => setIsInitializing(false));
    }

    if (window.Square && window.Square.payments) {
      setIsInitializing(true);
      const t = setTimeout(attachCard, 350);
      return () => {
        clearTimeout(t);
        attachedRef.current = false;
        const el = document.getElementById('card-container');
        if (el) el.innerHTML = '';
        setSquareCard(null);
      };
    }

    const existing = document.querySelector('script[src*="squarecdn.com"]');
    if (existing) {
      const t = setTimeout(attachCard, 350);
      return () => {
        clearTimeout(t);
        attachedRef.current = false;
        const el = document.getElementById('card-container');
        if (el) el.innerHTML = '';
        setSquareCard(null);
      };
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => setTimeout(attachCard, 350);
    script.onerror = () => {
      setError('Failed to load payment system.');
      setIsInitializing(false);
    };
    document.body.appendChild(script);
    return () => {
      attachedRef.current = false;
      const el = document.getElementById('card-container');
      if (el) el.innerHTML = '';
      setSquareCard(null);
    };
  }, [config, totalCents, paymentMode]);

  const handleApplyCoupon = async () => {
    setError(null);
    const trimmed = couponCode.trim();
    if (!trimmed) {
      setError('Please enter a coupon code');
      return;
    }
    if (!isValidCouponFormat(trimmed)) {
      setError('Coupon code must be a valid UUID');
      return;
    }
    if (!currentUser?.id) {
      setError('You must be signed in to use a coupon code');
      return;
    }

    setIsProcessing(true);
    try {
      const check = await checkCouponCode(trimmed);
      if (!check.valid) {
        setError(check.error || 'Invalid coupon code');
        setIsProcessing(false);
        return;
      }

      const result = await redeemCouponCode(currentUser.id, trimmed);
      if (!result.success) {
        setError(result.error || 'Failed to apply coupon');
        setIsProcessing(false);
        return;
      }

      clearSubscriptionStatusCache(currentUser.id);
      if (onCouponApplied) {
        await onCouponApplied(currentUser.id);
      }

      if (currentUser.email) {
        try {
          const { sendSubscriptionActivated } = await import('../utils/notificationEmail');
          sendSubscriptionActivated(currentUser.email, {
            billingCycle: 'lifetime',
            nextBillingDate: null,
          });
        } catch (e) {
          console.warn('Subscription activated email send failed:', e);
        }
      }

      clearCart();
      setSubscriptionActivated(true);
      setSuccess(true);
      if (onSuccess) setTimeout(onSuccess, 1500);
    } catch (err) {
      console.error('Coupon checkout error:', err);
      setError(err.message || 'Failed to apply coupon');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!squareCard || totalCents < 1) return;
    setError(null);
    setIsProcessing(true);
    try {
      const amountDollars = (totalCents / 100).toFixed(2);
      const verificationDetails = {
        amount: amountDollars,
        currencyCode: 'USD',
        intent: 'CHARGE',
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: {
          givenName: billing.givenName || 'Guest',
          familyName: billing.familyName || 'User',
          email: billing.email || undefined,
          addressLines: billing.addressLine ? [billing.addressLine] : undefined,
          city: billing.city || undefined,
          state: billing.state || undefined,
          postalCode: billing.postalCode || undefined,
          countryCode: 'US',
        },
      };

      const tokenResult = await squareCard.tokenize(verificationDetails);
      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        setError(tokenResult.errors?.[0]?.detail || 'Card tokenization failed.');
        setIsProcessing(false);
        return;
      }

    const backendUrl = getBackendUrl();
      if (!backendUrl) {
        setError('Payment backend not configured (REACT_APP_BACKEND_API_URL).');
        setIsProcessing(false);
        return;
      }

      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(`${backendUrl}/api/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          amount: String(totalCents),
          idempotencyKey,
        }),
      });

      const contentType = res.headers.get('Content-Type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (text.trim().startsWith('<')) {
          setError('Payment server returned a page instead of JSON. Is the backend running? (node backend-example.js)');
        } else {
          setError(text || `Payment failed (${res.status}).`);
        }
        setIsProcessing(false);
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.error || 'Payment failed.');
        setIsProcessing(false);
        return;
      }

      const subscriptionItem = items.find((i) => i.id === PRO_SUBSCRIPTION_ID);
      const hadSubscription = !!subscriptionItem;
      if (hadSubscription && currentUser?.id && onSubscriptionPaid) {
        try {
          await onSubscriptionPaid(currentUser.id, {
            paymentId: data.paymentId,
            amount: data.amount != null ? data.amount : totalCents,
            currency: data.currency || 'USD',
            interval: subscriptionItem?.interval || 'monthly',
          });
          setSubscriptionActivated(true);
        } catch (err) {
          console.error('Error recording subscription after payment:', err);
        }
      }

      if (currentUser?.email) {
        try {
          const { sendPaymentReceipt } = await import('../utils/notificationEmail');
          sendPaymentReceipt(currentUser.email, {
            amountCents: data.amount != null ? data.amount : totalCents,
            date: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Payment receipt email send failed:', e);
        }
      }

      clearCart();
      setSuccess(true);
      if (onSuccess) setTimeout(onSuccess, 1500);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Payment failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 && !success) {
    return (
      <div className="checkout-page">
        <p>Your cart is empty.</p>
        {onBack && (
          <button type="button" onClick={onBack} className="checkout-back-btn">
            ← Back to cart
          </button>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className="checkout-page checkout-success">
        <h2>{subscriptionActivated ? 'Subscription activated' : 'Payment successful'}</h2>
        {subscriptionActivated ? (
          <p>Your Pro access is now active. You have access to all features.</p>
        ) : (
          <p>Thank you for your order.</p>
        )}
        {onBack && (
          <button type="button" onClick={onBack} className="checkout-back-btn">
            Continue
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <h1 className="checkout-title">Checkout</h1>
        {onBack && (
          <button type="button" onClick={onBack} className="checkout-back-btn">
            ← Back
          </button>
        )}
      </div>
      <div className="checkout-summary">
        <p className="checkout-total">
          Total: <strong>${(totalCents / 100).toFixed(2)}</strong>
        </p>
      </div>

      <div className="checkout-payment-tabs">
        <button
          type="button"
          className={`checkout-tab ${paymentMode === 'card' ? 'checkout-tab--active' : ''}`}
          onClick={() => { setPaymentMode('card'); setError(null); }}
        >
          <FaCreditCard /> Pay with card
        </button>
        <button
          type="button"
          className={`checkout-tab ${paymentMode === 'coupon' ? 'checkout-tab--active' : ''}`}
          onClick={() => { setPaymentMode('coupon'); setError(null); }}
        >
          <FaTicketAlt /> Use coupon code
        </button>
      </div>

      {paymentMode === 'coupon' ? (
        <div className="checkout-form">
          <p className="checkout-form-label">Lifetime coupon code</p>
          <p className="checkout-coupon-hint">
            Enter a UUID coupon for free lifetime Pro access — no payment required.
          </p>
          <input
            type="text"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value);
              if (error) setError(null);
            }}
            className="checkout-input checkout-coupon-input"
            maxLength={36}
            spellCheck={false}
            autoComplete="off"
          />
          {error && <p className="checkout-error">{error}</p>}
          <button
            type="button"
            onClick={handleApplyCoupon}
            disabled={isProcessing || !couponCode.trim()}
            className="checkout-pay-btn checkout-coupon-btn"
          >
            {isProcessing ? 'Applying…' : 'Apply coupon'}
          </button>
        </div>
      ) : (
      <div className="checkout-form">
        <p className="checkout-form-label">Billing (optional)</p>
        <div className="checkout-billing">
          <input
            type="text"
            placeholder="First name"
            value={billing.givenName}
            onChange={(e) => setBilling((b) => ({ ...b, givenName: e.target.value }))}
            className="checkout-input"
          />
          <input
            type="text"
            placeholder="Last name"
            value={billing.familyName}
            onChange={(e) => setBilling((b) => ({ ...b, familyName: e.target.value }))}
            className="checkout-input"
          />
          <input
            type="email"
            placeholder="Email"
            value={billing.email}
            onChange={(e) => setBilling((b) => ({ ...b, email: e.target.value }))}
            className="checkout-input"
          />
          <input
            type="text"
            placeholder="Address"
            value={billing.addressLine}
            onChange={(e) => setBilling((b) => ({ ...b, addressLine: e.target.value }))}
            className="checkout-input"
          />
          <div className="checkout-row">
            <input
              type="text"
              placeholder="City"
              value={billing.city}
              onChange={(e) => setBilling((b) => ({ ...b, city: e.target.value }))}
              className="checkout-input"
            />
            <input
              type="text"
              placeholder="State"
              value={billing.state}
              onChange={(e) => setBilling((b) => ({ ...b, state: e.target.value }))}
              className="checkout-input"
            />
            <input
              type="text"
              placeholder="ZIP"
              value={billing.postalCode}
              onChange={(e) => setBilling((b) => ({ ...b, postalCode: e.target.value }))}
              className="checkout-input"
            />
          </div>
        </div>
        <p className="checkout-form-label">Card details</p>
        {isInitializing && <p className="checkout-loading">Loading payment form...</p>}
        <div id="card-container" className="checkout-card-container" />
        {error && <p className="checkout-error">{error}</p>}
        <button
          type="button"
          onClick={handlePay}
          disabled={isInitializing || isProcessing || !squareCard}
          className="checkout-pay-btn"
        >
          {isProcessing ? 'Processing…' : `Pay $${(totalCents / 100).toFixed(2)}`}
        </button>
      </div>
      )}
    </div>
  );
}

export default Checkout;
