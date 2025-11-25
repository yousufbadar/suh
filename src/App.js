import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Home from './components/Home';
import Login from './components/Login';
import RegistrationForm from './components/RegistrationForm';
import EntityList from './components/EntityList';
import EntityView from './components/EntityView';
import SocialMediaIconsPage from './components/SocialMediaIconsPage';
import ProfileDashboard from './components/ProfileDashboard';
import ConfirmDialog from './components/ConfirmDialog';
import Subscription from './components/Subscription';
import { getEntities, deactivateEntity, reactivateEntity } from './utils/storage';
import { getTheme, applyTheme } from './utils/theme';
import { supabase, isClientValid, testConnection } from './lib/supabase';
import { getCurrentUser, logoutUser } from './utils/auth';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'list', 'register', 'view', 'edit', 'icons', 'dashboard', 'subscription'
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

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
  const loadEntities = useCallback(async () => {
    try {
      // Only load entities for the current user if logged in
      const userId = currentUser?.id || null;
      console.log('📋 Loading entities for user:', userId || 'anonymous');
      console.log('📋 Current user object:', currentUser);
      const loadedEntities = await getEntities(userId);
      setEntities(loadedEntities);
      console.log(`✅ Loaded ${loadedEntities.length} profile(s)`);
      
      // Debug: If user is logged in but has no profiles, check if there are any profiles at all
      if (userId && loadedEntities.length === 0) {
        console.warn('⚠️  User is logged in but has no profiles. Checking if any anonymous profiles exist...');
        const allEntities = await getEntities(null);
        console.log(`ℹ️  Total profiles in database: ${allEntities.length}`);
        
        // Check if there are anonymous profiles that should be migrated
        const anonymousProfiles = allEntities.filter(e => e.userId === 'anonymous');
        if (anonymousProfiles.length > 0) {
          console.log(`🔄 Found ${anonymousProfiles.length} anonymous profile(s). Attempting to migrate...`);
          const { migrateAnonymousProfilesToUser } = await import('./utils/storage');
          const result = await migrateAnonymousProfilesToUser(userId);
          if (result.migrated > 0) {
            console.log(`✅ Migrated ${result.migrated} profile(s) to current user. Reloading...`);
            // Reload entities after migration
            const reloadedEntities = await getEntities(userId);
            setEntities(reloadedEntities);
            console.log(`✅ Now showing ${reloadedEntities.length} profile(s)`);
            return; // Exit early since we've already set entities
          }
        } else {
          console.log('ℹ️  No anonymous profiles found. User needs to create new profiles.');
        }
      }
    } catch (error) {
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

        // Initial auth check
        await checkAuth();
        
        // Listen for auth changes
        try {
          const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (!isMounted) return;
              
              try {
                console.log('🔐 Auth state changed:', event, session ? 'Session exists' : 'No session');
                clearTimeout(safetyTimeout); // Clear safety timeout once auth state is determined
                
                if (session) {
                  console.log('✅ Session found, getting user...');
                  // Only force refresh on SIGNED_IN event, otherwise use cache (max once per minute)
                  const user = await getCurrentUser(event === 'SIGNED_IN');
                  if (user) {
                    console.log('✅ User retrieved:', user.email);
                    // If user just logged in (SIGNED_IN event), navigate to home
                    if (event === 'SIGNED_IN') {
                      setCurrentPage('home');
                    }
                    setCurrentUser(user);
                    setShowLogin(false);
                    // Load entities when user logs in
                    // loadEntities will be called automatically by the useEffect that depends on currentUser
                  } else {
                    console.warn('⚠️  Session exists but could not get user');
                    setCurrentUser(null);
                    setShowLogin(false);
                  }
                } else {
                  console.log('ℹ️  No session, user logged out');
                  setCurrentUser(null);
                  // Don't show login on public pages - let the render logic handle it
                  setShowLogin(false);
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
    
    // Load all entities only if authenticated
    if (currentUser) {
      setTimeout(() => {
        loadEntities().catch(error => {
          console.error('Error loading entities:', error);
          setEntities([]);
        });
      }, 0);
    }
  }, [currentUser, loadEntities]); // Run when currentUser or loadEntities changes

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

      // Set navigation and user state immediately (synchronously) for instant feedback
      setCurrentPage('home');
      setShowLogin(false);
      setCurrentUser(user);
      
      console.log('✅ Navigation and user state updated immediately');

      // Verify session exists (non-blocking)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          console.warn('⚠️  Login success but no session found, waiting for auth state change...');
        } else {
          console.log('✅ Session verified in login success handler');
        }
      }).catch(err => {
        console.error('❌ Error verifying session:', err);
      });
      
      // Load entities asynchronously (don't block navigation)
      loadEntities().catch(err => {
        console.error('❌ Error loading entities after login:', err);
        // Don't throw - navigation should still work even if entities fail to load
      });
      
      console.log('✅ Login flow completed successfully, navigated to home page');
    } catch (error) {
      console.error('❌ Error in handleLoginSuccess:', error);
      // Still set the user if we have it, but log the error
      if (user) {
        // Ensure navigation happens even on error
        setCurrentPage('home');
        setShowLogin(false);
        setCurrentUser(user);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setShowLogin(true);
      setEntities([]);
      setCurrentPage('home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };


  const handleViewEntity = async (entity) => {
    // Verify entity belongs to current user if logged in
    if (currentUser && entity.userId !== currentUser.id) {
      console.warn('⚠️  Attempted to view entity that does not belong to current user');
      alert('You do not have permission to view this profile.');
      return;
    }
    setSelectedEntity(entity);
    setCurrentPage('view');
  };

  const handleViewDashboard = (entity) => {
    setSelectedEntity(entity);
    setCurrentPage('dashboard');
  };

  const handleEditEntity = async (entity) => {
    // Verify entity belongs to current user if logged in
    if (currentUser && entity.userId !== currentUser.id) {
      console.warn('⚠️  Attempted to edit entity that does not belong to current user');
      alert('You do not have permission to edit this profile.');
      return;
    }
    setEditingEntity(entity);
    setCurrentPage('register');
  };

  const handleDeleteEntity = (id) => {
    // No authentication required - anyone can delete
    const entity = entities.find((e) => e.id === id);
    setEntityToDelete(entity);
    setShowConfirmDialog(true);
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
    setEditingEntity(null);
    setCurrentPage('register');
  };

  const handleBackToList = () => {
    setSelectedEntity(null);
    setEditingEntity(null);
    setCurrentPage('list');
  };

  const handleGetStarted = () => {
    // Check if authenticated before going to list
    if (currentUser) {
      setCurrentPage('list');
    } else {
      // Show login if not authenticated
      setShowLogin(true);
      setCurrentPage('list');
    }
  };

  const handleEntitySaved = () => {
    loadEntities();
    setEditingEntity(null);
    setCurrentPage('list');
  };


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

  // Render social media icons page separately (full screen without container) - public access
  if (currentPage === 'icons') {
    return <SocialMediaIconsPage uuid={uuid} />;
  }

  // Render home page - public access (no authentication required)
  // Note: User session is preserved when navigating to home
  if (currentPage === 'home') {
    console.log('🏠 Rendering home page');
    console.log('👤 Current user state:', currentUser ? `Logged in as ${currentUser.email}` : 'Not logged in');
    const handleShowLogin = () => {
      console.log('🔐 Login button clicked from home page');
      setShowLogin(true);
      setCurrentPage('list'); // Set to list so login shows for protected page
    };
    const handleViewProfiles = () => {
      setCurrentPage('list');
    };
    const handleCreateProfile = () => {
      setEditingEntity(null);
      setCurrentPage('register');
    };
    const handleViewDashboardFromHome = (entity) => {
      if (entity) {
        setSelectedEntity(entity);
        setCurrentPage('dashboard');
      } else {
        // If no entity provided, go to profiles list first
        setCurrentPage('list');
      }
    };
    const handleViewSubscription = () => {
      setCurrentPage('subscription');
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
        onLogout={handleLogout}
        entities={entities}
      />
    );
  }

  // Show login screen if not authenticated (for protected pages like list, register, view, dashboard, subscription)
  const protectedPages = ['list', 'register', 'view', 'dashboard', 'subscription'];
  if (!currentUser && protectedPages.includes(currentPage)) {
    return (
      <div className="App">
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }
  
  // Also show login if explicitly requested (but not if user is logged in and on home page)
  if (showLogin && currentPage !== 'icons' && currentPage !== 'home' && !currentUser) {
    return (
      <div className="App">
        <Login onLoginSuccess={handleLoginSuccess} />
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
          {currentUser && (
            <button
              onClick={handleLogout}
              className="nav-button"
              style={{ marginLeft: 'auto' }}
            >
              Logout ({currentUser.username || currentUser.name || currentUser.email?.split('@')[0] || 'User'})
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
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )}
      </div>
    </div>
  );
}

export default App;

