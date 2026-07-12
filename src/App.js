import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Home from './components/Home';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import RegistrationForm from './components/RegistrationForm';
import EntityList from './components/EntityList';
import EntityView from './components/EntityView';
import SocialMediaIconsPage from './components/SocialMediaIconsPage';
import ProfileDashboard from './components/ProfileDashboard';
import ConfirmDialog from './components/ConfirmDialog';
import Subscription from './components/Subscription';
import AdminCoupons from './components/AdminCoupons';
import AdminProfiles from './components/AdminProfiles';
import SiteBanner from './components/SiteBanner';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import ContactUs from './components/ContactUs';
import { useCart } from './context/CartContext';
import { getEntities, deactivateEntity, reactivateEntity, deleteEntity, countAnonymousProfiles } from './utils/storage';
import { getTheme, applyTheme } from './utils/theme';
import { supabase, isClientValid, testConnection } from './lib/supabase';
import { getCurrentUser, logoutUser, clearUserCache, userFromAuthUser, cacheUserFromAuth } from './utils/auth';
import './utils/oauth-diagnostics'; // Load diagnostics helper

const TRIAL_RESTRICTED_PAGES = ['list', 'view', 'dashboard', 'register'];

const hasSquareSuccessParams = (search) => {
  const params = new URLSearchParams(search || '');
  return Boolean(
    params.get('payment_success') ||
    params.get('checkout_id') ||
    params.get('checkoutId') ||
    params.get('order_id') ||
    params.get('orderId') ||
    params.get('payment_id') ||
    params.get('paymentId') ||
    params.get('transaction_id') ||
    params.get('transactionId')
  );
};

