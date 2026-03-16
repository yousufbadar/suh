import React from 'react';
import { useCart } from '../context/CartContext';
import './Cart.css';

const SUBSCRIPTION_ID = 'pro-subscription';

function Cart({ onCheckout, onBack }) {
  const { items, removeFromCart, updateSubscriptionInterval, totalCents, count } = useCart();

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-header">
          <h1 className="cart-title">Cart</h1>
          {onBack && (
            <button type="button" onClick={onBack} className="cart-back-btn">
              ← Back
            </button>
          )}
        </div>
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <p className="cart-empty-hint">Add a subscription from the Subscription page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1 className="cart-title">Cart ({count} item{count !== 1 ? 's' : ''})</h1>
        {onBack && (
          <button type="button" onClick={onBack} className="cart-back-btn">
            ← Back
          </button>
        )}
      </div>
      <ul className="cart-list">
        {items.map((item) => (
          <li key={item.id} className="cart-item">
            <div className="cart-item-info">
              <span className="cart-item-name">{item.name}</span>
              {item.id === SUBSCRIPTION_ID ? (
                <div className="cart-subscription-options">
                  <button
                    type="button"
                    onClick={() => updateSubscriptionInterval('monthly')}
                    className={`cart-interval-btn ${item.interval === 'monthly' ? 'cart-interval-btn--active' : ''}`}
                  >
                    Monthly — $9.99/mo
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSubscriptionInterval('yearly')}
                    className={`cart-interval-btn ${item.interval === 'yearly' ? 'cart-interval-btn--active' : ''}`}
                  >
                    Yearly — $100/yr <span className="cart-save-badge">Save $20</span>
                  </button>
                </div>
              ) : null}
              <span className="cart-item-price">${(item.priceCents / 100).toFixed(2)}</span>
            </div>
            <div className="cart-item-actions">
              <button type="button" onClick={() => removeFromCart(item.id)} className="cart-remove-btn" title="Remove">
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="cart-footer">
        <div className="cart-total">
          Total: <strong>${(totalCents / 100).toFixed(2)}</strong>
        </div>
        <button type="button" onClick={onCheckout} className="cart-checkout-btn">
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}

export default Cart;
