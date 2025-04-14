-- Script to fix "Function Search Path Mutable" warnings for all affected functions
-- Run this in the Supabase SQL Editor

-- 1. Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

-- 3. Fix calculate_guide_stats
CREATE OR REPLACE FUNCTION public.calculate_guide_stats(guide_id UUID)
RETURNS TABLE (
  total_tours BIGINT,
  total_guests BIGINT,
  total_earnings BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH tour_stats AS (
    SELECT 
      COUNT(DISTINCT t.id) as total_tours,
      COUNT(DISTINCT tp.id) as total_guests,
      COALESCE(SUM(tt.amount), 0) as total_earnings
    FROM tours t
    LEFT JOIN tour_participants tp ON t.id = tp.tour_id
    LEFT JOIN tour_tips tt ON tp.id = tt.tour_participant_id AND tt.status = 'succeeded'
    WHERE t.guide_id = $1
    AND t.deleted_at IS NULL
  )
  SELECT 
    total_tours,
    total_guests,
    total_earnings
  FROM tour_stats;
END;
$$;

-- 4. Fix check_active_tour
CREATE OR REPLACE FUNCTION public.check_active_tour()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_count integer;
BEGIN
    -- Check if there's already an active tour for the guide
    SELECT COUNT(*) INTO active_count
    FROM tours
    WHERE guide_id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL;

    -- Raise an exception if an active tour already exists
    IF active_count > 0 THEN
        RAISE EXCEPTION 'You already have an active tour. Please end your current tour before starting a new one.';
    END IF;
END;
$$;

-- 5. Fix update_tour_participant_counts
CREATE OR REPLACE FUNCTION public.update_tour_participant_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update the participant count for the tour
    UPDATE tours
    SET participant_count = (
        SELECT COUNT(*)
        FROM tour_participants
        WHERE tour_id = NEW.tour_id
    )
    WHERE id = NEW.tour_id;
    
    RETURN NEW;
END;
$$;

-- 6. Fix update_tour_participant_counts_delete
CREATE OR REPLACE FUNCTION public.update_tour_participant_counts_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update the participant count for the tour
    UPDATE tours
    SET participant_count = (
        SELECT COUNT(*)
        FROM tour_participants
        WHERE tour_id = OLD.tour_id
    )
    WHERE id = OLD.tour_id;
    
    RETURN OLD;
END;
$$;

-- 7. Fix handle_tour_completion
CREATE OR REPLACE FUNCTION public.handle_tour_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Set the tour completion time
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

-- 8. Fix calculate_guide_ratings
CREATE OR REPLACE FUNCTION public.calculate_guide_ratings(input_guide_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_ratings BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(f.rating), 0) as average_rating,
    COUNT(f.id) as total_ratings
  FROM feedback f
  JOIN tours t ON f.tour_id = t.id
  WHERE t.guide_id = input_guide_id
  AND f.deleted_at IS NULL
  AND t.deleted_at IS NULL;
END;
$$;

-- 9. Fix generate_unique_tour_code
CREATE OR REPLACE FUNCTION public.generate_unique_tour_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code text;
    code_exists boolean;
BEGIN
    LOOP
        -- Generate a random 6-character alphanumeric code (uppercase only)
        code := upper(substring(md5(random()::text) from 1 for 6));
        
        -- Check if the code already exists
        SELECT EXISTS(
            SELECT 1 FROM tours WHERE unique_code = code
        ) INTO code_exists;
        
        -- If the code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;

-- 10. Fix create_tour
CREATE OR REPLACE FUNCTION public.create_tour(p_guide_id uuid, p_name text)
RETURNS tours
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tour tours;
BEGIN
    -- First check the tour limit for non-onboarded guides
    IF NOT check_tour_limit(p_guide_id) THEN
        RAISE EXCEPTION 'Tour limit reached: Maximum 2 tours within 7 days for non-onboarded guides';
    END IF;

    -- Then check for active tours (using existing function)
    PERFORM check_active_tour();

    -- If both checks pass, create the tour
    INSERT INTO tours (guide_id, name, unique_code, status)
    VALUES (
        p_guide_id,
        p_name,
        generate_unique_code(),
        'pending'
    )
    RETURNING * INTO v_tour;

    RETURN v_tour;
END;
$$;

-- 11. Fix check_tour_limit_for_guide
CREATE OR REPLACE FUNCTION public.check_tour_limit_for_guide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stripe_enabled boolean;
    v_tour_count integer;
BEGIN
    -- Get the guide's Stripe onboarding status
    SELECT stripe_account_enabled INTO v_stripe_enabled
    FROM users
    WHERE id = NEW.guide_id;

    -- If guide has completed Stripe onboarding, allow the tour creation
    IF v_stripe_enabled THEN
        RETURN NEW;
    END IF;

    -- Count tours in the last 7 days
    SELECT COUNT(*) INTO v_tour_count
    FROM tours
    WHERE guide_id = NEW.guide_id
    AND created_at >= NOW() - INTERVAL '7 days'
    AND deleted_at IS NULL;

    -- Raise exception if limit is exceeded
    IF v_tour_count >= 2 THEN
        RAISE EXCEPTION 'Tour limit reached: Maximum 2 tours within 7 days for non-onboarded guides';
    END IF;

    RETURN NEW;
END;
$$; 