// Utility functions for managing entities in Supabase database

import { supabase } from '../lib/supabase';

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

// Helper function to convert database entity to app format
const mapEntityFromDB = (dbEntity) => {
  if (!dbEntity) return null;
  
  return {
    id: dbEntity.id,
    uuid: dbEntity.uuid,
    entityName: dbEntity.entity_name,
    description: dbEntity.description || '',
    email: dbEntity.email || '',
    website: dbEntity.website || '',
    phone: dbEntity.phone || '',
    address: dbEntity.address || '',
    city: dbEntity.city || '',
    country: dbEntity.country || '',
    contactPersonName: dbEntity.contact_person_name || '',
    contactPersonEmail: dbEntity.contact_person_email || '',
    contactPersonPhone: dbEntity.contact_person_phone || '',
    socialMedia: dbEntity.social_media || {},
    logo: dbEntity.logo || null,
    customLinks: dbEntity.custom_links || [],
    active: dbEntity.active !== undefined ? dbEntity.active : true,
    userId: dbEntity.user_id || 'anonymous',
    createdAt: dbEntity.created_at || new Date().toISOString(),
    updatedAt: dbEntity.updated_at || new Date().toISOString(),
    deactivatedAt: dbEntity.deactivated_at || null,
    reactivatedAt: dbEntity.reactivated_at || null,
  };
};

// Helper function to convert app entity to database format
const mapEntityToDB = (entity) => {
  return {
    id: entity.id,
    uuid: entity.uuid,
    entity_name: entity.entityName,
    description: entity.description || null,
    email: entity.email || null,
    website: entity.website || null,
    phone: entity.phone || null,
    address: entity.address || null,
    city: entity.city || null,
    country: entity.country || null,
    contact_person_name: entity.contactPersonName || null,
    contact_person_email: entity.contactPersonEmail || null,
    contact_person_phone: entity.contactPersonPhone || null,
    social_media: entity.socialMedia || {},
    logo: entity.logo || null,
    custom_links: entity.customLinks || [],
    active: entity.active !== undefined ? entity.active : true,
    user_id: entity.userId || 'anonymous',
  };
};

export const saveEntity = async (entity, userId = null) => {
  try {
    const entityId = entity.id || Date.now().toString();
    const entityUuid = entity.uuid || generateUUID();
    
    const newEntity = {
      ...entity,
      id: entityId,
      uuid: entityUuid,
      userId: userId || 'anonymous',
      active: entity.active !== undefined ? entity.active : true,
    };

    const dbEntity = mapEntityToDB(newEntity);

    // Check if entity exists
    const { data: existingEntity } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', entityId)
      .single();

    if (existingEntity) {
      // Update existing entity - preserve UUID if it exists
      if (!existingEntity.uuid) {
        dbEntity.uuid = entityUuid;
      } else {
        dbEntity.uuid = existingEntity.uuid; // Preserve existing UUID
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(dbEntity)
        .eq('id', entityId)
        .select()
        .single();

      if (error) throw error;
      return mapEntityFromDB(data);
    } else {
      // Insert new entity
      const { data, error } = await supabase
        .from('profiles')
        .insert(dbEntity)
        .select()
        .single();

      if (error) throw error;
      return mapEntityFromDB(data);
    }
  } catch (error) {
    console.error('Error saving entity:', error);
    throw error;
  }
};

export const getEntities = async (userId = null) => {
  try {
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      console.warn('Supabase not configured. Returning empty array.');
      return [];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data ? data.map(mapEntityFromDB) : [];
  } catch (error) {
    console.error('Error reading entities from database:', error);
    return [];
  }
};

export const getEntityById = async (id, userId = null) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapEntityFromDB(data);
  } catch (error) {
    console.error('Error getting entity by id:', error);
    return null;
  }
};

export const getEntityByUUID = async (uuid) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('uuid', uuid)
      .single();

    if (error) throw error;
    return mapEntityFromDB(data);
  } catch (error) {
    console.error('Error getting entity by uuid:', error);
    return null;
  }
};

export const deleteEntity = async (id) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return await getEntities();
  } catch (error) {
    console.error('Error deleting entity:', error);
    throw error;
  }
};

// Deactivate entity instead of deleting
export const deactivateEntity = async (id) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return await getEntities();
  } catch (error) {
    console.error('Error deactivating entity:', error);
    throw error;
  }
};

// Reactivate entity
export const reactivateEntity = async (id) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        active: true,
        reactivated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return await getEntities();
  } catch (error) {
    console.error('Error reactivating entity:', error);
    throw error;
  }
};

