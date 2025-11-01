import React, { useState, useEffect } from 'react';
import './App.css';
import Home from './components/Home';
import RegistrationForm from './components/RegistrationForm';
import EntityList from './components/EntityList';
import EntityView from './components/EntityView';
import SocialMediaIconsPage from './components/SocialMediaIconsPage';
import ConfirmDialog from './components/ConfirmDialog';
import { getEntities, deactivateEntity, reactivateEntity } from './utils/storage';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'list', 'register', 'view', 'edit', 'icons'
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);

  useEffect(() => {
    loadEntities();
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

  const loadEntities = () => {
    const loadedEntities = getEntities(); // Get all entities (archived are visible)
    setEntities(loadedEntities);
  };

  const handleViewEntity = (entity) => {
    setSelectedEntity(entity);
    setCurrentPage('view');
  };

  const handleEditEntity = (entity) => {
    setEditingEntity(entity);
    setCurrentPage('register');
  };

  const handleDeleteEntity = (id) => {
    const entity = entities.find((e) => e.id === id);
    setEntityToDelete(entity);
    setShowConfirmDialog(true);
  };

  const confirmDeactivate = () => {
    if (entityToDelete) {
      deactivateEntity(entityToDelete.id);
      loadEntities();
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
    loadEntities();
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

  // Render social media icons page separately (full screen without container)
  if (currentPage === 'icons') {
    return <SocialMediaIconsPage uuid={uuid} />;
  }

  // Render home page
  if (currentPage === 'home') {
    return <Home onGetStarted={handleGetStarted} />;
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
            <p className="app-subtitle">View and manage your profiles</p>
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
                <EntityView
                  entity={selectedEntity}
                  onBack={handleBackToList}
                  onEdit={(entity) => handleEditEntity(entity)}
                  onDelete={handleDeleteEntity}
                />
              </>
            )}
      </div>
    </div>
  );
}

export default App;

