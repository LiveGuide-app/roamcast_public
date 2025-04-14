-- Fix check_active_tour function with correct return type
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.check_active_tour()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'active' THEN
        IF EXISTS (
            SELECT 1 FROM tours 
            WHERE guide_id = NEW.guide_id 
            AND status = 'active'
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Guide already has an active tour';
        END IF;
    END IF;
    RETURN NEW;
END;
$$; 