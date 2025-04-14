-- Fix check_tour_limit_for_guide function with parameter
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.check_tour_limit_for_guide(p_guide_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stripe_enabled boolean;
    v_tour_count integer;
BEGIN
    -- Check if guide has completed Stripe onboarding
    SELECT stripe_account_enabled INTO v_stripe_enabled
    FROM users
    WHERE id = p_guide_id;

    -- If guide is onboarded, no limit applies
    IF v_stripe_enabled THEN
        RETURN true;
    END IF;

    -- Count tours in last 7 days
    SELECT COUNT(*) INTO v_tour_count
    FROM tours
    WHERE guide_id = p_guide_id
    AND created_at >= NOW() - INTERVAL '7 days'
    AND deleted_at IS NULL;

    RETURN v_tour_count < 2;
END;
$$; 