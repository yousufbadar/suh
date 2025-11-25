import React, { useState, useEffect, useRef } from 'react';
import './Subscription.css';
import { FaCheck, FaCrown, FaRocket, FaStar, FaArrowLeft, FaLock } from 'react-icons/fa';

function Subscription({ onBack, currentUser, onLogout }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(30);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [squareCard, setSquareCard] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState('Initializing...');
  const cardContainerRef = useRef(null);
  const initializationTimeoutRef = useRef(null);
  const initializationCompleteRef = useRef(false);
  const squarePaymentsRef = useRef(null);

  // Load Square Web Payments SDK
  useEffect(() => {
    const applicationId = process.env.REACT_APP_SQUARE_APPLICATION_ID;
    const locationId = process.env.REACT_APP_SQUARE_LOCATION_ID;
    
    if (!applicationId) {
      setError('Square payment system is not configured. Please contact support or check your environment variables.');
      setInitStatus('❌ Square Application ID not configured');
      setIsInitializing(false);
      console.warn('⚠️  Square Application ID not configured. Set REACT_APP_SQUARE_APPLICATION_ID in .env file');
      console.warn('💡 Make sure to restart your development server after adding the variable to .env');
      return;
    }
    
    if (!locationId) {
      setError('Square Location ID is not configured. Please add REACT_APP_SQUARE_LOCATION_ID to your .env file.');
      setInitStatus('❌ Square Location ID not configured');
      setIsInitializing(false);
      console.warn('⚠️  Square Location ID not configured. Set REACT_APP_SQUARE_LOCATION_ID in .env file');
      console.warn('💡 Location ID can be found in Square Dashboard → Settings → Locations');
      return;
    }
    
    // Validate Location ID format (should start with 'L' and be alphanumeric)
    const locationIdPattern = /^L[A-Z0-9]+$/i;
    if (!locationIdPattern.test(locationId)) {
      setError(`Invalid Location ID format. Location ID should start with 'L' followed by alphanumeric characters. Current value: "${locationId}"`);
      setInitStatus('❌ Invalid Location ID format');
      setIsInitializing(false);
      console.error('❌ Invalid Location ID format:', locationId);
      console.warn('💡 Location ID should look like: LXXXXXXXXXXXXX');
      console.warn('💡 Find it in Square Dashboard → Settings → Locations');
      return;
    }
    
    setInitStatus('✅ Application ID and Location ID found');

    // Check if we're in a secure context (HTTPS or localhost)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn('⚠️  Square requires HTTPS in production');
    }

    const loadSquareSDK = () => {
      setInitStatus('Loading Square SDK script...');
      
      // Check if script is already loaded
      if (window.Square && window.Square.payments) {
        console.log('✅ Square SDK already loaded');
        setInitStatus('✅ SDK already loaded');
        initializeSquare();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="square"]');
      if (existingScript) {
        console.log('⏳ Square SDK script already in DOM, waiting for load...');
        setInitStatus('⏳ SDK script already loading...');
        existingScript.addEventListener('load', () => {
          setInitStatus('✅ SDK script loaded');
          setTimeout(initializeSquare, 200);
        });
        return;
      }

      // Load Square Web Payments SDK
      setInitStatus('📥 Loading Square SDK from CDN...');
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => {
        console.log('✅ Square SDK script loaded');
        setInitStatus('✅ SDK script loaded, initializing...');
        // Wait a bit for SDK to be fully ready
        setTimeout(initializeSquare, 200);
      };
      script.onerror = (err) => {
        console.error('❌ Failed to load Square SDK script:', err);
        setInitStatus('❌ Failed to load SDK script');
        setError('Failed to load Square payment system. Please check your internet connection and refresh the page.');
        setIsInitializing(false);
      };
      document.body.appendChild(script);
    };

    const initializeSquare = async () => {
      setIsInitializing(true);
      
      // Set a timeout for initialization (10 seconds)
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      initializationCompleteRef.current = false;
          initializationTimeoutRef.current = setTimeout(() => {
        if (!initializationCompleteRef.current) {
          console.error('❌ Square initialization timeout');
          setInitStatus('❌ Initialization timed out');
          setError('Payment system initialization timed out. Please refresh the page or check your Square configuration.');
          setIsInitializing(false);
        }
      }, 10000);

      try {
        // locationId is already validated above, but get it again for clarity
        const locationId = process.env.REACT_APP_SQUARE_LOCATION_ID;

        if (!locationId) {
          throw new Error('Location ID is required but not set');
        }

        if (!window.Square) {
          console.error('❌ Square SDK not available on window object');
          setInitStatus('❌ Square SDK not available');
          setError('Square payment SDK failed to load. Please refresh the page.');
          setIsInitializing(false);
          if (initializationTimeoutRef.current) {
            clearTimeout(initializationTimeoutRef.current);
          }
          return;
        }

        if (!window.Square.payments) {
          console.error('❌ Square.payments not available');
          setInitStatus('❌ Square.payments not available');
          setError('Square payment system is not ready. Please refresh the page.');
          setIsInitializing(false);
          if (initializationTimeoutRef.current) {
            clearTimeout(initializationTimeoutRef.current);
          }
          return;
        }
        
        setInitStatus('🔧 Creating payments instance...');

        // Wait for card container to be available
        let retries = 0;
        const maxRetries = 20; // Increased retries
        while (!cardContainerRef.current && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!cardContainerRef.current) {
          console.error('❌ Card container ref not ready after waiting');
          setInitStatus('❌ Card container not found');
          setError('Payment form container not found. Please refresh the page.');
          setIsInitializing(false);
          if (initializationTimeoutRef.current) {
            clearTimeout(initializationTimeoutRef.current);
          }
          return;
        }
        
        setInitStatus('✅ Card container ready');

        console.log('🔧 Initializing Square payments...', {
          applicationId: applicationId.substring(0, 10) + '...',
          locationId: locationId || 'default',
        });
        
        setInitStatus('🔧 Creating payments instance...');
        console.log('🔧 Using Location ID:', locationId);
        const payments = window.Square.payments(applicationId, {
          locationId: locationId, // Use the validated locationId
        });
        squarePaymentsRef.current = payments;

        setInitStatus('🔧 Creating card payment method...');
        console.log('🔧 Creating card payment method...');
        const card = await payments.card();
        
        setInitStatus('🔧 Attaching card to container...');
        console.log('🔧 Attaching card to container...');
        await card.attach(cardContainerRef.current);
        
        console.log('✅ Square card payment initialized successfully');
        setInitStatus('✅ Payment form ready!');
        setSquareCard(card);
        setError(null); // Clear any previous errors
        setIsInitializing(false);
        initializationCompleteRef.current = true;
        
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
        }
      } catch (err) {
        console.error('❌ Error initializing Square:', err);
        setInitStatus(`❌ Error: ${err.message || 'Unknown error'}`);
        console.error('Error details:', {
          message: err.message,
          name: err.name,
          applicationId: process.env.REACT_APP_SQUARE_APPLICATION_ID ? 'Set' : 'Not set',
          locationId: process.env.REACT_APP_SQUARE_LOCATION_ID ? 'Set' : 'Not set',
          hasContainer: !!cardContainerRef.current,
          hasSquare: !!window.Square,
          hasPayments: !!(window.Square && window.Square.payments),
        });
        
        let errorMessage = 'Failed to initialize payment system. ';
        if (err.message) {
          errorMessage += err.message;
        } else {
          errorMessage += 'Please check your Square configuration and refresh the page.';
        }
        setError(errorMessage);
        setIsInitializing(false);
        
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      loadSquareSDK();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, []);

  // Check subscription status and trial
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!currentUser) return;

      try {
        const { getSubscriptionStatus } = await import('../utils/subscription');
        const status = await getSubscriptionStatus(currentUser.id);
        setSubscriptionStatus(status);

        if (status.trialActive) {
          const trialStartDate = new Date(status.trialStartDate);
          const now = new Date();
          const daysElapsed = Math.floor((now - trialStartDate) / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, 30 - daysElapsed);
          setTrialDaysRemaining(daysRemaining);
        }
      } catch (err) {
        console.error('Error checking subscription status:', err);
      }
    };

    checkSubscriptionStatus();
  }, [currentUser]);

  const handleSubscribe = async () => {
    if (!currentUser) {
      setError('Please log in to subscribe');
      return;
    }

    if (!squareCard) {
      setError('Payment system not ready. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Check if trial is still active
      if (trialDaysRemaining > 0) {
        const confirmMessage = `You have ${trialDaysRemaining} days left in your trial. After the trial ends, you'll be charged $9.99 per month. Continue?`;
        if (!window.confirm(confirmMessage)) {
          setIsProcessing(false);
          return;
        }
      }

      // Tokenize card
      const tokenResult = await squareCard.tokenize();
      
      if (tokenResult.status === 'OK') {
        // Process payment on backend
        const { processSubscription } = await import('../utils/subscription');
        const result = await processSubscription(currentUser.id, tokenResult.token, trialDaysRemaining > 0);
        
        if (result.success) {
          alert('Subscription successful! Welcome to Pro!');
          // Refresh subscription status
          const { getSubscriptionStatus } = await import('../utils/subscription');
          const status = await getSubscriptionStatus(currentUser.id);
          setSubscriptionStatus(status);
        } else {
          setError(result.error || 'Failed to process subscription. Please try again.');
        }
      } else {
        setError('Card tokenization failed. Please check your card details.');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to process subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const plan = {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: 'month',
    originalPrice: '$19.99',
    features: [
      'Unlimited profiles',
      'Advanced analytics',
      'Custom branding',
      'Priority support',
      'API access',
      'Export data',
      'White-label option'
    ],
    popular: true
  };

  const isSubscribed = subscriptionStatus?.isActive || false;
  const isTrialActive = subscriptionStatus?.trialActive || false;

  return (
    <div className="subscription-page">
      <div className="subscription-header">
        {onBack && (
          <button onClick={onBack} className="back-button-subscription">
            <FaArrowLeft /> Back
          </button>
        )}
        <div className="subscription-title-section">
          <h1 className="subscription-title">Upgrade to Pro</h1>
          <p className="subscription-subtitle">
            {isSubscribed ? (
              <>You're subscribed to Pro! 🎉</>
            ) : isTrialActive && trialDaysRemaining > 0 ? (
              <>Start your <strong>30-day free trial</strong> today! {trialDaysRemaining} days remaining.</>
            ) : (
              <>Get unlimited access to all Pro features</>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="subscription-error">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <span>{error}</span>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                padding: '8px 16px', 
                background: '#667eea', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      <div className="subscription-plan-container">
        <div className="subscription-plan-card popular">
          {plan.popular && (
            <div className="popular-badge">
              <FaStar /> Most Popular
            </div>
          )}
          
          <div className="plan-header">
            <h3 className="plan-name">{plan.name}</h3>
            <div className="plan-price">
              <span className="price-amount">{plan.price}</span>
              <span className="price-period">/{plan.period}</span>
            </div>
            {plan.originalPrice && (
              <div className="plan-original-price">
                <span className="original-price">{plan.originalPrice}</span>
                <span className="discount-badge">50% OFF</span>
              </div>
            )}
          </div>

          <ul className="plan-features">
            {plan.features.map((feature, index) => (
              <li key={index}>
                <FaCheck className="feature-icon" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {isSubscribed ? (
            <div className="subscription-status">
              <div className="status-badge active">
                <FaCrown /> Active Subscription
              </div>
            </div>
          ) : (
            <>
              {error && error.includes('not configured') ? (
                <div className="payment-config-error">
                  <p>⚠️ Square payment system is not configured.</p>
                  <p>Please set the following environment variables in your <code>.env</code> file:</p>
                  <code>REACT_APP_SQUARE_APPLICATION_ID=your_square_application_id</code>
                  <p style={{ marginTop: '15px', fontSize: '0.9rem' }}>See SUBSCRIPTION_SETUP.md for detailed instructions.</p>
                </div>
              ) : (
                <div className="payment-form">
                  <div className="card-container-label">
                    <FaLock /> Secure Payment
                  </div>
                  <div id="card-container" ref={cardContainerRef} style={{ minHeight: '50px' }}></div>
                  {!squareCard && (
                    <div style={{ 
                      padding: '15px', 
                      marginTop: '10px',
                      background: isInitializing ? '#e3f2fd' : '#fff3cd',
                      border: `1px solid ${isInitializing ? '#90caf9' : '#ffc107'}`,
                      borderRadius: '8px',
                      textAlign: 'center', 
                      color: '#333', 
                      fontSize: '0.9rem' 
                    }}>
                      <div style={{ marginBottom: '8px', fontWeight: '600' }}>
                        {isInitializing ? '⏳ Initializing Payment Form...' : '⚠️ Payment Form Not Ready'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                        Status: {initStatus}
                      </div>
                      {!isInitializing && (
                        <button
                          onClick={() => window.location.reload()}
                          style={{
                            padding: '8px 16px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}
                        >
                          Retry / Refresh
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                className="plan-button"
                onClick={handleSubscribe}
                disabled={isProcessing || !squareCard || (error && !error.includes('not configured')) || isInitializing}
              >
                {isProcessing ? (
                  'Processing...'
                ) : isInitializing ? (
                  'Loading Payment Form...'
                ) : !squareCard && !error?.includes('not configured') ? (
                  'Payment Form Not Ready'
                ) : error && error.includes('not configured') ? (
                  'Configuration Required'
                ) : trialDaysRemaining > 0 ? (
                  `Start Trial - ${plan.price}/${plan.period}`
                ) : (
                  `Subscribe - ${plan.price}/${plan.period}`
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="subscription-footer">
        <p className="trial-info">
          <FaRocket /> <strong>30-Day Free Trial</strong> - No credit card required to start. Cancel anytime.
        </p>
        <p className="security-info">
          <FaLock /> Secure payment processing by Square. Your data is safe and encrypted.
        </p>
      </div>
    </div>
  );
}

export default Subscription;

