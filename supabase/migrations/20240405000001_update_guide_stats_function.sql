-- Update the calculate_guide_stats function to exclude soft-deleted tours
CREATE OR REPLACE FUNCTION calculate_guide_stats(guide_id UUID)
RETURNS TABLE (
  total_tours BIGINT,
  total_guests BIGINT,
  total_earnings BIGINT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER; 