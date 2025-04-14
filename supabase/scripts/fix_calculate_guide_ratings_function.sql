-- Fix calculate_guide_ratings function with correct return type
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.calculate_guide_ratings(input_guide_id uuid)
RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH guide_ratings AS (
    SELECT f.rating
    FROM tours t
    JOIN feedback f ON t.id = f.tour_id
    WHERE t.guide_id = input_guide_id
    AND f.rating IS NOT NULL
    AND f.deleted_at IS NULL
  )
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 1) as average_rating,
    COUNT(*) as total_reviews
  FROM guide_ratings;
END;
$$; 