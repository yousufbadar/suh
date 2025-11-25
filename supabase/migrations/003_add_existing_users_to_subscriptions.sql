-- Migration: Add existing users to subscriptions table
-- This script creates subscription records for all existing authenticated users
-- It skips users who already have a subscription record
--
-- IMPORTANT: This script must be run as a database administrator or with RLS disabled
-- Run this in Supabase SQL Editor with "Run as service_role" enabled, or temporarily disable RLS

-- Temporarily disable RLS for this operation (will be re-enabled at the end)
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Function to add existing users to subscriptions
-- This will give all existing users an inactive subscription (they can start a trial)
DO $$
DECLARE
    user_record RECORD;
    subscription_count INTEGER;
    users_added INTEGER := 0;
    users_skipped INTEGER := 0;
BEGIN
    -- Loop through all authenticated users
    FOR user_record IN 
        SELECT 
            id::text as user_id,
            email,
            created_at
        FROM auth.users
        WHERE deleted_at IS NULL  -- Only active users
    LOOP
        -- Check if subscription already exists for this user
        SELECT COUNT(*) INTO subscription_count
        FROM subscriptions
        WHERE user_id = user_record.user_id;
        
        IF subscription_count = 0 THEN
            -- Create a new subscription record (inactive, no trial started yet)
            INSERT INTO subscriptions (
                user_id,
                plan_type,
                is_active,
                trial_start_date,
                subscription_start_date,
                subscription_end_date,
                created_at,
                updated_at
            ) VALUES (
                user_record.user_id,
                'pro',
                false,  -- Not active yet
                NULL,   -- No trial started
                NULL,   -- No subscription started
                NULL,   -- No end date
                NOW(),
                NOW()
            );
            
            users_added := users_added + 1;
            RAISE NOTICE 'Added subscription for user: % (email: %)', user_record.user_id, COALESCE(user_record.email, 'no email');
        ELSE
            users_skipped := users_skipped + 1;
            RAISE NOTICE 'Skipped user: % (email: %) - subscription already exists', user_record.user_id, COALESCE(user_record.email, 'no email');
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration complete!';
    RAISE NOTICE 'Users added: %', users_added;
    RAISE NOTICE 'Users skipped: %', users_skipped;
    RAISE NOTICE '========================================';
END $$;

-- Re-enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Alternative: If you want to give all existing users an active 30-day trial immediately
-- Uncomment the section below and comment out the section above

-- ============================================================================
-- ALTERNATIVE VERSION: Give all existing users an active 30-day trial
-- ============================================================================
-- If you want to automatically start a 30-day trial for all existing users,
-- comment out the section above and uncomment this section instead:
/*
-- Temporarily disable RLS for this operation
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    user_record RECORD;
    subscription_count INTEGER;
    trial_end_date TIMESTAMPTZ;
    users_added INTEGER := 0;
    users_skipped INTEGER := 0;
BEGIN
    -- Set trial end date to 30 days from now
    trial_end_date := NOW() + INTERVAL '30 days';
    
    -- Loop through all authenticated users
    FOR user_record IN 
        SELECT 
            id::text as user_id,
            email,
            created_at
        FROM auth.users
        WHERE deleted_at IS NULL  -- Only active users
    LOOP
        -- Check if subscription already exists for this user
        SELECT COUNT(*) INTO subscription_count
        FROM subscriptions
        WHERE user_id = user_record.user_id;
        
        IF subscription_count = 0 THEN
            -- Create a new subscription record with active trial
            INSERT INTO subscriptions (
                user_id,
                plan_type,
                is_active,
                trial_start_date,
                subscription_start_date,
                subscription_end_date,
                created_at,
                updated_at
            ) VALUES (
                user_record.user_id,
                'pro',
                false,  -- Not paid yet, but trial is active
                NOW(),  -- Trial starts now
                NULL,   -- No paid subscription yet
                trial_end_date,  -- Trial ends in 30 days
                NOW(),
                NOW()
            );
            
            users_added := users_added + 1;
            RAISE NOTICE 'Added subscription with trial for user: % (email: %)', user_record.user_id, COALESCE(user_record.email, 'no email');
        ELSE
            users_skipped := users_skipped + 1;
            RAISE NOTICE 'Skipped user: % (email: %) - subscription already exists', user_record.user_id, COALESCE(user_record.email, 'no email');
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration complete!';
    RAISE NOTICE 'Users added with trial: %', users_added;
    RAISE NOTICE 'Users skipped: %', users_skipped;
    RAISE NOTICE '========================================';
END $$;

-- Re-enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
*/