export const clearEntities = async () => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .neq('id', ''); // Delete all (be careful with this!)

    if (error) throw error;
  } catch (error) {
    console.error('Error clearing entities:', error);
    throw error;
  }
};

// Track QR code scan
export const trackQRScan = async (uuid) => {
  try {
    // Get entity by UUID
    const entity = await getEntityByUUID(uuid);
    if (!entity) return;
    
    // Don't track if entity is archived/inactive
    if (entity.active === false) return;

    // Insert QR scan record
    const { error } = await supabase
      .from('qr_scans')
      .insert({
        profile_uuid: uuid,
        scanned_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking QR scan:', error);
  }
};

// Track social media click
export const trackSocialClick = async (entityId, platform) => {
  try {
    // Get entity by ID
    const entity = await getEntityById(entityId);
    if (!entity) return;
    
    // Don't track if entity is archived/inactive
    if (entity.active === false) return;

    // Insert social click record
    const { error } = await supabase
      .from('social_clicks')
      .insert({
        profile_id: entityId,
        platform: platform,
        clicked_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking social click:', error);
  }
};

// Track custom link click
export const trackCustomLinkClick = async (entityId, customLinkIndex) => {
  try {
    // Get entity by ID
    const entity = await getEntityById(entityId);
    if (!entity) return;
    
    // Don't track if entity is archived/inactive
    if (entity.active === false) return;

    // Insert custom link click record
    const { error } = await supabase
      .from('custom_link_clicks')
      .insert({
        profile_id: entityId,
        link_index: customLinkIndex,
        clicked_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error tracking custom link click:', error);
  }
};

// Helper functions to get analytics data (for dashboard)
export const getQRScanTimestamps = async (uuid) => {
  try {
    const { data, error } = await supabase
      .from('qr_scans')
      .select('scanned_at')
      .eq('profile_uuid', uuid)
      .order('scanned_at', { ascending: true });

    if (error) throw error;
    return data.map(row => row.scanned_at);
  } catch (error) {
    console.error('Error getting QR scan timestamps:', error);
    return [];
  }
};

export const getSocialClickTimestamps = async (entityId) => {
  try {
    const { data, error } = await supabase
      .from('social_clicks')
      .select('platform, clicked_at')
      .eq('profile_id', entityId)
      .order('clicked_at', { ascending: true });

    if (error) throw error;
    
    // Group by platform
    const timestamps = {};
    data.forEach(row => {
      if (!timestamps[row.platform]) {
        timestamps[row.platform] = [];
      }
      timestamps[row.platform].push(row.clicked_at);
    });
    
    return timestamps;
  } catch (error) {
    console.error('Error getting social click timestamps:', error);
    return {};
  }
};

export const getCustomLinkClickTimestamps = async (entityId) => {
  try {
    const { data, error } = await supabase
      .from('custom_link_clicks')
      .select('link_index, clicked_at')
      .eq('profile_id', entityId)
      .order('clicked_at', { ascending: true });

    if (error) throw error;
    
    // Group by link index
    const timestamps = {};
    data.forEach(row => {
      const index = row.link_index.toString();
      if (!timestamps[index]) {
        timestamps[index] = [];
      }
      timestamps[index].push(row.clicked_at);
    });
    
    return timestamps;
  } catch (error) {
    console.error('Error getting custom link click timestamps:', error);
    return {};
  }
};

// Get entity with all analytics data
export const getEntityWithAnalytics = async (entityId) => {
  try {
    const entity = await getEntityById(entityId);
    if (!entity) return null;

    const [qrScanTimestamps, socialClickTimestamps, customLinkClickTimestamps] = await Promise.all([
      getQRScanTimestamps(entity.uuid),
      getSocialClickTimestamps(entityId),
      getCustomLinkClickTimestamps(entityId),
    ]);

    return {
      ...entity,
      qrScanTimestamps,
      clickTimestamps: socialClickTimestamps,
      customLinkClickTimestamps,
      qrScans: qrScanTimestamps.length,
      socialClicks: Object.keys(socialClickTimestamps).reduce((acc, platform) => {
        acc[platform] = socialClickTimestamps[platform].length;
        return acc;
      }, {}),
      customLinkClicks: Object.keys(customLinkClickTimestamps).reduce((acc, index) => {
        acc[index] = customLinkClickTimestamps[index].length;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error('Error getting entity with analytics:', error);
    return null;
  }
};
