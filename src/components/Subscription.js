import React, { useState, useEffect, useRef } from 'react';
import './Subscription.css';
import { FaCheck, FaCrown, FaRocket, FaStar, FaArrowLeft, FaLock, FaCreditCard, FaHistory, FaCalendarAlt } from 'react-icons/fa';
import ConfirmDialog from './ConfirmDialog';

function Subscription({ onBack, currentUser, onLogout, onSubscriptionSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(30);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [squareCard, setSquareCard] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState('Initializing...');
  const [showTrialConfirmDialog, setShowTrialConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogTrial, setSuccessDialogTrial] = useState(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const cardContainerRef = useRef(null);
  const initializationTimeoutRef = useRef(null);
  const initializationCompleteRef = useRef(false);
  const squarePaymentsRef = useRef(null);
  const validatedLocationIdRef = useRef(null);
  const validatedApplicationIdRef = useRef(null);

  // Load Square Web Payments SDK only when payment form is shown (not on summary, and not when starting trial only)
  // Trial requires no payment; payment form only for subscribing after trial or converting to paid
  useEffect(() => {
    const showSummary = subscriptionStatus && (subscriptionStatus.isActive || subscriptionStatus.trialActive);
    const startTrialOnly = subscriptionStatus && subscriptionStatus.hasSubscriptionRecord === false;
    if (showSummary || startTrialOnly) {
      setError(null);
      setIsInitializing(false);
      return;
    }
    if (!subscriptionStatus && currentUser) return;

    const applicationId = (process.env.REACT_APP_SQUARE_APPLICATION_ID || '').trim().replace(/[\r\n]+/g, '');
    let locationId = (process.env.REACT_APP_SQUARE_LOCATION_ID || '').trim().replace(/[\r\n]+/g, '');
    
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
    
    // Trim and validate Location ID format (should start with 'L' and be alphanumeric)
    locationId = locationId.trim();
    const locationIdPattern = /^L[A-Z0-9]+$/i;
    if (!locationIdPattern.test(locationId)) {
      setError(`Invalid Location ID format. Location ID should start with 'L' followed by alphanumeric characters. Current value: "${locationId}"`);
      setInitStatus('❌ Invalid Location ID format');
      setIsInitializing(false);
      console.error('❌ Invalid Location ID format:', locationId);
      console.warn('💡 Location ID should look like: LXXXXXXXXXXXXX');
      console.warn('💡 Find it in Square Dashboard → Settings → Locations');
      console.warn('💡 Make sure there are no extra spaces or characters in your .env file');
      return;
    }
    
    // Store validated locationId in uppercase (Square may be case-sensitive)
    validatedLocationIdRef.current = locationId.toUpperCase();
    
    // Store validated applicationId (trimmed)
    validatedApplicationIdRef.current = applicationId;
    
    setInitStatus('✅ Application ID and Location ID found');

    // Check if we're in a secure context (HTTPS or localhost)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn('⚠️  Square requires HTTPS in production');
    }

    const loadSquareSDK = () => {
      setInitStatus('Loading Square SDK script...');
      setError(null);

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
        // Use the validated locationId from ref (validated earlier in useEffect)
        const locationId = validatedLocationIdRef.current;
        
        if (!locationId) {
          throw new Error('Location ID is required but not set. Please check your .env file and restart the server.');
        }
        
        // Use the validated applicationId from ref
        const applicationId = validatedApplicationIdRef.current;
        
        if (!applicationId) {
          throw new Error('Application ID is required but not set. Please check your .env file and restart the server.');
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

        // Final validation check
        const locationIdPattern = /^L[A-Z0-9]+$/;
        if (!locationIdPattern.test(locationId)) {
          throw new Error(`Invalid Location ID format: "${locationId}". Location ID must start with 'L' followed by uppercase alphanumeric characters only.`);
        }

        // Validate applicationId format
        if (typeof applicationId !== 'string' || applicationId.trim().length === 0) {
          throw new Error('Application ID must be a non-empty string');
        }

        // Ensure both values are plain strings, trimmed, no stray newlines (e.g. from .env)
        const trimmedApplicationId = String(applicationId).trim().replace(/[\r\n]+/g, '');
        const trimmedLocationId = String(locationId).trim().replace(/[\r\n]+/g, '');

        // Square expects location ID to be a non-empty string (format: L + alphanumeric)
        if (!trimmedLocationId || trimmedLocationId.length < 2) {
          throw new Error(`Invalid Location ID: value is missing or too short. Use your Sandbox Location ID from Square Developer Console → Locations.`);
        }

        console.log('🔧 Initializing Square payments...', {
          applicationId: trimmedApplicationId.substring(0, 10) + '...',
          locationId: trimmedLocationId,
          locationIdLength: trimmedLocationId.length,
          locationIdType: typeof trimmedLocationId,
          applicationIdLength: trimmedApplicationId.length,
          applicationIdType: typeof trimmedApplicationId,
          locationIdFirstChar: trimmedLocationId[0],
          locationIdLastChar: trimmedLocationId[trimmedLocationId.length - 1],
        });
        
        setInitStatus('🔧 Creating payments instance...');
        console.log('🔧 Using Application ID:', trimmedApplicationId.substring(0, 10) + '...');
        console.log('🔧 Using Location ID:', trimmedLocationId);
        console.log('🔧 Location ID details:', {
          value: trimmedLocationId,
          length: trimmedLocationId.length,
          type: typeof trimmedLocationId,
          charCodeAt0: trimmedLocationId.charCodeAt(0),
          isValidString: typeof trimmedLocationId === 'string' && trimmedLocationId.length > 0
        });
        
        // Square Web Payments SDK expects: payments(applicationId, locationId) with two string args
        const payments = window.Square.payments(trimmedApplicationId, trimmedLocationId);
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
  }, [subscriptionStatus, currentUser]);

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
  }, [currentUser, onBack, onSubscriptionSuccess]);

  // Fetch payment history when showing subscription summary
  useEffect(() => {
    const fetchPayments = async () => {
      if (!currentUser || (!subscriptionStatus?.isActive && !subscriptionStatus?.trialActive)) return;
      setLoadingPayments(true);
      try {
        const { getPaymentHistory } = await import('../utils/subscriptionTracking');
        const payments = await getPaymentHistory(currentUser.id, 20);
        setPaymentHistory(payments || []);
      } catch (err) {
        console.error('Error fetching payment history:', err);
        setPaymentHistory([]);
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchPayments();
  }, [currentUser, subscriptionStatus?.isActive, subscriptionStatus?.trialActive]);

  const handleStartFreeTrial = async () => {
    if (!currentUser) {
      setError('Please log in to start your trial');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const { startTrial, clearSubscriptionStatusCache, getSubscriptionStatus } = await import('../utils/subscription');
      await startTrial(currentUser.id);
      clearSubscriptionStatusCache(currentUser.id);
      const status = await getSubscriptionStatus(currentUser.id, true);
      setSubscriptionStatus(status);
      if (status?.trialActive) {
        const trialStartDate = new Date(status.trialStartDate);
        const now = new Date();
        const daysElapsed = Math.floor((now - trialStartDate) / (1000 * 60 * 60 * 24));
        setTrialDaysRemaining(Math.max(0, 30 - daysElapsed));
      }
      setSuccessDialogTrial(true);
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Error starting trial:', err);
      setError(err.message || 'Failed to start trial. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      setError('Please log in to subscribe');
      return;
    }

    // If user has no subscription record yet, start free trial (no payment required)
    if (subscriptionStatus?.hasSubscriptionRecord === false) {
      await handleStartFreeTrial();
      return;
    }

    if (!squareCard) {
      setError('Payment system not ready. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Check if trial is still active (and they're trying to convert to paid early)
      if (trialDaysRemaining > 0) {
        setShowTrialConfirmDialog(true);
        setIsProcessing(false);
        return;
      }

      // Proceed with subscription (payment required)
      await proceedWithSubscription();
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to process subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscriptionClick = () => {
    setShowCancelConfirmDialog(true);
  };

  const handleCancelSubscriptionConfirm = async () => {
    if (!currentUser) return;
    setIsCancelling(true);
    setError(null);
    try {
      const { cancelSubscription, clearSubscriptionStatusCache } = await import('../utils/subscription');
      await cancelSubscription(currentUser.id);
      clearSubscriptionStatusCache(currentUser.id);
      setSubscriptionStatus({
        isActive: false,
        trialActive: false,
        trialDaysRemaining: 0,
        trialStartDate: null,
        subscriptionEndDate: null,
      });
      setShowCancelConfirmDialog(false);
      if (onSubscriptionSuccess) {
        onSubscriptionSuccess();
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelSubscriptionCancel = () => {
    setShowCancelConfirmDialog(false);
  };

  const proceedWithSubscription = async () => {
    if (!currentUser || !squareCard) {
      setError('Please log in and ensure payment system is ready');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Payment processing timed out. Please check your internet connection and try again.'));
      }, 30000); // 30 second timeout
    });

    try {
      // Tokenize card
      const tokenResult = await squareCard.tokenize();
      
      console.log('💳 Tokenization result:', tokenResult);
      
      // Check for tokenization errors
      if (tokenResult.status === 'OK' && tokenResult.token) {
        // NOTE: Square's tokenize() only validates card format, not payment processing
        // Actual payment processing (including declines) happens on the backend
        // In sandbox mode, test cards like 4000 0000 0000 0002 will decline when processed
        
        // IMPORTANT: In production, payment processing must happen on your backend server
        // The backend should call Square's Payments API and handle declines properly
        // For now, we simulate payment processing
        
        // Process payment on backend with timeout protection
        const { processSubscription } = await import('../utils/subscription');
        const result = await Promise.race([
          processSubscription(currentUser.id, tokenResult.token, trialDaysRemaining > 0),
          timeoutPromise
        ]);
        
        if (result.success) {
          setSuccessDialogTrial(false);
          setShowSuccessDialog(true);
          // Refresh subscription status (force refresh to get latest data)
          const { getSubscriptionStatus, clearSubscriptionStatusCache } = await import('../utils/subscription');
          clearSubscriptionStatusCache(currentUser.id); // Clear cache before fetching
          const status = await Promise.race([
            getSubscriptionStatus(currentUser.id, true), // Force refresh
            timeoutPromise
          ]);
          setSubscriptionStatus(status);
          // Note: onSubscriptionSuccess will be called when user closes the success dialog
        } else {
          setError(result.error || 'Failed to process subscription. Please try again.');
        }
      } else {
        // Handle tokenization errors
        let errorMessage = 'Card tokenization failed. ';
        
        if (tokenResult.errors && tokenResult.errors.length > 0) {
          // Square SDK provides detailed error messages
          const errorDetails = tokenResult.errors.map(err => err.detail || err.message).join('. ');
          errorMessage += errorDetails;
          
          // Check for specific error types
          const hasDeclineError = tokenResult.errors.some(err => 
            err.code === 'CARD_DECLINED' || 
            err.code === 'INSUFFICIENT_FUNDS' ||
            err.detail?.toLowerCase().includes('declined') ||
            err.detail?.toLowerCase().includes('insufficient')
          );
          
          if (hasDeclineError) {
            errorMessage = 'Your card was declined. Please check your card details or try a different payment method.';
          }
        } else if (tokenResult.status) {
          // Handle different status codes
          switch (tokenResult.status) {
            case 'CARD_DECLINED':
              errorMessage = 'Your card was declined. Please check your card details or try a different payment method.';
              break;
            case 'INSUFFICIENT_FUNDS':
              errorMessage = 'Insufficient funds. Please use a different payment method.';
              break;
            case 'INVALID_CARD':
              errorMessage = 'Invalid card details. Please check your card number, expiry date, and CVV.';
              break;
            case 'EXPIRED_CARD':
              errorMessage = 'Your card has expired. Please use a different payment method.';
              break;
            default:
              errorMessage += `Status: ${tokenResult.status}. Please check your card details.`;
          }
        } else {
          errorMessage += 'Please check your card details and try again.';
        }
        
        console.error('❌ Card tokenization failed:', tokenResult);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('❌ Subscription error:', err);
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      
      // Handle specific error types
      let errorMessage = 'Failed to process subscription. ';
      
      if (err.message) {
        if (err.message.includes('timed out') || err.message.includes('timeout')) {
          errorMessage = 'Payment processing timed out. Please check your internet connection and try again. If the problem persists, refresh the page.';
        } else if (err.message.includes('declined') || err.message.includes('DECLINED')) {
          errorMessage = 'Your card was declined. Please check your card details or try a different payment method.';
        } else if (err.message.includes('insufficient') || err.message.includes('INSUFFICIENT')) {
          errorMessage = 'Insufficient funds. Please use a different payment method.';
        } else if (err.message.includes('expired') || err.message.includes('EXPIRED')) {
          errorMessage = 'Your card has expired. Please use a different payment method.';
        } else if (err.message.includes('invalid') || err.message.includes('INVALID')) {
          errorMessage = 'Invalid card details. Please check your card information and try again.';
        } else if (err.message.includes('not configured') || err.message.includes('Database not configured')) {
          errorMessage = 'Database connection error. Please refresh the page and try again.';
        } else {
          errorMessage += err.message;
        }
      } else {
        errorMessage += 'Please try again. If the problem persists, refresh the page.';
      }
      
      setError(errorMessage);
    } finally {
      // Always reset processing state, even if there was an error
      setIsProcessing(false);
    }
  };

  const handleTrialConfirm = async () => {
    setShowTrialConfirmDialog(false);
    await proceedWithSubscription();
  };

  const handleTrialCancel = () => {
    setShowTrialConfirmDialog(false);
    setIsProcessing(false);
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    setSuccessDialogTrial(false);
    // Redirect away from subscription page after successful subscription
    if (onSubscriptionSuccess) {
      onSubscriptionSuccess();
    } else if (onBack) {
      onBack();
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
      'Custom branding'
    ],
    popular: true
  };

  const isSubscribed = subscriptionStatus?.isActive || false;
  const isTrialActive = subscriptionStatus?.trialActive || false;
  const isTrialEnded = subscriptionStatus?.hasSubscriptionRecord && !subscriptionStatus?.trialActive && !subscriptionStatus?.isActive;

  return (
    <div className="subscription-page">
      <ConfirmDialog
        isOpen={showTrialConfirmDialog}
        title="Trial Period Remaining"
        message={`You have ${trialDaysRemaining} days left in your trial. After the trial ends, you'll be charged $9.99 per month. Continue?`}
        confirmText="Continue"
        cancelText="Cancel"
        type="info"
        onConfirm={handleTrialConfirm}
        onCancel={handleTrialCancel}
      />
      <ConfirmDialog
        isOpen={showSuccessDialog}
        title={successDialogTrial ? 'Trial started!' : 'Subscription Successful!'}
        message={successDialogTrial
          ? 'Your free trial has started. You have 30 days of Pro access. No payment was required.'
          : 'Welcome to Pro! Your subscription is now active and you have access to all premium features.'}
        confirmText="OK"
        type="success"
        showCancel={false}
        onConfirm={handleSuccessClose}
      />
      <ConfirmDialog
        isOpen={showCancelConfirmDialog}
        title="Cancel subscription?"
        message={isSubscribed
          ? "Are you sure you want to cancel? You'll keep access until the end of your current billing period, then your subscription will end."
          : "Are you sure you want to cancel your trial? You'll lose access to Pro features. You can subscribe again anytime."}
        confirmText={isCancelling ? 'Cancelling...' : 'Yes, cancel'}
        cancelText="Keep subscription"
        type="warning"
        onConfirm={handleCancelSubscriptionConfirm}
        onCancel={handleCancelSubscriptionCancel}
        showCancel={!isCancelling}
      />
      <div className="subscription-header">
        {onBack && (
          <button onClick={onBack} className="back-button-subscription">
            <FaArrowLeft /> Back
          </button>
        )}
        <div className="subscription-title-section">
          <h1 className="subscription-title">
            {isTrialEnded ? 'Trial Ended' : (isSubscribed || isTrialActive) ? 'Subscription summary' : 'Upgrade to Pro'}
          </h1>
          <p className="subscription-subtitle">
            {isTrialEnded ? (
              <>Your free trial has ended. Upgrade to Pro to keep access to all features.</>
            ) : isSubscribed ? (
              <>You're subscribed to Pro! 🎉</>
            ) : isTrialActive && trialDaysRemaining > 0 ? (
              <>Your <strong>30-day free trial</strong> is active. {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining.</>
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

      {(isSubscribed || isTrialActive) ? (
        <div className="subscription-plan-container" style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div className="subscription-plan-card popular">
            <div className="subscription-status" style={{ padding: '1.5rem 0' }}>
              <div className="status-badge active" style={{ fontSize: '1.1rem', padding: '0.75rem 1.25rem' }}>
                <FaCrown /> {isSubscribed ? 'Active Subscription' : `Trial: ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining`}
              </div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary, #666)', fontSize: '0.95rem' }}>
                {isSubscribed
                  ? 'Your Pro plan is active. You have access to all premium features.'
                  : `You have ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left in your free trial. Subscribe before it ends to keep Pro access.`}
              </p>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.04)', borderRadius: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {subscriptionStatus?.planType && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaCrown style={{ opacity: 0.8 }} /> <strong>Plan:</strong> {String(subscriptionStatus.planType).charAt(0).toUpperCase() + String(subscriptionStatus.planType).slice(1)}
                    </div>
                  )}
                  {(subscriptionStatus?.subscriptionEndDate || subscriptionStatus?.nextBillingDate) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaCalendarAlt style={{ opacity: 0.8 }} />
                      <strong>{isSubscribed ? 'Next billing:' : 'Trial ends:'}</strong>{' '}
                      {new Date(subscriptionStatus?.nextBillingDate || subscriptionStatus?.subscriptionEndDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </div>
                  )}
                  {subscriptionStatus?.billingCycle && isSubscribed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>Billing cycle:</strong> {String(subscriptionStatus.billingCycle)}
                    </div>
                  )}
                  {subscriptionStatus?.lastPaymentDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaCalendarAlt style={{ opacity: 0.8 }} /> <strong>Last payment:</strong>{' '}
                      {new Date(subscriptionStatus.lastPaymentDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </div>
                  )}
                  {paymentHistory.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <FaCreditCard style={{ opacity: 0.8 }} /> <strong>Payment method:</strong>{' '}
                      {paymentHistory[0]?.payment_method ? String(paymentHistory[0].payment_method).charAt(0).toUpperCase() + String(paymentHistory[0].payment_method).slice(1) : 'Card'}
                    </div>
                  )}
                </div>
              </div>

              {paymentHistory.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                    <FaHistory /> Payments made
                  </div>
                  {loadingPayments ? (
                    <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.9rem' }}>Loading payments...</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                            <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem 0.5rem 0' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Amount</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Method</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                              <td style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>
                                {p.transaction_date ? new Date(p.transaction_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                {p.amount_cents != null ? `$${(p.amount_cents / 100).toFixed(2)}` : '—'}
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <span style={{
                                  color: p.payment_status === 'completed' ? 'var(--success, #22c55e)' : p.payment_status === 'failed' ? 'var(--danger, #ef4444)' : 'inherit',
                                  textTransform: 'capitalize',
                                }}>
                                  {p.payment_status || '—'}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{p.payment_method || 'Card'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleCancelSubscriptionClick}
                disabled={isCancelling}
                className="plan-button"
                style={{
                  marginTop: '1.25rem',
                  background: 'transparent',
                  border: '1px solid rgba(0,0,0,0.2)',
                  color: 'var(--text-secondary, #666)',
                  fontSize: '0.95rem',
                  padding: '0.6rem 1.2rem',
                }}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel subscription'}
              </button>
            </div>
          </div>
        </div>
      ) : (
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

            <>
              {/* No payment required for trial: show only "Start free trial" when user has no subscription record */}
              {subscriptionStatus?.hasSubscriptionRecord === false ? (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                    Start your <strong>30-day free trial</strong>. No credit card required.
                  </p>
                  <button
                    className="plan-button"
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Starting trial...' : 'Start free trial'}
                  </button>
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
                    ) : (
                      `Subscribe - ${plan.price}/${plan.period}`
                    )}
                  </button>
                </>
              )}
            </>
        </div>
      </div>
      )}

      <div className="subscription-footer">
        <p className="trial-info">
          <FaRocket /> <strong>30-day free trial</strong> — no payment required. After the trial, subscribe to keep Pro access. Cancel anytime.
        </p>
        <p className="security-info">
          <FaLock /> When you subscribe, payment is processed securely by Square.
        </p>
      </div>
    </div>
  );
}

export default Subscription;

