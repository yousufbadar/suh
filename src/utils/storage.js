// Utility functions for managing entities in localStorage

const STORAGE_KEY = 'registeredEntities';

// Generate UUID using crypto.randomUUID() or fallback
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const saveEntity = (entity, userId = null) => {
  const entities = getEntities(); // Get all entities
  
  const newEntity = {
    ...entity,
    id: entity.id || Date.now().toString(),
    // Generate UUID for new entities or preserve existing UUID
    uuid: entity.uuid || generateUUID(),
    userId: userId || 'anonymous', // Use anonymous if no user
    active: entity.active !== undefined ? entity.active : true, // Default to active
    createdAt: entity.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const existingIndex = entities.findIndex((e) => e.id === newEntity.id);
  
  if (existingIndex >= 0) {
    // Update existing entity - preserve UUID if it exists
    if (!entities[existingIndex].uuid) {
      entities[existingIndex].uuid = generateUUID();
    }
    entities[existingIndex] = {
      ...entities[existingIndex],
      ...newEntity,
      uuid: entities[existingIndex].uuid || newEntity.uuid, // Preserve existing UUID
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
    return entities[existingIndex];
  } else {
    // Add new entity with UUID
    entities.push(newEntity);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
    return newEntity;
  }
};

export const getEntities = (userId = null) => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const entities = data ? JSON.parse(data) : [];
    
    // Return all entities (no user filtering)
    return entities;
  } catch (error) {
    console.error('Error reading entities from storage:', error);
    return [];
  }
};

export const getEntityById = (id, userId = null) => {
  const entities = getEntities(userId);
  return entities.find((e) => e.id === id);
};

export const getEntityByUUID = (uuid) => {
  const entities = getEntities();
  return entities.find((e) => e.uuid === uuid);
};

export const deleteEntity = (id) => {
  const entities = getEntities(); // Get all entities
  const filtered = entities.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
};

// Deactivate entity instead of deleting
export const deactivateEntity = (id) => {
  const entities = getEntities(); // Get all entities
  const entityIndex = entities.findIndex((e) => e.id === id);
  
  if (entityIndex >= 0) {
    entities[entityIndex] = {
      ...entities[entityIndex],
      active: false,
      deactivatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
    return entities;
  }
  return entities;
};

// Reactivate entity
export const reactivateEntity = (id) => {
  const entities = getEntities(); // Get all entities
  const entityIndex = entities.findIndex((e) => e.id === id);
  
  if (entityIndex >= 0) {
    entities[entityIndex] = {
      ...entities[entityIndex],
      active: true,
      reactivatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
    return entities;
  }
  return entities;
};

export const clearEntities = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Track QR code scan
export const trackQRScan = (uuid) => {
  const entity = getEntityByUUID(uuid);
  if (!entity) return;
  
  // Don't track if entity is archived/inactive
  if (entity.active === false) return;

  const entities = getEntities(); // Get all entities for tracking
  const entityIndex = entities.findIndex((e) => e.uuid === uuid);

  if (entityIndex >= 0) {
    entities[entityIndex] = {
      ...entities[entityIndex],
      qrScans: (entities[entityIndex].qrScans || 0) + 1,
      lastScannedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
  }
};

// Track social media click
export const trackSocialClick = (entityId, platform) => {
  const entity = getEntityById(entityId); // No userId filter for tracking
  if (!entity) return;
  
  // Don't track if entity is archived/inactive
  if (entity.active === false) return;

  const entities = getEntities(); // Get all entities for tracking
  const entityIndex = entities.findIndex((e) => e.id === entityId);

  if (entityIndex >= 0) {
    const currentClicks = entities[entityIndex].socialClicks || {};
    entities[entityIndex] = {
      ...entities[entityIndex],
      socialClicks: {
        ...currentClicks,
        [platform]: (currentClicks[platform] || 0) + 1,
      },
      lastClickedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
  }
};

