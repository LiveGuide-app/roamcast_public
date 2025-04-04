-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS calculate_guide_ratings(UUID);

-- Create function to calculate guide ratings
CREATE OR REPLACE FUNCTION calculate_guide_ratings(input_guide_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews BIGINT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER; 