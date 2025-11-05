import React, { useState, useEffect } from 'react';
import './App.css';
import Home from './components/Home';
import RegistrationForm from './components/RegistrationForm';
import EntityList from './components/EntityList';
import EntityView from './components/EntityView';
import SocialMediaIconsPage from './components/SocialMediaIconsPage';
import ProfileDashboard from './components/ProfileDashboard';
import ConfirmDialog from './components/ConfirmDialog';
import ThemeSelector from './components/ThemeSelector';
import { getEntities, deactivateEntity, reactivateEntity } from './utils/storage';
import { getTheme, saveTheme, applyTheme } from './utils/theme';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'list', 'register', 'view', 'edit', 'icons', 'dashboard'
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  useEffect(() => {
    // Apply theme on mount
    applyTheme(currentTheme);
  }, [currentTheme]);

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
    
    // Load all entities (no authentication required) - don't block rendering
    // Use setTimeout to ensure this doesn't block initial render
    setTimeout(() => {
      loadEntities().catch(error => {
        console.error('Error loading entities:', error);
        // Don't prevent app from rendering if entities fail to load
        setEntities([]); // Set empty array on error
      });
    }, 0);
  }, []); // Run only once on mount

  const loadEntities = async () => {
    try {
      const loadedEntities = await getEntities(); // Get all entities
      setEntities(loadedEntities);
    } catch (error) {
      console.error('Error loading entities:', error);
      setEntities([]);
    }
  };


  const handleViewEntity = (entity) => {
    setSelectedEntity(entity);
    setCurrentPage('view');
  };

  const handleViewDashboard = (entity) => {
    setSelectedEntity(entity);
    setCurrentPage('dashboard');
  };

  const handleEditEntity = (entity) => {
    // No authentication required - anyone can edit
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
        await deactivateEntity(entityToDelete.id);
        await loadEntities();
        if (selectedEntity?.id === entityToDelete.id) {
          setSelectedEntity(null);
          setCurrentPage('list');
        }
      } catch (error) {
        console.error('Error deactivating entity:', error);
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
      await reactivateEntity(id);
      await loadEntities();
    } catch (error) {
      console.error('Error reactivating entity:', error);
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
    setCurrentPage('list');
  };

  const handleEntitySaved = () => {
    loadEntities();
    setEditingEntity(null);
    setCurrentPage('list');
  };

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId);
    saveTheme(themeId);
    applyTheme(themeId);
  };

  // Render social media icons page separately (full screen without container)
  if (currentPage === 'icons') {
    return <SocialMediaIconsPage uuid={uuid} />;
  }

  // Render home page
  if (currentPage === 'home') {
    console.log('Rendering home page');
    return <Home onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="App">
      <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
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
          <button
            onClick={handleRegisterNew}
            className={`nav-button ${currentPage === 'register' ? 'active' : ''}`}
          >
            {editingEntity ? 'Edit Profile' : 'Create Profile'}
          </button>
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
                  />
                )}
              </>
            )}
      </div>
    </div>
  );
}

export default App;

