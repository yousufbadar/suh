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
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      const error = new Error('Supabase is not configured. Please check your .env file and restart the server.');
      console.error('❌', error.message);
      throw error;
    }

    const entityId = entity.id || Date.now().toString();
    const entityUuid = entity.uuid || generateUUID();
    
    // Determine the userId to use
    // If userId is provided (user is logged in), use it
    // Otherwise, if entity already has a userId, preserve it
    // Otherwise, default to 'anonymous'
    const finalUserId = userId || entity.userId || 'anonymous';
    
    console.log('💾 Saving entity - provided userId:', userId, 'entity.userId:', entity.userId, 'final userId:', finalUserId);
    
    const newEntity = {
      ...entity,
      id: entityId,
      uuid: entityUuid,
      userId: finalUserId, // Use the determined userId
      active: entity.active !== undefined ? entity.active : true,
    };

    const dbEntity = mapEntityToDB(newEntity);

    // Check if entity exists
    const { data: existingEntity, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', entityId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking for existing entity:', checkError);
      throw checkError;
    }

    if (existingEntity) {
      // Update existing entity - preserve UUID if it exists
      if (!existingEntity.uuid) {
        dbEntity.uuid = entityUuid;
      } else {
        dbEntity.uuid = existingEntity.uuid; // Preserve existing UUID
      }
      
      // If user is logged in and updating, ensure user_id is updated to current user
      // This handles the case where profiles were created as 'anonymous' before login
      if (userId && existingEntity.user_id === 'anonymous') {
        console.log('🔄 Updating profile user_id from "anonymous" to user:', userId);
        dbEntity.user_id = userId;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(dbEntity)
        .eq('id', entityId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating entity:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      return mapEntityFromDB(data);
    } else {
      // Insert new entity
      const { data, error } = await supabase
        .from('profiles')
        .insert(dbEntity)
        .select()
        .single();

      if (error) {
        console.error('❌ Error inserting entity:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      return mapEntityFromDB(data);
    }
  } catch (error) {
    console.error('❌ Error saving entity:', error);
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.error('💡 This might be a network issue or Supabase project is paused.');
      console.error('💡 Check your Supabase dashboard to ensure the project is active.');
    }
    throw error;
  }
};

export const getEntities = async (userId = null) => {
  try {
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      console.warn('⚠️  Supabase not configured. Returning empty array.');
      console.warn('💡 Check your .env file and restart the development server.');
      return [];
    }

    // Build query - filter by user_id if provided
    let query = supabase
      .from('profiles')
      .select('*');

    // Filter by user_id if userId is provided
    if (userId) {
      query = query.eq('user_id', userId);
      console.log('🔍 Filtering profiles by user_id:', userId);
    } else {
      console.log('ℹ️  No userId provided, fetching all profiles (this should only happen for anonymous users)');
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Database query error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    const entities = data ? data.map(mapEntityFromDB) : [];
    console.log(`✅ Retrieved ${entities.length} profile(s)${userId ? ` for user ${userId}` : ''}`);
    
    // Debug: Log first entity's user_id if any exist
    if (entities.length > 0 && userId) {
      console.log('🔍 Debug - First entity user_id:', entities[0].userId, 'vs current user:', userId);
      console.log('🔍 Debug - Match:', entities[0].userId === userId);
    }
    
    return entities;
  } catch (error) {
    console.error('❌ Error reading entities from database:', error);
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.error('💡 This might be a network issue or Supabase project is paused.');
      console.error('💡 Check your Supabase dashboard to ensure the project is active.');
    }
    return [];
  }
};

export const getEntityById = async (id, userId = null) => {
  try {
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      console.warn('⚠️  Supabase not configured.');
      return null;
    }

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('id', id);

    // Filter by user_id if provided to ensure user can only access their own profiles
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      // If no rows found, return null (could be wrong ID or wrong user)
      if (error.code === 'PGRST116') {
        console.log('ℹ️  Profile not found or access denied');
        return null;
      }
      throw error;
    }

    return mapEntityFromDB(data);
  } catch (error) {
    console.error('❌ Error getting entity by id:', error);
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

export const deleteEntity = async (id, userId = null) => {
  try {
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      const error = new Error('Supabase is not configured. Please check your .env file and restart the server.');
      console.error('❌', error.message);
      throw error;
    }

    // First verify the entity exists and belongs to the user (if userId provided)
    if (userId) {
      const entity = await getEntityById(id, userId);
      if (!entity) {
        throw new Error('Profile not found or you do not have permission to delete it');
      }
    }

    let query = supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    // Add user_id filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) throw error;
    return await getEntities(userId);
  } catch (error) {
    console.error('❌ Error deleting entity:', error);
    throw error;
  }
};

