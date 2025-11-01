import React, { useState, useEffect } from 'react';
import './App.css';
import Home from './components/Home';
import Login from './components/Login';
import RegistrationForm from './components/RegistrationForm';
import EntityList from './components/EntityList';
import EntityView from './components/EntityView';
import SocialMediaIconsPage from './components/SocialMediaIconsPage';
import ConfirmDialog from './components/ConfirmDialog';
import { getEntities, deactivateEntity, reactivateEntity } from './utils/storage';
import { getCurrentUser, logoutUser, isAuthenticated } from './utils/auth';
import { FaSignOutAlt, FaUser, FaSignInAlt } from 'react-icons/fa';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'list', 'register', 'view', 'edit', 'icons'
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Check authentication
    const user = getCurrentUser();
    setCurrentUser(user);
    
    loadEntities(user?.id);
    
    // Check URL for UUID parameter
    const urlParams = new URLSearchParams(window.location.search);
    const uuidParam = urlParams.get('uuid');
    if (uuidParam) {
      setUuid(uuidParam);
      setCurrentPage('icons');
      return; // Don't show home page if UUID is in URL
    }
    // Default to home page if no UUID
    if (currentPage === 'home') {
      return;
    }
  }, []);

  const loadEntities = (userId = null) => {
    const loadedEntities = getEntities(userId); // Get entities for current user
    setEntities(loadedEntities);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setShowLogin(false);
    loadEntities(user.id);
    // Redirect to list page after login
    if (currentPage === 'home' || !isAuthenticated()) {
      setCurrentPage('list');
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setEntities([]);
    setCurrentPage('home');
  };

  const handleViewEntity = (entity) => {
    setSelectedEntity(entity);
    setCurrentPage('view');
  };

  const handleEditEntity = (entity) => {
    // Check if user owns this entity
    if (!currentUser) {
      setShowLogin(true);
      return;
    }
    if (entity.userId !== currentUser.id) {
      alert('You can only edit your own profiles');
      return;
    }
    setEditingEntity(entity);
    setCurrentPage('register');
  };

  const handleDeleteEntity = (id) => {
    if (!currentUser) {
      setShowLogin(true);
      return;
    }
    const entity = entities.find((e) => e.id === id);
    // Check if user owns this entity
    if (entity && entity.userId !== currentUser.id) {
      alert('You can only delete your own profiles');
      return;
    }
    setEntityToDelete(entity);
    setShowConfirmDialog(true);
  };

  const confirmDeactivate = () => {
    if (entityToDelete) {
      deactivateEntity(entityToDelete.id);
      loadEntities(currentUser?.id);
      if (selectedEntity?.id === entityToDelete.id) {
        setSelectedEntity(null);
        setCurrentPage('list');
      }
    }
    setShowConfirmDialog(false);
    setEntityToDelete(null);
  };

  const cancelDeactivate = () => {
    setShowConfirmDialog(false);
    setEntityToDelete(null);
  };

  const handleReactivateEntity = (id) => {
    reactivateEntity(id);
    loadEntities(currentUser?.id);
  };

  const handleRegisterNew = () => {
    if (!currentUser) {
      setShowLogin(true);
      return;
    }
    setEditingEntity(null);
    setCurrentPage('register');
  };

  const handleBackToList = () => {
    setSelectedEntity(null);
    setEditingEntity(null);
    if (currentUser) {
      setCurrentPage('list');
    } else {
      setCurrentPage('home');
    }
  };

  const handleGetStarted = () => {
    if (currentUser) {
      setCurrentPage('list');
    } else {
      setShowLogin(true);
    }
  };

  const handleEntitySaved = () => {
    loadEntities(currentUser?.id);
    setEditingEntity(null);
    setCurrentPage('list');
  };

  // Render social media icons page separately (full screen without container)
  if (currentPage === 'icons') {
    return <SocialMediaIconsPage uuid={uuid} />;
  }

  // Render home page
  if (currentPage === 'home') {
    return (
      <>
        {showLogin && (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onClose={() => setShowLogin(false)}
          />
        )}
        <Home onGetStarted={handleGetStarted} />
      </>
    );
  }

  return (
    <div className="App">
      {showLogin && (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          onClose={() => setShowLogin(false)}
        />
      )}
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
            onClick={() => setCurrentPage('home')}
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
          {currentUser ? (
            <>
              <button
                onClick={handleRegisterNew}
                className={`nav-button ${currentPage === 'register' ? 'active' : ''}`}
              >
                {editingEntity ? 'Edit Profile' : 'Create Profile'}
              </button>
              <div className="user-info">
                <span className="username">
                  <FaUser /> {currentUser.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="logout-button"
                  title="Logout"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="nav-button login-button-nav"
            >
              <FaSignInAlt /> Sign In
            </button>
          )}
        </nav>

        {currentPage === 'list' && (
          <>
            <h1 className="app-title">Speak your heart online</h1>
            <p className="app-subtitle">
              {currentUser 
                ? `Welcome back, ${currentUser.username}! View and manage your profiles`
                : 'View and manage your profiles'}
            </p>
            {!currentUser ? (
              <div className="auth-prompt">
                <p>Please sign in to view and manage your profiles</p>
                <button onClick={() => setShowLogin(true)} className="auth-prompt-button">
                  <FaSignInAlt /> Sign In
                </button>
              </div>
            ) : (
              <EntityList
                entities={entities}
                onViewEntity={handleViewEntity}
                onEditEntity={handleEditEntity}
                onDeleteEntity={handleDeleteEntity}
                onReactivateEntity={handleReactivateEntity}
              />
            )}
          </>
        )}

        {currentPage === 'register' && (
          <>
            {currentUser ? (
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
                />
              </>
            ) : (
              <div className="auth-required">
                <h2>Authentication Required</h2>
                <p>Please sign in to create or edit profiles</p>
                <button onClick={() => setShowLogin(true)} className="auth-prompt-button">
                  <FaSignInAlt /> Sign In
                </button>
              </div>
            )}
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
                    currentUser={currentUser}
                  />
                )}
              </>
            )}
      </div>
    </div>
  );
}

export default App;

