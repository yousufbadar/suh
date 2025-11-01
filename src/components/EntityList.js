import React, { useState, useEffect } from 'react';
import './EntityList.css';
import { FaSearch, FaTrash, FaEdit, FaArchive, FaRedo } from 'react-icons/fa';

function EntityList({ entities, onViewEntity, onEditEntity, onDeleteEntity, onReactivateEntity }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filteredEntities, setFilteredEntities] = useState(entities);

  useEffect(() => {
    let filtered = entities;
    
    // Filter by active/archived status (archived entities should be visible)
    // When showArchived is false, show all entities (both active and archived)
    // When showArchived is true, show only archived entities
    if (showArchived) {
      filtered = filtered.filter((entity) => entity.active === false);
    }
    // Otherwise show all entities (both active and archived together)
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter((entity) =>
        entity.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredEntities(filtered);
  }, [searchTerm, entities, showArchived]);

  // Check if there are any entities at all (active or archived)
  const hasAnyEntities = entities.length > 0;
  
  if (!hasAnyEntities) {
    return (
      <div className="entity-list-empty">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>No Profiles Yet</h2>
          <p>Start by creating your first profile</p>
        </div>
      </div>
    );
  }
  
  // Show message when filtered results are empty but entities exist
  if (filteredEntities.length === 0 && hasAnyEntities) {
    return (
      <div className="entity-list">
        <div className="entity-list-header">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="entity-list-controls">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`archive-toggle-button ${showArchived ? 'active' : ''}`}
              title={showArchived ? 'Show Active Entities' : 'Show Archived Entities'}
            >
              <FaArchive /> {showArchived ? 'Show Active' : 'Show Archived'}
            </button>
            <div className="entity-count">
              0 entities
            </div>
          </div>
        </div>
        <div className="entity-list-empty">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h2>
              {showArchived ? 'No Archived Profiles' : 'No Active Profiles'}
            </h2>
            <p>
              {showArchived 
                ? 'There are no archived profiles at this time.'
                : searchTerm
                ? `No profiles found matching "${searchTerm}"`
                : 'All profiles are currently archived.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="entity-list">
      <div className="entity-list-header">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search profiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="entity-list-controls">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`archive-toggle-button ${showArchived ? 'active' : ''}`}
            title={showArchived ? 'Show All Entities' : 'Show Only Archived'}
          >
            <FaArchive /> {showArchived ? 'Show All' : 'Archived Only'}
          </button>
          <div className="entity-count">
            {filteredEntities.length} {filteredEntities.length === 1 ? 'profile' : 'profiles'}
          </div>
        </div>
      </div>

      <div className="entities-grid">
        {filteredEntities.map((entity) => (
          <div key={entity.id} className="entity-card-preview">
            <div className="entity-card-header">
              <h3 className={`entity-card-name ${entity.active === false ? 'archived' : ''}`}>
                {entity.entityName}
                {entity.active === false && (
                  <span className="archived-badge">Archived</span>
                )}
              </h3>
              <div className="entity-card-actions">
                {entity.active !== false ? (
                  <>
                    <button
                      onClick={() => onEditEntity(entity)}
                      className="icon-button edit-icon"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => onDeleteEntity(entity.id)}
                      className="icon-button delete-icon"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onReactivateEntity && onReactivateEntity(entity.id)}
                    className="icon-button reactivate-icon"
                    title="Reactivate"
                  >
                    <FaRedo />
                  </button>
                )}
              </div>
            </div>

            {entity.description && (
              <p className="entity-card-description">
                {entity.description.length > 100
                  ? `${entity.description.substring(0, 100)}...`
                  : entity.description}
              </p>
            )}

            <div className="entity-card-info">
              {entity.email && (
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{entity.email}</span>
                </div>
              )}
              {(entity.city || entity.country) && (
                <div className="info-item">
                  <span className="info-label">Location:</span>
                  <span className="info-value">
                    {[entity.city, entity.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {entity.socialMedia && Object.keys(entity.socialMedia).length > 0 && (
                <div className="info-item">
                  <span className="info-label">Social Links:</span>
                  <span className="info-value">
                    {Object.keys(entity.socialMedia).length} platform(s)
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => onViewEntity(entity)}
              className="view-button"
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EntityList;

