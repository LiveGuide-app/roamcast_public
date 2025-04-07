-- Fix the guide stats counting by calculating each metric independently
CREATE OR REPLACE FUNCTION calculate_guide_stats(guide_id UUID)
RETURNS TABLE (
  total_tours BIGINT,
  total_guests BIGINT,
  total_earnings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH 
    -- Count tours independently
    tour_count AS (
      SELECT COUNT(*) as count
      FROM tours t
      WHERE t.guide_id = $1
      AND t.deleted_at IS NULL
    ),
    -- Count participants independently
    guest_count AS (
      SELECT COUNT(DISTINCT tp.id) as count
      FROM tours t
      JOIN tour_participants tp ON t.id = tp.tour_id
      WHERE t.guide_id = $1
      AND t.deleted_at IS NULL
      AND tp.deleted_at IS NULL
    ),
    -- Sum tips independently
    earnings_sum AS (
      SELECT COALESCE(SUM(tt.amount), 0) as sum
      FROM tours t
      JOIN tour_participants tp ON t.id = tp.tour_id
      JOIN tour_tips tt ON tp.id = tt.tour_participant_id
      WHERE t.guide_id = $1
      AND t.deleted_at IS NULL
      AND tp.deleted_at IS NULL
      AND tt.deleted_at IS NULL
      AND tt.status = 'succeeded'
    )
  SELECT 
    tour_count.count as total_tours,
    guest_count.count as total_guests,
    earnings_sum.sum as total_earnings
  FROM tour_count, guest_count, earnings_sum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 