// Deactivate entity instead of deleting
export const deactivateEntity = async (id, userId = null) => {
  try {
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      const error = new Error('Supabase is not configured. Please check your .env file and restart the server.');
      console.error('❌', error.message);
      throw error;
    }

    // First verify the entity exists and belongs to the user (if userId provided)
    if (userId) {
      const entity = await getEntityById(id, userId);
      if (!entity) {
        throw new Error('Profile not found or you do not have permission to deactivate it');
      }
    }

    let query = supabase
      .from('profiles')
      .update({ 
        active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Add user_id filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query.select().single();

    if (error) throw error;
    return await getEntities(userId);
  } catch (error) {
    console.error('❌ Error deactivating entity:', error);
    throw error;
  }
};

// Reactivate entity
export const reactivateEntity = async (id, userId = null) => {
  try {
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      const error = new Error('Supabase is not configured. Please check your .env file and restart the server.');
      console.error('❌', error.message);
      throw error;
    }

    // First verify the entity exists and belongs to the user (if userId provided)
    if (userId) {
      const entity = await getEntityById(id, userId);
      if (!entity) {
        throw new Error('Profile not found or you do not have permission to reactivate it');
      }
    }

    let query = supabase
      .from('profiles')
      .update({ 
        active: true,
        reactivated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Add user_id filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query.select().single();

    if (error) throw error;
    return await getEntities(userId);
  } catch (error) {
    console.error('❌ Error reactivating entity:', error);
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

// Migrate anonymous profiles to a specific user
// This is useful when a user logs in and has profiles created before login
export const migrateAnonymousProfilesToUser = async (userId) => {
  if (!userId) {
    console.warn('⚠️  Cannot migrate profiles: no userId provided');
    return { migrated: 0, error: 'No userId provided' };
  }

  try {
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      throw new Error('Supabase is not configured');
    }

    console.log('🔄 Migrating anonymous profiles to user:', userId);
    
    // Update all profiles with user_id = 'anonymous' to the new userId
    const { data, error } = await supabase
      .from('profiles')
      .update({ user_id: userId })
      .eq('user_id', 'anonymous')
      .select();

    if (error) {
      console.error('❌ Error migrating profiles:', error);
      throw error;
    }

    const migratedCount = data ? data.length : 0;
    console.log(`✅ Migrated ${migratedCount} profile(s) to user ${userId}`);
    
    return { migrated: migratedCount, profiles: data };
  } catch (error) {
    console.error('❌ Error migrating anonymous profiles:', error);
    return { migrated: 0, error: error.message };
  }
};

// Track QR code scan (minute-based aggregation)
export const trackQRScan = async (uuid) => {
  try {
    console.log('📱 Tracking QR scan:', { uuid });
    
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      console.error('❌ Supabase not configured for tracking');
      return;
    }

    // Get entity by UUID
    const entity = await getEntityByUUID(uuid);
    if (!entity) {
      console.warn('⚠️  Entity not found for tracking:', uuid);
      return;
    }
    
    // Don't track if entity is archived/inactive
    if (entity.active === false) {
      console.warn('⚠️  Entity is inactive, skipping tracking:', uuid);
      return;
    }

    // Get current date, hour, and minute
    const now = new Date();
    const clickDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const clickHour = now.getHours();
    const clickMinute = now.getMinutes();

    console.log('📊 QR scan tracking details:', { clickDate, clickHour, clickMinute });

    // Check if record exists for this minute
    const { data: existing, error: selectError } = await supabase
      .from('qr_scans_by_minute')
      .select('id, click_count')
      .eq('profile_uuid', uuid)
      .eq('click_date', clickDate)
      .eq('click_hour', clickHour)
      .eq('click_minute', clickMinute)
      .maybeSingle();

    if (selectError) {
      console.error('❌ Error checking for existing QR scan record:', selectError);
      throw selectError;
    }

    if (existing) {
      // Update existing record - increment count
      console.log('🔄 Updating existing QR scan record:', { id: existing.id, currentCount: existing.click_count });
      const { data: updatedData, error: updateError } = await supabase
        .from('qr_scans_by_minute')
        .update({ 
          click_count: existing.click_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();

      if (updateError) {
        console.error('❌ Error updating QR scan count:', updateError);
        console.error('Update error details:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw updateError;
      }
      console.log('✅ QR scan count updated successfully:', updatedData);
    } else {
      // Insert new record
      console.log('➕ Inserting new QR scan record');
      const { data: insertedData, error: insertError } = await supabase
        .from('qr_scans_by_minute')
        .insert({
          profile_uuid: uuid,
          click_date: clickDate,
          click_hour: clickHour,
          click_minute: clickMinute,
          click_count: 1,
        })
        .select();

      if (insertError) {
        console.error('❌ Error inserting QR scan record:', insertError);
        console.error('Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw insertError;
      }
      console.log('✅ QR scan record inserted successfully:', insertedData);
    }
  } catch (error) {
    console.error('❌ Error tracking QR scan:', error);
    console.error('Error stack:', error.stack);
  }
};

// Track social media click (minute-based aggregation)
export const trackSocialClick = async (entityId, platform) => {
  try {
    console.log('🖱️  Tracking social click:', { entityId, platform });
    
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      console.error('❌ Supabase not configured for tracking');
      return;
    }

    // Get entity by ID
    const entity = await getEntityById(entityId);
    if (!entity) {
      console.warn('⚠️  Entity not found for tracking:', entityId);
      return;
    }
    
    // Don't track if entity is archived/inactive
    if (entity.active === false) {
      console.warn('⚠️  Entity is inactive, skipping tracking:', entityId);
      return;
    }

    // Get current date, hour, and minute
    const now = new Date();
    const clickDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const clickHour = now.getHours();
    const clickMinute = now.getMinutes();

    console.log('📊 Click tracking details:', { clickDate, clickHour, clickMinute });

    // Check if record exists for this minute
    const { data: existing, error: selectError } = await supabase
      .from('social_clicks_by_minute')
      .select('id, click_count')
      .eq('profile_id', entityId)
      .eq('platform', platform)
      .eq('click_date', clickDate)
      .eq('click_hour', clickHour)
      .eq('click_minute', clickMinute)
      .maybeSingle();

    if (selectError) {
      console.error('❌ Error checking for existing click record:', selectError);
      throw selectError;
    }

    if (existing) {
      // Update existing record - increment count
      console.log('🔄 Updating existing click record:', { id: existing.id, currentCount: existing.click_count });
      const { data: updatedData, error: updateError } = await supabase
        .from('social_clicks_by_minute')
        .update({ 
          click_count: existing.click_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();

      if (updateError) {
        console.error('❌ Error updating click count:', updateError);
        console.error('Update error details:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw updateError;
      }
      console.log('✅ Click count updated successfully:', updatedData);
    } else {
      // Insert new record
      console.log('➕ Inserting new click record');
      const { data: insertedData, error: insertError } = await supabase
        .from('social_clicks_by_minute')
        .insert({
          profile_id: entityId,
          platform: platform,
          click_date: clickDate,
          click_hour: clickHour,
          click_minute: clickMinute,
          click_count: 1,
        })
        .select();

      if (insertError) {
        console.error('❌ Error inserting click record:', insertError);
        console.error('Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw insertError;
      }
      console.log('✅ Click record inserted successfully:', insertedData);
    }
  } catch (error) {
    console.error('❌ Error tracking social click:', error);
    console.error('Error stack:', error.stack);
  }
};

// Track custom link click (minute-based aggregation)
export const trackCustomLinkClick = async (entityId, customLinkIndex) => {
  try {
    console.log('🖱️  Tracking custom link click:', { entityId, customLinkIndex });
    
    // Check if Supabase is configured
    if (!supabase || !supabase.from) {
      console.error('❌ Supabase not configured for tracking');
      return;
    }

    // Get entity by ID
    const entity = await getEntityById(entityId);
    if (!entity) {
      console.warn('⚠️  Entity not found for tracking:', entityId);
      return;
    }
    
    // Don't track if entity is archived/inactive
    if (entity.active === false) {
      console.warn('⚠️  Entity is inactive, skipping tracking:', entityId);
      return;
    }

    // Get current date, hour, and minute
    const now = new Date();
    const clickDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const clickHour = now.getHours();
    const clickMinute = now.getMinutes();

    console.log('📊 Click tracking details:', { clickDate, clickHour, clickMinute });

    // Check if record exists for this minute
    const { data: existing, error: selectError } = await supabase
      .from('custom_link_clicks_by_minute')
      .select('id, click_count')
      .eq('profile_id', entityId)
      .eq('link_index', customLinkIndex)
      .eq('click_date', clickDate)
      .eq('click_hour', clickHour)
      .eq('click_minute', clickMinute)
      .maybeSingle();

    if (selectError) {
      console.error('❌ Error checking for existing click record:', selectError);
      throw selectError;
    }

    if (existing) {
      // Update existing record - increment count
      console.log('🔄 Updating existing click record:', { id: existing.id, currentCount: existing.click_count });
      const { data: updatedData, error: updateError } = await supabase
        .from('custom_link_clicks_by_minute')
        .update({ 
          click_count: existing.click_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();

      if (updateError) {
        console.error('❌ Error updating click count:', updateError);
        console.error('Update error details:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw updateError;
      }
      console.log('✅ Click count updated successfully:', updatedData);
    } else {
      // Insert new record
      console.log('➕ Inserting new click record');
      const { data: insertedData, error: insertError } = await supabase
        .from('custom_link_clicks_by_minute')
        .insert({
          profile_id: entityId,
          link_index: customLinkIndex,
          click_date: clickDate,
          click_hour: clickHour,
          click_minute: clickMinute,
          click_count: 1,
        })
        .select();

      if (insertError) {
        console.error('❌ Error inserting click record:', insertError);
        console.error('Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw insertError;
      }
      console.log('✅ Click record inserted successfully:', insertedData);
    }
  } catch (error) {
    console.error('❌ Error tracking custom link click:', error);
    console.error('Error stack:', error.stack);
  }
};

// Direct query functions for dashboard charts (bypass timestamp reconstruction)
export const getClicksByMinuteDirect = async (entityId, uuid, minutes = 30, offsetMinutes = 0) => {
  try {
    const now = new Date();
    const endTime = new Date(now.getTime() - offsetMinutes * 60 * 1000);
    const startTime = new Date(endTime.getTime() - minutes * 60 * 1000);
    
    console.log('⏰ Time range calculation:', {
      now: now.toLocaleString(),
      nowISO: now.toISOString(),
      offsetMinutes,
      endTime: endTime.toLocaleString(),
      endTimeISO: endTime.toISOString(),
      startTime: startTime.toLocaleString(),
      startTimeISO: startTime.toISOString(),
      minutes,
    });
    
    // Get local date strings (not UTC) to match how data is stored
    const startDateLocal = new Date(startTime);
    const endDateLocal = new Date(endTime);
    
    // Get date strings in local timezone (YYYY-MM-DD)
    const getLocalDateStr = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Query a wider date range to ensure we get all data (2 days before to 2 days after)
    // This handles cases where clicks might be from a different day due to timezone or date changes
    const queryStartDate = new Date(startDateLocal);
    queryStartDate.setDate(queryStartDate.getDate() - 2);
    const queryEndDate = new Date(endDateLocal);
    queryEndDate.setDate(queryEndDate.getDate() + 2);
    
    const queryStartDateStr = getLocalDateStr(queryStartDate);
    const queryEndDateStr = getLocalDateStr(queryEndDate);
    
    console.log('🔍 Querying minute data:', {
      startTime: startTime.toLocaleString(),
      endTime: endTime.toLocaleString(),
      queryStartDate: queryStartDateStr,
      queryEndDate: queryEndDateStr,
      entityId,
      uuid,
    });
    
    // Query all three tables in parallel - get wider date range
    const [socialResult, customResult, qrResult] = await Promise.all([
      supabase.from('social_clicks_by_minute')
        .select('click_date, click_hour, click_minute, platform, click_count')
        .eq('profile_id', entityId)
        .gte('click_date', queryStartDateStr)
        .lte('click_date', queryEndDateStr),
      supabase.from('custom_link_clicks_by_minute')
        .select('click_date, click_hour, click_minute, link_index, click_count')
        .eq('profile_id', entityId)
        .gte('click_date', queryStartDateStr)
        .lte('click_date', queryEndDateStr),
      supabase.from('qr_scans_by_minute')
        .select('click_date, click_hour, click_minute, click_count')
        .eq('profile_uuid', uuid)
        .gte('click_date', queryStartDateStr)
        .lte('click_date', queryEndDateStr),
    ]);
    
    const { data: socialData, error: socialError } = socialResult;
    const { data: customData, error: customError } = customResult;
    const { data: qrData, error: qrError } = qrResult;
    
    if (socialError) console.error('❌ Error querying social clicks:', socialError);
    if (customError) console.error('❌ Error querying custom link clicks:', customError);
    if (qrError) console.error('❌ Error querying QR scans:', qrError);
    
    // Helper to create date in local timezone
    const createLocalDate = (dateStr, hour, minute) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, hour, minute || 0, 0, 0);
    };
    
    console.log('📥 Raw data from DB:', {
      socialRows: socialData?.length || 0,
      customRows: customData?.length || 0,
      qrRows: qrData?.length || 0,
      socialSample: socialData?.slice(0, 5).map(row => ({
        click_date: row.click_date,
        click_hour: row.click_hour,
        click_minute: row.click_minute,
        click_count: row.click_count,
        reconstructedTime: createLocalDate(row.click_date, row.click_hour, row.click_minute).toLocaleString(),
      })),
      customSample: customData?.slice(0, 2),
      qrSample: qrData?.slice(0, 2),
      timeRange: {
        startTime: startTime.toLocaleString(),
        endTime: endTime.toLocaleString(),
        now: now.toLocaleString(),
      },
    });
    
    // Aggregate by 5-minute intervals
    const intervalData = {};
    
    // Process social clicks
    if (socialData && Array.isArray(socialData)) {
      let processed = 0;
      let skipped = 0;
      socialData.forEach(row => {
        const rowDate = createLocalDate(row.click_date, row.click_hour, row.click_minute);
        // Check if click is within the time window (last N minutes from endTime)
        // Calculate time difference in minutes from endTime
        const minutesFromEnd = (endTime.getTime() - rowDate.getTime()) / (60 * 1000);
        // Include clicks that are within the time window (0 to minutes ago)
        const isInRange = minutesFromEnd >= 0 && minutesFromEnd <= minutes;
        
        if (skipped < 5 && !isInRange) {
          console.log('⏰ Social click outside range:', {
            rowDate: rowDate.toLocaleString(),
            rowDateISO: rowDate.toISOString(),
            startTime: startTime.toLocaleString(),
            startTimeISO: startTime.toISOString(),
            endTime: endTime.toLocaleString(),
            endTimeISO: endTime.toISOString(),
            minutesFromEnd: Math.round(minutesFromEnd * 10) / 10,
            minutesWindow: minutes,
            row: row,
          });
          skipped++;
        }
        
        if (isInRange) {
          processed++;
          const intervalMinute = Math.floor(row.click_minute / 5) * 5;
          const intervalKey = `${row.click_date}-${String(row.click_hour).padStart(2, '0')}-${String(intervalMinute).padStart(2, '0')}`;
          if (!intervalData[intervalKey]) {
            intervalData[intervalKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
          }
          intervalData[intervalKey].socialClicks += row.click_count || 0;
          intervalData[intervalKey].total += row.click_count || 0;
          
          if (processed <= 5) {
            console.log('✅ Social click in range:', {
              rowDate: rowDate.toLocaleString(),
              intervalKey,
              clickCount: row.click_count,
              intervalData: intervalData[intervalKey],
              minutesFromEnd: Math.round(minutesFromEnd * 10) / 10,
            });
          }
        }
      });
      console.log(`✅ Processed ${processed} social clicks in range (${socialData.length} total, ${skipped} skipped)`);
    }
    
    // Process custom link clicks
    if (customData && Array.isArray(customData)) {
      let processed = 0;
      customData.forEach(row => {
        const rowDate = createLocalDate(row.click_date, row.click_hour, row.click_minute);
        const isInRange = rowDate >= startTime && rowDate <= endTime;
        if (isInRange) {
          processed++;
          const intervalMinute = Math.floor(row.click_minute / 5) * 5;
          const intervalKey = `${row.click_date}-${String(row.click_hour).padStart(2, '0')}-${String(intervalMinute).padStart(2, '0')}`;
          if (!intervalData[intervalKey]) {
            intervalData[intervalKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
          }
          intervalData[intervalKey].customLinkClicks += row.click_count || 0;
          intervalData[intervalKey].total += row.click_count || 0;
        }
      });
      console.log(`✅ Processed ${processed} custom link clicks in range (${customData.length} total)`);
    }
    
    // Process QR scans
    if (qrData && Array.isArray(qrData)) {
      let processed = 0;
      qrData.forEach(row => {
        const rowDate = createLocalDate(row.click_date, row.click_hour, row.click_minute);
        const isInRange = rowDate >= startTime && rowDate <= endTime;
        if (isInRange) {
          processed++;
          const intervalMinute = Math.floor(row.click_minute / 5) * 5;
          const intervalKey = `${row.click_date}-${String(row.click_hour).padStart(2, '0')}-${String(intervalMinute).padStart(2, '0')}`;
          if (!intervalData[intervalKey]) {
            intervalData[intervalKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
          }
          intervalData[intervalKey].qrScans += row.click_count || 0;
          intervalData[intervalKey].total += row.click_count || 0;
        }
      });
      console.log(`✅ Processed ${processed} QR scans in range (${qrData.length} total)`);
    }
    
    // Generate 5-minute intervals using local timezone
    const result = [];
    const intervalCount = Math.ceil(minutes / 5);
    
    for (let i = intervalCount - 1; i >= 0; i--) {
      const intervalDate = new Date(endTime.getTime() - i * 5 * 60 * 1000);
      intervalDate.setMinutes(Math.floor(intervalDate.getMinutes() / 5) * 5);
      intervalDate.setSeconds(0);
      intervalDate.setMilliseconds(0);
      
      // Use local date string to match database format
      const dateStr = getLocalDateStr(intervalDate);
      const hour = intervalDate.getHours();
      const minute = intervalDate.getMinutes();
      const intervalKey = `${dateStr}-${String(hour).padStart(2, '0')}-${String(minute).padStart(2, '0')}`;
      
      const data = intervalData[intervalKey] || { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
      
      const nextInterval = new Date(intervalDate.getTime() + 5 * 60 * 1000);
      const displayTime = `${intervalDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${nextInterval.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      
      result.push({
        date: intervalDate.toISOString(),
        dateKey: intervalKey,
        ...data,
        displayTime: displayTime,
        displayTimeShort: intervalDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        displayDate: intervalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    
    console.log('📊 Direct minute query result:', {
      intervalCount: result.length,
      intervalsWithData: result.filter(r => r.total > 0).length,
      totalClicks: result.reduce((sum, r) => sum + r.total, 0),
      intervalKeysFromData: Object.keys(intervalData),
      intervalKeysFromResult: result.map(r => r.dateKey),
      sampleIntervals: result.slice(0, 3).map(r => ({ key: r.dateKey, total: r.total, qrScans: r.qrScans, socialClicks: r.socialClicks, customLinkClicks: r.customLinkClicks })),
      allIntervals: result.map(r => ({ key: r.dateKey, total: r.total })),
    });
    
    return result;
  } catch (error) {
    console.error('Error in getClicksByMinuteDirect:', error);
    return [];
  }
};

export const getClicksByHourDirect = async (entityId, uuid, hours = 12, hourOffset = 0) => {
  try {
    const now = new Date();
    
    // Calculate the end time (now - hourOffset hours)
    const endTime = new Date(now.getTime() - hourOffset * 60 * 60 * 1000);
    
    // Calculate the start time (hours before endTime)
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
    
    // Get date range for querying (wider range to ensure we get all data)
    const queryStartDate = new Date(startTime);
    queryStartDate.setDate(queryStartDate.getDate() - 1); // Go back 1 day
    const queryEndDate = new Date(endTime);
    queryEndDate.setDate(queryEndDate.getDate() + 1); // Go forward 1 day
    
    // Get local date strings (not UTC) to match how data is stored
    const getLocalDateStr = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const queryStartDateStr = getLocalDateStr(queryStartDate);
    const queryEndDateStr = getLocalDateStr(queryEndDate);
    
    console.log('🔍 Querying hour data:', {
      startTime: startTime.toLocaleString(),
      endTime: endTime.toLocaleString(),
      queryStartDateStr,
      queryEndDateStr,
      hours,
      hourOffset,
      entityId,
      uuid,
    });
    
    // Query all three tables
    const [socialResult, customResult, qrResult] = await Promise.all([
      supabase.from('social_clicks_by_minute')
        .select('click_date, click_hour, platform, click_count')
        .eq('profile_id', entityId)
        .gte('click_date', queryStartDateStr)
        .lte('click_date', queryEndDateStr),
      supabase.from('custom_link_clicks_by_minute')
        .select('click_date, click_hour, link_index, click_count')
        .eq('profile_id', entityId)
        .gte('click_date', queryStartDateStr)
        .lte('click_date', queryEndDateStr),
      supabase.from('qr_scans_by_minute')
        .select('click_date, click_hour, click_count')
        .eq('profile_uuid', uuid)
        .gte('click_date', queryStartDateStr)
        .lte('click_date', queryEndDateStr),
    ]);
    
    const { data: socialData, error: socialError } = socialResult;
    const { data: customData, error: customError } = customResult;
    const { data: qrData, error: qrError } = qrResult;
    
    if (socialError) console.error('❌ Error querying social clicks:', socialError);
    if (customError) console.error('❌ Error querying custom link clicks:', customError);
    if (qrError) console.error('❌ Error querying QR scans:', qrError);
    
    // Aggregate by hour
    const hourData = {};
    
    // Helper to create date in local timezone
    const createLocalDate = (dateStr, hour) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day, hour, 0, 0, 0);
    };
    
    // Process all clicks
    [socialData, customData, qrData].forEach((data, index) => {
      if (data && Array.isArray(data)) {
        data.forEach(row => {
          const rowDate = createLocalDate(row.click_date, row.click_hour);
          if (rowDate >= startTime && rowDate <= endTime) {
            const hourKey = `${row.click_date}-${String(row.click_hour).padStart(2, '0')}`;
            if (!hourData[hourKey]) {
              hourData[hourKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
            }
            if (index === 0) hourData[hourKey].socialClicks += row.click_count || 0;
            else if (index === 1) hourData[hourKey].customLinkClicks += row.click_count || 0;
            else hourData[hourKey].qrScans += row.click_count || 0;
            hourData[hourKey].total += row.click_count || 0;
          }
        });
      }
    });
    
    // Generate hour intervals - show last N hours
    const result = [];
    for (let i = hours - 1; i >= 0; i--) {
      const hourDate = new Date(endTime.getTime() - i * 60 * 60 * 1000);
      hourDate.setMinutes(0);
      hourDate.setSeconds(0);
      hourDate.setMilliseconds(0);
      
      const dateStr = getLocalDateStr(hourDate);
      const hour = hourDate.getHours();
      const hourKey = `${dateStr}-${String(hour).padStart(2, '0')}`;
      const data = hourData[hourKey] || { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
      
      result.push({
        date: hourDate.toISOString(),
        dateKey: hourKey,
        ...data,
        displayTime: hourDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        displayDate: hourDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        displayHour: hourDate.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }),
      });
    }
    
    console.log('📊 Hour query result:', {
      totalHours: result.length,
      hoursWithData: result.filter(r => r.total > 0).length,
      totalClicks: result.reduce((sum, r) => sum + r.total, 0),
    });
    
    return result;
  } catch (error) {
    console.error('Error in getClicksByHourDirect:', error);
    return [];
  }
};

export const getClicksByDayDirect = async (entityId, uuid, days = 7, dayOffset = 0) => {
  try {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() - dayOffset);
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Query all three tables
    const [socialResult, customResult, qrResult] = await Promise.all([
      supabase.from('social_clicks_by_minute')
        .select('click_date, platform, click_count')
        .eq('profile_id', entityId)
        .gte('click_date', startDateStr)
        .lte('click_date', endDateStr),
      supabase.from('custom_link_clicks_by_minute')
        .select('click_date, link_index, click_count')
        .eq('profile_id', entityId)
        .gte('click_date', startDateStr)
        .lte('click_date', endDateStr),
      supabase.from('qr_scans_by_minute')
        .select('click_date, click_count')
        .eq('profile_uuid', uuid)
        .gte('click_date', startDateStr)
        .lte('click_date', endDateStr),
    ]);
    
    const { data: socialData, error: socialError } = socialResult;
    const { data: customData, error: customError } = customResult;
    const { data: qrData, error: qrError } = qrResult;
    
    if (socialError) console.error('❌ Error querying social clicks:', socialError);
    if (customError) console.error('❌ Error querying custom link clicks:', customError);
    if (qrError) console.error('❌ Error querying QR scans:', qrError);
    
    // Aggregate by day
    const dayData = {};
    
    // Process all clicks
    [socialData, customData, qrData].forEach((data, index) => {
      if (data && Array.isArray(data)) {
        data.forEach(row => {
          if (!dayData[row.click_date]) {
            dayData[row.click_date] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
          }
          if (index === 0) dayData[row.click_date].socialClicks += row.click_count || 0;
          else if (index === 1) dayData[row.click_date].customLinkClicks += row.click_count || 0;
          else dayData[row.click_date].qrScans += row.click_count || 0;
          dayData[row.click_date].total += row.click_count || 0;
        });
      }
    });
    
    // Generate day intervals
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dayKey = date.toISOString().split('T')[0];
      const data = dayData[dayKey] || { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
      
      result.push({
        date: dayKey,
        ...data,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error in getClicksByDayDirect:', error);
    return [];
  }
};

// Helper functions to get analytics data (for dashboard) - minute-based
export const getQRScanTimestamps = async (uuid) => {
  try {
    const { data, error } = await supabase
      .from('qr_scans_by_minute')
      .select('click_date, click_hour, click_minute, click_count')
      .eq('profile_uuid', uuid)
      .order('click_date', { ascending: true })
      .order('click_hour', { ascending: true })
      .order('click_minute', { ascending: true });

    if (error) {
      console.error('❌ Error getting QR scan timestamps:', error);
      throw error;
    }
    
    console.log('📱 QR scan data from DB:', { uuid, rowCount: data?.length || 0, sample: data?.slice(0, 3) });
    
    // Convert minute-based data to timestamps (one per click)
    const timestamps = [];
    if (data && Array.isArray(data)) {
    data.forEach(row => {
      // Create a timestamp for each click in this minute
        // Note: click_date, click_hour, and click_minute are stored in LOCAL time (from getHours/getMinutes)
        // We need to create a date in local timezone, then convert to ISO
        // Parse the date components
        const [year, month, day] = row.click_date.split('-').map(Number);
        // Create date in local timezone (month is 0-indexed in JS Date)
        const date = new Date(year, month - 1, day, row.click_hour, row.click_minute, 0, 0);
        
        for (let i = 0; i < (row.click_count || 0); i++) {
        timestamps.push(date.toISOString());
      }
    });
    }
    
    console.log('📱 QR scan timestamps generated:', timestamps.length);
    return timestamps;
  } catch (error) {
    console.error('Error getting QR scan timestamps:', error);
    return [];
  }
};

export const getSocialClickTimestamps = async (entityId) => {
  try {
    const { data, error } = await supabase
      .from('social_clicks_by_minute')
      .select('platform, click_date, click_hour, click_minute, click_count')
      .eq('profile_id', entityId)
      .order('click_date', { ascending: true })
      .order('click_hour', { ascending: true })
      .order('click_minute', { ascending: true });

    if (error) {
      console.error('❌ Error getting social click timestamps:', error);
      throw error;
    }
    
    console.log('🖱️ Social click data from DB:', { entityId, rowCount: data?.length || 0, sample: data?.slice(0, 3) });
    
    // Group by platform and convert to timestamps
    const timestamps = {};
    if (data && Array.isArray(data)) {
    data.forEach(row => {
      if (!timestamps[row.platform]) {
        timestamps[row.platform] = [];
      }
      // Create a timestamp for each click in this minute
        // Note: click_date, click_hour, and click_minute are stored in LOCAL time (from getHours/getMinutes)
        // We need to create a date in local timezone, then convert to ISO
        // Parse the date components
        const [year, month, day] = row.click_date.split('-').map(Number);
        // Create date in local timezone (month is 0-indexed in JS Date)
        const date = new Date(year, month - 1, day, row.click_hour, row.click_minute, 0, 0);
        
        console.log('🔄 Reconstructing timestamp:', {
          click_date: row.click_date,
          click_hour: row.click_hour,
          click_minute: row.click_minute,
          reconstructedDate: date.toISOString(),
          localTime: date.toLocaleString(),
          localHours: date.getHours(),
          localMinutes: date.getMinutes(),
        });
        
        for (let i = 0; i < (row.click_count || 0); i++) {
        timestamps[row.platform].push(date.toISOString());
      }
    });
    }
    
    console.log('🖱️ Social click timestamps generated:', Object.keys(timestamps).length, 'platforms');
    return timestamps;
  } catch (error) {
    console.error('Error getting social click timestamps:', error);
    return {};
  }
};

export const getCustomLinkClickTimestamps = async (entityId) => {
  try {
    const { data, error } = await supabase
      .from('custom_link_clicks_by_minute')
      .select('link_index, click_date, click_hour, click_minute, click_count')
      .eq('profile_id', entityId)
      .order('click_date', { ascending: true })
      .order('click_hour', { ascending: true })
      .order('click_minute', { ascending: true });

    if (error) {
      console.error('❌ Error getting custom link click timestamps:', error);
      throw error;
    }
    
    console.log('🔗 Custom link click data from DB:', { entityId, rowCount: data?.length || 0, sample: data?.slice(0, 3) });
    
    // Group by link index and convert to timestamps
    const timestamps = {};
    if (data && Array.isArray(data)) {
    data.forEach(row => {
      const index = row.link_index.toString();
      if (!timestamps[index]) {
        timestamps[index] = [];
      }
      // Create a timestamp for each click in this minute
        // Note: click_date, click_hour, and click_minute are stored in LOCAL time (from getHours/getMinutes)
        // We need to create a date in local timezone, then convert to ISO
        // Parse the date components
        const [year, month, day] = row.click_date.split('-').map(Number);
        // Create date in local timezone (month is 0-indexed in JS Date)
        const date = new Date(year, month - 1, day, row.click_hour, row.click_minute, 0, 0);
        
        for (let i = 0; i < (row.click_count || 0); i++) {
        timestamps[index].push(date.toISOString());
      }
    });
    }
    
    console.log('🔗 Custom link click timestamps generated:', Object.keys(timestamps).length, 'links');
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