// When Square payment link redirects here after success, we're in a popup: notify opener and close
function usePaymentSuccessPopup() {
  const [isPaymentSuccessPopup, setIsPaymentSuccessPopup] = useState(false);
  useEffect(() => {
    const paymentRedirectDetected = hasSquareSuccessParams(window.location.search);
    if (window.opener && paymentRedirectDetected) {
      try {
        window.opener.postMessage(
          {
            type: 'SQUARE_PAYMENT_SUCCESS',
            search: window.location.search,
            href: window.location.href,
          },
          '*'
        );
      } catch (e) {
        console.warn('postMessage to opener failed:', e);
      }
      setIsPaymentSuccessPopup(true);
      // Give opener time to receive postMessage and start recording, then try to close (some browsers block close unless window was opened by script)
      const t = setTimeout(() => window.close(), 800);
      return () => clearTimeout(t);
    }
  }, []);
  return isPaymentSuccessPopup;
}

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'list', 'register', 'view', 'edit', 'icons', 'dashboard', 'subscription'
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [entityToPermanentlyDelete, setEntityToPermanentlyDelete] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const currentUserRef = useRef(null);
  const entitiesLoadIdRef = useRef(0);
  const isPaymentSuccessPopup = usePaymentSuccessPopup();
  const paymentSuccessHandledRef = useRef(false);
  const { count: cartCount } = useCart();

  // When Square redirects to our URL in the main window (e.g. same tab), record payment and clear URL
  useEffect(() => {
    if (isLoadingAuth || paymentSuccessHandledRef.current) return;
    if (!hasSquareSuccessParams(window.location.search) || window.opener) return; // popup case handled elsewhere
    const userId = currentUser?.id;
    if (!userId) return;
    paymentSuccessHandledRef.current = true;
    (async () => {
      try {
        const { recordPaymentFromLinkAndActivate, getSubscriptionStatus, clearSubscriptionStatusCache } = await import('./utils/subscription');
        await recordPaymentFromLinkAndActivate(userId, { search: window.location.search, href: window.location.href });
        clearSubscriptionStatusCache(userId);
        const status = await getSubscriptionStatus(userId, true);
        setSubscriptionStatus(status);
        window.history.replaceState({}, document.title, window.location.pathname + (window.location.hash || ''));
      } catch (err) {
        console.error('Error recording payment from redirect:', err);
        paymentSuccessHandledRef.current = false;
      }
    })();
  }, [currentUser?.id, isLoadingAuth]);

  // Listen for payment success from Square payment link popup (works when payment opened from Subscription page)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type !== 'SQUARE_PAYMENT_SUCCESS') return;
      if (!hasSquareSuccessParams(event.data?.search)) return;
      const userId = currentUser?.id;
      if (!userId) return;
      (async () => {
        try {
          const { recordPaymentFromLinkAndActivate, getSubscriptionStatus, clearSubscriptionStatusCache } = await import('./utils/subscription');
          await recordPaymentFromLinkAndActivate(userId, { search: event.data.search, href: event.data.href });
          clearSubscriptionStatusCache(userId);
          const status = await getSubscriptionStatus(userId, true);
          setSubscriptionStatus(status);
        } catch (err) {
          console.error('Error recording payment from link:', err);
        }
      })();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser?.id]);

  // Apply theme on initial mount
  useEffect(() => {
    const theme = getTheme();
    setCurrentTheme(theme);
    applyTheme(theme);
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Define loadEntities first so it can be used in other effects
  const loadEntities = useCallback(async (userIdOverride) => {
    const loadId = ++entitiesLoadIdRef.current;
    try {
      const userId = userIdOverride ?? currentUser?.id ?? null;
      console.log('📋 Loading entities for user:', userId || 'anonymous');
      const loadedEntities = await getEntities(userId);
      if (loadId !== entitiesLoadIdRef.current) {
        console.log('ℹ️  Ignoring stale profile load result');
        return;
      }
      setEntities(loadedEntities);
      console.log(`✅ Loaded ${loadedEntities.length} profile(s)`);

      if (userId && loadedEntities.length === 0) {
        const anonymousCount = await countAnonymousProfiles();
        if (loadId !== entitiesLoadIdRef.current) return;

        if (anonymousCount > 0) {
          console.log(`🔄 Found ${anonymousCount} anonymous profile(s). Attempting to migrate...`);
          const { migrateAnonymousProfilesToUser } = await import('./utils/storage');
          const result = await migrateAnonymousProfilesToUser(userId);
          if (loadId !== entitiesLoadIdRef.current) return;

          if (result.migrated > 0) {
            console.log(`✅ Migrated ${result.migrated} profile(s) to current user. Reloading...`);
            const reloadedEntities = await getEntities(userId);
            if (loadId !== entitiesLoadIdRef.current) return;
            setEntities(reloadedEntities);
            console.log(`✅ Now showing ${reloadedEntities.length} profile(s)`);
          }
        }
      }
    } catch (error) {
      if (loadId !== entitiesLoadIdRef.current) return;
      console.error('❌ Error loading entities:', error);
      setEntities([]);
    }
  }, [currentUser]);

  // Check authentication on mount
  useEffect(() => {
    let isMounted = true;
    let safetyTimeout;
    let subscription = null;

    // Safety timeout to ensure loading state is cleared (reduced to 2 seconds)
    safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.log('⏱️  Auth check timeout - clearing loading state');
        setIsLoadingAuth(false);
      }
    }, 2000); // 2 second timeout

    const initializeAuth = async () => {
      try {
        // Check if Supabase client is available
        if (!supabase || !supabase.auth) {
          console.warn('⚠️  Supabase client not available, skipping auth check');
          if (isMounted) {
            setIsLoadingAuth(false);
          }
          return;
        }

        // Check if this is an OAuth callback (URL contains hash with access_token or error)
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
          console.log('🔐 Detected password recovery in URL hash');
          setShowResetPassword(true);
          await new Promise(resolve => setTimeout(resolve, 500));
        } else if (hash && (hash.includes('access_token') || hash.includes('error') || hash.includes('code'))) {
          console.log('🔐 Detected OAuth callback in URL hash');
          // Supabase will automatically process this via detectSessionInUrl
          // But we should wait a moment for it to process
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Initial auth check
        await checkAuth();
        
        // Listen for auth changes
        try {
          const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (!isMounted) return;

              // Defer async work — calling supabase.auth.* inside this callback deadlocks signInWithPassword
              setTimeout(async () => {
                if (!isMounted) return;

                try {
                  console.log('🔐 Auth state changed:', event, session ? 'Session exists' : 'No session');
                  clearTimeout(safetyTimeout);

                  if (event === 'PASSWORD_RECOVERY') {
                    console.log('🔐 Password recovery session detected');
                    setShowResetPassword(true);
                    setShowLogin(false);
                    if (isMounted) {
                      setIsLoadingAuth(false);
                    }
                    return;
                  }

                  if (session?.user) {
                    const user = userFromAuthUser(session.user);
                    cacheUserFromAuth(user);
                    console.log('✅ User from session:', user?.email);

                    if (event === 'SIGNED_IN') {
                      console.log('🔄 SIGNED_IN event - updating user state and navigating to profiles list');
                      setCurrentPage('list');
                      setCurrentUser(user);
                      setShowLogin(false);
                    } else {
                      setCurrentUser(prevUser => {
                        if (!prevUser || prevUser.id !== user.id) {
                          console.log('🔄 Updating user state from auth listener');
                          return user;
                        }
                        return prevUser;
                      });
                      setShowLogin(false);
                    }
                  } else if (session) {
                    const user = await getCurrentUser(false);
                    if (user) {
                      setCurrentUser(prevUser => (!prevUser || prevUser.id !== user.id ? user : prevUser));
                      setShowLogin(false);
                    } else {
                      setCurrentUser(null);
                      setShowLogin(false);
                    }
                  } else {
                    console.log('ℹ️  No session, user logged out');
                    if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || !session) {
                      console.log('🔄 Clearing user state due to logout');
                      currentUserRef.current = null;
                      entitiesLoadIdRef.current += 1;
                      setCurrentUser(null);
                      setShowLogin(false);
                      setSubscriptionStatus(null);
                      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                        setEntities([]);
                      }
                    }
                  }
                } catch (error) {
                  console.error('❌ Error in auth state change handler:', error);
                  setCurrentUser(null);
                  setShowLogin(false);
                } finally {
                  if (isMounted) {
                    setIsLoadingAuth(false);
                  }
                }
              }, 0);
            }
          );
          
          subscription = authSubscription;
        } catch (error) {
          console.error('❌ Error setting up auth state listener:', error);
          clearTimeout(safetyTimeout);
          if (isMounted) {
            setIsLoadingAuth(false);
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        clearTimeout(safetyTimeout);
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [loadEntities]);

  // Test database connection on mount
  useEffect(() => {
    const testDbConnection = async () => {
      if (!isClientValid) {
        console.warn('⚠️  Database connection test skipped - Supabase client not properly configured');
        return;
      }

      try {
        const result = await testConnection();
        if (result.success) {
          console.log('✅ Database connection test passed');
        } else {
          console.error('❌ Database connection test failed:', result.error);
          if (result.details) {
            console.error('Error details:', result.details);
          }
        }
      } catch (error) {
        console.error('❌ Error testing database connection:', error);
      }
    };

    // Test connection after a short delay to ensure everything is initialized
    setTimeout(testDbConnection, 1000);
  }, []);

  useEffect(() => {
    // Check URL for UUID parameter first
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const uuidParam = urlParams.get('uuid');
      if (uuidParam) {
        setUuid(uuidParam);
        setCurrentPage('icons');
        return; // Don't show home page if UUID is in URL
      }
    } catch (error) {
      console.error('Error checking URL params:', error);
    }
    
    // Load all entities only if authenticated; skip if user changed (e.g. signed out) before timeout fires
    currentUserRef.current = currentUser;
    if (currentUser) {
      const userId = currentUser.id;
      setTimeout(() => {
        if (currentUserRef.current?.id !== userId) return;
        loadEntities(userId).catch(error => {
          if (currentUserRef.current?.id !== userId) return;
          console.error('Error loading entities:', error);
          setEntities([]);
        });
      }, 0);
    } else {
      setEntities([]);
    }
  }, [currentUser, loadEntities]); // Run when currentUser or loadEntities changes

  // Check subscription status when user changes; start trial on signup day if no record (e.g. OAuth)
  useEffect(() => {
    const checkSubscription = async () => {
      if (!currentUser) {
        setSubscriptionStatus(null);
        return;
      }

      try {
        const { getSubscriptionStatus, startTrial, clearSubscriptionStatusCache } = await import('./utils/subscription');
        let status = await getSubscriptionStatus(currentUser.id, true);
        // Start trial on signup day for users with no subscription record (e.g. first OAuth login)
        if (status && status.hasSubscriptionRecord === false) {
          try {
            await startTrial(currentUser.id);
            clearSubscriptionStatusCache(currentUser.id);
            status = await getSubscriptionStatus(currentUser.id, true);
          } catch (trialErr) {
            console.warn('Auto-start trial on first login failed:', trialErr);
          }
        }
        setSubscriptionStatus(status);
      } catch (err) {
        console.error('Error checking subscription status:', err);
        setSubscriptionStatus(null);
      }
    };

    checkSubscription();
  }, [currentUser]);

  const isTrialEnded = subscriptionStatus?.hasSubscriptionRecord
    && !subscriptionStatus?.trialActive
    && !subscriptionStatus?.isActive
    && !subscriptionStatus?.isLifetime;

  // Redirect to upgrade when trial has ended and user is on a restricted page
  useEffect(() => {
    if (isTrialEnded && currentUser && TRIAL_RESTRICTED_PAGES.includes(currentPage)) {
      setCurrentPage('subscription');
    }
  }, [isTrialEnded, currentPage, currentUser]);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser(false); // Use cache if available (respects 1 minute limit)
      setCurrentUser(user);
      // Don't set showLogin here - let the render logic handle it based on currentPage
      setShowLogin(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setCurrentUser(null);
      // Don't set showLogin here - let the render logic handle it
      setShowLogin(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLoginSuccess = async (user) => {
    try {
      console.log('✅ Login success callback received, user:', user);
      
      if (!user) {
        console.error('❌ Login success called but no user provided');
        return;
      }

      // Set navigation and user state FIRST (before any async operations)
      // This ensures the UI updates immediately and prevents login screen from showing
      console.log('🔄 Setting user state and navigation immediately...');
      setShowLogin(false);
      setCurrentUser(user);
      // After login, take user to the profiles (list) page
      setCurrentPage('list');
      
      console.log('✅ Navigation and user state updated immediately');
      console.log('   - Current page: list');
      console.log('   - Show login: false');
      console.log('   - Current user:', user?.email);

      cacheUserFromAuth(user);

      // Load entities asynchronously (don't block navigation)
      loadEntities(user.id).catch(err => {
        console.error('❌ Error loading entities after login:', err);
        // Don't throw - navigation should still work even if entities fail to load
      });
      
      console.log('✅ Login flow completed successfully, navigated to home page');
    } catch (error) {
      console.error('❌ Error in handleLoginSuccess:', error);
      // Still set the user if we have it, but log the error
      if (user) {
        // Ensure navigation happens even on error
        setCurrentPage('list');
        setShowLogin(false);
        setCurrentUser(user);
      }
    }
  };

  const handleLogout = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      console.log('🔐 Logout initiated...');
      clearUserCache();
      // Clear user state first so no effect schedules profile fetches with old user id
      currentUserRef.current = null;
      entitiesLoadIdRef.current += 1;
      setCurrentUser(null);
      setEntities([]);
      setSubscriptionStatus(null);
      setShowLogin(false);
      setCurrentPage('home');

      await logoutUser();
      console.log('✅ Logout completed, user state cleared');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      currentUserRef.current = null;
      entitiesLoadIdRef.current += 1;
      setCurrentUser(null);
      setEntities([]);
      setSubscriptionStatus(null);
      setShowLogin(false);
      setCurrentPage('home');
      
      // Show error to user
      alert('Logout encountered an error, but you have been signed out locally. Please refresh the page if you continue to see issues.');
    }
  };


  const handleViewEntity = async (entity) => {
    if (isTrialEnded) {
      setCurrentPage('subscription');
      return;
    }
    if (currentUser && entity.userId !== currentUser.id) {
      console.warn('⚠️  Attempted to view entity that does not belong to current user');
      alert('You do not have permission to view this profile.');
      return;
    }
    setSelectedEntity(entity);
    setCurrentPage('view');
  };

  const handleViewDashboard = (entity) => {
    if (isTrialEnded) {
      setCurrentPage('subscription');
      return;
    }
    setSelectedEntity(entity);
    setCurrentPage('dashboard');
  };

  const handleEditEntity = async (entity) => {
    if (isTrialEnded) {
      setCurrentPage('subscription');
      return;
    }
    if (currentUser && entity.userId !== currentUser.id) {
      console.warn('⚠️  Attempted to edit entity that does not belong to current user');
      alert('You do not have permission to edit this profile.');
      return;
    }
    setEditingEntity(entity);
    setCurrentPage('register');
  };

  const handleDeleteEntity = (id) => {
    // Archive (deactivate) the entity
    const entity = entities.find((e) => e.id === id);
    setEntityToDelete(entity);
    setShowConfirmDialog(true);
  };

  const handlePermanentDeleteEntity = (id) => {
    // Permanently delete the entity (only for archived profiles)
    const entity = entities.find((e) => e.id === id);
    setEntityToPermanentlyDelete(entity);
    setShowPermanentDeleteDialog(true);
  };

  const confirmPermanentDelete = async () => {
    if (entityToPermanentlyDelete) {
      try {
        const userId = currentUser?.id || null;
        await deleteEntity(entityToPermanentlyDelete.id, userId);
        await loadEntities();
        if (selectedEntity?.id === entityToPermanentlyDelete.id) {
          setSelectedEntity(null);
          setCurrentPage('list');
        }
      } catch (error) {
        console.error('❌ Error permanently deleting entity:', error);
        alert(error.message || 'Failed to permanently delete profile. Please try again.');
      }
    }
    setShowPermanentDeleteDialog(false);
    setEntityToPermanentlyDelete(null);
  };

  const cancelPermanentDelete = () => {
    setShowPermanentDeleteDialog(false);
    setEntityToPermanentlyDelete(null);
  };

  const confirmDeactivate = async () => {
    if (entityToDelete) {
      try {
        const userId = currentUser?.id || null;
        await deactivateEntity(entityToDelete.id, userId);
        await loadEntities();
        if (selectedEntity?.id === entityToDelete.id) {
          setSelectedEntity(null);
          setCurrentPage('list');
        }
      } catch (error) {
        console.error('❌ Error deactivating entity:', error);
        alert(error.message || 'Failed to deactivate profile. Please try again.');
      }
    }
    setShowConfirmDialog(false);
    setEntityToDelete(null);
  };

  const cancelDeactivate = () => {
    setShowConfirmDialog(false);
    setEntityToDelete(null);
  };

  const handleReactivateEntity = async (id) => {
    try {
      const userId = currentUser?.id || null;
      await reactivateEntity(id, userId);
      await loadEntities();
    } catch (error) {
      console.error('❌ Error reactivating entity:', error);
      alert(error.message || 'Failed to reactivate profile. Please try again.');
    }
  };

  const handleRegisterNew = () => {
    if (isTrialEnded) {
      setCurrentPage('subscription');
      return;
    }
    setEditingEntity(null);
    setCurrentPage('register');
  };

  const handleBackToList = () => {
    if (isTrialEnded) {
      setCurrentPage('subscription');
      return;
    }
    setSelectedEntity(null);
    setEditingEntity(null);
    setCurrentPage('list');
  };

  const handleGetStarted = () => {
    if (currentUser && isTrialEnded) {
      setCurrentPage('subscription');
      return;
    }
    if (currentUser) {
      setCurrentPage('list');
    } else {
      setShowLogin(true);
      setCurrentPage('list');
    }
  };

  const handleEntitySaved = () => {
    loadEntities();
    setEditingEntity(null);
    setCurrentPage('list');
  };

  const handleSubscriptionPaid = useCallback(async (userId, paymentData) => {
    try {
      const { activateSubscriptionAfterPayment, getSubscriptionStatus, clearSubscriptionStatusCache } = await import('./utils/subscription');
      await activateSubscriptionAfterPayment(userId, paymentData);
      clearSubscriptionStatusCache(userId);
      const status = await getSubscriptionStatus(userId, true);
      setSubscriptionStatus(status);
      if (currentUser?.email) {
        const { sendSubscriptionActivated } = await import('./utils/notificationEmail');
        sendSubscriptionActivated(currentUser.email, {
          billingCycle: status.billingCycle || 'monthly',
          nextBillingDate: status.nextBillingDate || null,
        });
      }
    } catch (err) {
      console.error('Error activating subscription after payment:', err);
      throw err;
    }
  }, [currentUser?.email]);

  const handleCouponApplied = useCallback(async (userId) => {
    try {
      const { getSubscriptionStatus, clearSubscriptionStatusCache } = await import('./utils/subscription');
      clearSubscriptionStatusCache(userId);
      const status = await getSubscriptionStatus(userId, true);
      setSubscriptionStatus(status);
      if (status?.isActive || status?.isLifetime) {
        setCurrentPage((page) => (page === 'subscription' || page === 'checkout' || page === 'cart' ? 'home' : page));
      }
    } catch (err) {
      console.error('Error refreshing subscription after coupon:', err);
      throw err;
    }
  }, []);

  // Payment link success redirect: we're in a popup; show closing message (postMessage already sent in usePaymentSuccessPopup)
  if (isPaymentSuccessPopup) {
    return (
      <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <div>Payment successful.</div>
        <div style={{ fontSize: '0.9rem', color: '#666' }}>Closing window...</div>
        <button type="button" onClick={() => window.close()} style={{ marginTop: '1rem', padding: '10px 20px', cursor: 'pointer', fontSize: '1rem' }}>
          Close this window
        </button>
      </div>
    );
  }

  // Show loading state while checking authentication (with fallback)
  if (isLoadingAuth) {
    return (
      <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div>Loading...</div>
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          Initializing application...
        </div>
      </div>
    );
  }

  const handleResetPasswordSuccess = async () => {
    setShowResetPassword(false);
    const user = await getCurrentUser(true);
    if (user) {
      setCurrentUser(user);
      setCurrentPage('list');
    } else {
      setShowLogin(true);
      setCurrentPage('list');
    }
  };

  if (showResetPassword) {
    return (
      <div className="App">
        <SiteBanner onLogoClick={() => {
          setShowResetPassword(false);
          setCurrentPage('home');
        }} />
        <ResetPassword onSuccess={handleResetPasswordSuccess} />
      </div>
    );
  }

  // Render social media icons page separately (full screen without container) - public access
  if (currentPage === 'icons') {
    return <SocialMediaIconsPage uuid={uuid} />;
  }

  if (currentPage === 'admin-profiles') {
    return (
      <div className="App">
        <SiteBanner compact onLogoClick={() => setCurrentPage('home')} />
        {currentUser?.isAdmin ? (
          <AdminProfiles onBack={() => setCurrentPage('home')} />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Admin access required.</p>
            <button type="button" onClick={() => setCurrentPage('home')}>Go home</button>
          </div>
        )}
      </div>
    );
  }

  if (currentPage === 'admin-coupons') {
    return (
      <div className="App">
        <SiteBanner compact onLogoClick={() => setCurrentPage('home')} />
        {currentUser?.isAdmin ? (
          <AdminCoupons onBack={() => setCurrentPage('home')} />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Admin access required.</p>
            <button type="button" onClick={() => setCurrentPage('home')}>Go home</button>
          </div>
        )}
      </div>
    );
  }

  if (currentPage === 'contact') {
    return (
      <div className="App">
        <SiteBanner compact onLogoClick={() => setCurrentPage('home')} />
        <ContactUs
          currentUser={currentUser}
          onBack={() => setCurrentPage('home')}
        />
      </div>
    );
  }

  // Render home page - public access (no authentication required)
  // Note: User session is preserved when navigating to home
  // Check home page FIRST before checking protected pages to ensure navigation works
  if (currentPage === 'home') {
    console.log('🏠 Rendering home page');
    console.log('👤 Current user state:', currentUser ? `Logged in as ${currentUser.email}` : 'Not logged in');
    console.log('📄 Current page state:', currentPage);
    const handleShowLogin = () => {
      console.log('🔐 Login button clicked from home page');
      setShowLogin(true);
      setCurrentPage('list'); // Set to list so login shows for protected page
    };
    const handleViewProfiles = () => {
      if (isTrialEnded) {
        setCurrentPage('subscription');
        return;
      }
      setCurrentPage('list');
    };
    const handleCreateProfile = () => {
      if (isTrialEnded) {
        setCurrentPage('subscription');
        return;
      }
      setEditingEntity(null);
      setCurrentPage('register');
    };
    const handleViewDashboardFromHome = (entity) => {
      if (isTrialEnded) {
        setCurrentPage('subscription');
        return;
      }
      if (entity) {
        setSelectedEntity(entity);
        setCurrentPage('dashboard');
      } else {
        setCurrentPage('list');
      }
    };
    const handleViewSubscription = () => {
      setCurrentPage('subscription');
    };
    const handleAdminCoupons = () => {
      setCurrentPage('admin-coupons');
    };
    const handleAdminProfiles = () => {
      setCurrentPage('admin-profiles');
    };
    return (
      <Home 
        onGetStarted={handleGetStarted} 
        onLogin={handleShowLogin} 
        currentUser={currentUser}
        onViewProfiles={handleViewProfiles}
        onCreateProfile={handleCreateProfile}
        onViewDashboard={handleViewDashboardFromHome}
        onViewSubscription={handleViewSubscription}
        onAdminCoupons={currentUser?.isAdmin ? handleAdminCoupons : undefined}
        onAdminProfiles={currentUser?.isAdmin ? handleAdminProfiles : undefined}
        onContact={() => setCurrentPage('contact')}
        onLogout={handleLogout}
        entities={entities}
        subscriptionStatus={subscriptionStatus}
      />
    );
  }

  const handleLoginCancel = () => {
    setShowLogin(false);
    setCurrentPage('home');
  };

  // Show login screen if not authenticated (for protected pages like list, register, view, dashboard, subscription)
  const protectedPages = ['list', 'register', 'view', 'dashboard', 'subscription', 'admin-coupons', 'admin-profiles'];
  if (!currentUser && protectedPages.includes(currentPage)) {
    return (
      <div className="App">
        <SiteBanner onLogoClick={() => setCurrentPage('home')} />
        <Login onLoginSuccess={handleLoginSuccess} onCancel={handleLoginCancel} />
      </div>
    );
  }
  
  // Also show login if explicitly requested (but not if user is logged in and on home page)
  // Don't show login if user just logged in (to prevent showing login screen after successful login)
  if (showLogin && currentPage !== 'icons' && currentPage !== 'home' && !currentUser && !isLoadingAuth) {
    return (
      <div className="App">
        <SiteBanner onLogoClick={() => setCurrentPage('home')} />
        <Login onLoginSuccess={handleLoginSuccess} onCancel={handleLoginCancel} />
      </div>
    );
  }

  return (
    <div className="App">
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Archive Profile"
        message={`Are you sure you want to archive "${entityToDelete?.entityName || 'this profile'}"? The profile will be hidden but not deleted.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        type="warning"
        onConfirm={confirmDeactivate}
        onCancel={cancelDeactivate}
      />
      <ConfirmDialog
        isOpen={showPermanentDeleteDialog}
        title="Permanently Delete Profile"
        message={`Are you sure you want to permanently delete "${entityToPermanentlyDelete?.entityName || 'this profile'}"? This action cannot be undone. All data including analytics will be permanently removed.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmPermanentDelete}
        onCancel={cancelPermanentDelete}
      />
      <SiteBanner compact onLogoClick={() => setCurrentPage('home')} />
      <div className="container">
        <nav className="app-nav">
          <button
            onClick={() => {
              console.log('🏠 Home button clicked');
              console.log('👤 User session before navigation:', currentUser ? `Logged in as ${currentUser.email}` : 'Not logged in');
              setCurrentPage('home');
              // User session is preserved - just changing the page
            }}
            className={`nav-button ${currentPage === 'home' ? 'active' : ''}`}
          >
            Home
          </button>
          <button
            onClick={handleBackToList}
            className={`nav-button ${currentPage === 'list' ? 'active' : ''}`}
          >
            Profiles
          </button>
          <button
            onClick={handleRegisterNew}
            className={`nav-button ${currentPage === 'register' ? 'active' : ''}`}
          >
            {editingEntity ? 'Edit Profile' : 'Create Profile'}
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage('cart')}
            className={`nav-button ${currentPage === 'cart' ? 'active' : ''}`}
            title="Cart"
          >
            Cart {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage('contact')}
            className={`nav-button ${currentPage === 'contact' ? 'active' : ''}`}
          >
            Contact
          </button>
          {currentUser?.isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setCurrentPage('admin-profiles')}
                className={`nav-button ${currentPage === 'admin-profiles' ? 'active' : ''}`}
              >
                All Profiles
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('admin-coupons')}
                className={`nav-button ${currentPage === 'admin-coupons' ? 'active' : ''}`}
              >
                Coupons
              </button>
            </>
          )}
          {currentUser && (
            <button
              type="button"
              onClick={handleLogout}
              className="nav-button"
              style={{ marginLeft: 'auto' }}
            >
              Logout ({currentUser.name || currentUser.username || currentUser.email?.split('@')[0] || 'User'})
            </button>
          )}
        </nav>

        {currentPage === 'list' && (
          <>
            <h1 className="app-title">Speak your heart online</h1>
            <p className="app-subtitle">
              View and manage your profiles
            </p>
            <EntityList
              entities={entities}
              onViewEntity={handleViewEntity}
              onEditEntity={handleEditEntity}
              onDeleteEntity={handleDeleteEntity}
              onReactivateEntity={handleReactivateEntity}
              onPermanentDeleteEntity={handlePermanentDeleteEntity}
            />
          </>
        )}

        {currentPage === 'register' && (
          <>
            <h1 className="app-title">
              {editingEntity ? 'Edit Profile' : 'Create Your Profile'}
            </h1>
            <p className="app-subtitle">
              {editingEntity
                ? 'Update your profile information'
                : 'Share your story and connect with your audience through social media'}
            </p>
            <RegistrationForm
              entity={editingEntity}
              onSave={handleEntitySaved}
              onCancel={handleBackToList}
              currentUser={currentUser}
              onLogout={handleLogout}
            />
          </>
        )}

            {currentPage === 'view' && (
              <>
                {selectedEntity && (
                  <EntityView
                    entity={selectedEntity}
                    onBack={handleBackToList}
                    onEdit={(entity) => handleEditEntity(entity)}
                    onDelete={handleDeleteEntity}
                    onPermanentDelete={handlePermanentDeleteEntity}
                    onViewDashboard={handleViewDashboard}
                    onLogout={handleLogout}
                    currentUser={currentUser}
                  />
                )}
              </>
            )}

            {currentPage === 'dashboard' && (
              <>
                {selectedEntity && (
                  <ProfileDashboard
                    entityId={selectedEntity.id}
                    onBack={() => {
                      setCurrentPage('view');
                    }}
                    onLogout={handleLogout}
                    currentUser={currentUser}
                  />
                )}
              </>
            )}

            {currentPage === 'subscription' && (
                <Subscription
                  onBack={() => setCurrentPage('home')}
                  onNavigateToCart={() => setCurrentPage('cart')}
                  currentUser={currentUser}
                  parentSubscriptionStatus={subscriptionStatus}
                  onLogout={handleLogout}
                  onSubscriptionSuccess={() => {
                    // Refresh subscription status and redirect to home
                    const refreshStatus = async () => {
                      try {
                        const { getSubscriptionStatus, clearSubscriptionStatusCache } = await import('./utils/subscription');
                        clearSubscriptionStatusCache(currentUser.id); // Clear cache before fetching
                        const status = await getSubscriptionStatus(currentUser.id, true); // Force refresh
                        setSubscriptionStatus(status);
                      } catch (err) {
                        console.error('Error refreshing subscription status:', err);
                      }
                    };
                    refreshStatus();
                    setCurrentPage('home');
                  }}
                />
            )}

            {currentPage === 'cart' && (
              <Cart
                onCheckout={() => setCurrentPage('checkout')}
                onBack={() => setCurrentPage('list')}
              />
            )}

            {currentPage === 'checkout' && (
              <Checkout
                currentUser={currentUser}
                onSubscriptionPaid={handleSubscriptionPaid}
                onCouponApplied={handleCouponApplied}
                onSuccess={() => setCurrentPage('home')}
                onBack={() => setCurrentPage('cart')}
              />
            )}
      </div>
    </div>
  );
}

export default App;

