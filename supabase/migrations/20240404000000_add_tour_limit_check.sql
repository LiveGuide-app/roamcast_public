-- Function to check if a guide has exceeded their tour limit (if not onboarded)
CREATE OR REPLACE FUNCTION check_tour_limit(guide_id uuid)
RETURNS boolean AS $$
DECLARE
    v_stripe_enabled boolean;
    v_tour_count integer;
BEGIN
    -- Get the guide's Stripe onboarding status
    SELECT stripe_account_enabled INTO v_stripe_enabled
    FROM users
    WHERE id = guide_id;

    -- If guide has completed Stripe onboarding, return true (no limit)
    IF v_stripe_enabled THEN
        RETURN true;
    END IF;

    -- Count tours in the last 7 days
    SELECT COUNT(*) INTO v_tour_count
    FROM tours
    WHERE guide_id = guide_id
    AND created_at >= NOW() - INTERVAL '7 days'
    AND deleted_at IS NULL;

    -- Return true if within limit, false if exceeded
    RETURN v_tour_count < 2;
END;
$$ LANGUAGE plpgsql;

-- Modify create_tour to use both checks
CREATE OR REPLACE FUNCTION create_tour(p_guide_id uuid, p_name text)
RETURNS tours AS $$
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
$$ LANGUAGE plpgsql; 