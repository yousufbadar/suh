import React, { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'suh_cart';

const SUBSCRIPTION_ID = 'pro-subscription';
const PRICE_MONTHLY_CENTS = 999;   // $9.99/month
const PRICE_YEARLY_CENTS = 10000;  // $100/year (save $20 vs 12 × $9.99)

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Normalize: ensure subscription has interval, no quantity (legacy)
      return parsed.map((i) => {
        const item = { ...i };
        if (item.id === SUBSCRIPTION_ID) {
          item.interval = item.interval === 'yearly' ? 'yearly' : 'monthly';
          item.priceCents = item.interval === 'yearly' ? PRICE_YEARLY_CENTS : PRICE_MONTHLY_CENTS;
        }
        if (item.quantity != null) delete item.quantity;
        return item;
      });
    }
  } catch (e) {
    console.warn('Cart load failed:', e);
  }
  return [];
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Cart save failed:', e);
  }
}

function cartReducer(state, action) {
  let next;
  switch (action.type) {
    case 'ADD': {
      const { id, name, priceCents, interval } = action.payload;
      if (id === SUBSCRIPTION_ID) {
        // Only one subscription in cart; replace existing
        next = state.filter((i) => i.id !== SUBSCRIPTION_ID);
        next = [...next, {
          id: SUBSCRIPTION_ID,
          name: name || 'Pro Subscription',
          priceCents: Number(priceCents) || (interval === 'yearly' ? PRICE_YEARLY_CENTS : PRICE_MONTHLY_CENTS),
          interval: interval === 'yearly' ? 'yearly' : 'monthly',
        }];
      } else {
        const existing = state.find((i) => i.id === id);
        if (existing) next = state;
        else next = [...state, { id, name, priceCents: Number(priceCents) }];
      }
      break;
    }
    case 'REMOVE':
      next = state.filter((i) => i.id !== action.payload.id);
      break;
    case 'UPDATE_SUBSCRIPTION_INTERVAL': {
      const { interval } = action.payload;
      next = state.map((i) => {
        if (i.id !== SUBSCRIPTION_ID) return i;
        return {
          ...i,
          interval: interval === 'yearly' ? 'yearly' : 'monthly',
          priceCents: interval === 'yearly' ? PRICE_YEARLY_CENTS : PRICE_MONTHLY_CENTS,
        };
      });
      break;
    }
    case 'CLEAR':
      next = [];
      break;
    case 'SET':
      next = Array.isArray(action.payload) ? action.payload : [];
      break;
    default:
      return state;
  }
  saveCart(next);
  return next;
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, loadCart());

  const addToCart = useCallback(({ id, name, priceCents, interval = 'monthly' }) => {
    dispatch({ type: 'ADD', payload: { id, name, priceCents, interval } });
  }, []);

  const removeFromCart = useCallback((id) => {
    dispatch({ type: 'REMOVE', payload: { id } });
  }, []);

  const updateSubscriptionInterval = useCallback((interval) => {
    dispatch({ type: 'UPDATE_SUBSCRIPTION_INTERVAL', payload: { interval } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const totalCents = items.reduce((sum, i) => sum + (i.priceCents || 0), 0);
  const count = items.length;

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateSubscriptionInterval,
    clearCart,
    totalCents,
    count,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

/** Predefined products. Subscription is single purchase: monthly or yearly. */
export const PRODUCTS = {
  PRO_SUBSCRIPTION: {
    id: 'pro-subscription',
    name: 'Pro Subscription',
    priceCents: 999,
    interval: 'monthly',
    description: 'Monthly Pro plan access',
  },
  PRO_SUBSCRIPTION_MONTHLY: {
    id: 'pro-subscription',
    name: 'Pro Subscription',
    priceCents: 999,
    interval: 'monthly',
    description: '$9.99/month',
  },
  PRO_SUBSCRIPTION_YEARLY: {
    id: 'pro-subscription',
    name: 'Pro Subscription',
    priceCents: 10000,
    interval: 'yearly',
    description: '$100/year (Save $20)',
  },
};
