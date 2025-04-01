-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read participants for active and pending tours" ON tour_participants;
DROP POLICY IF EXISTS "Anyone can insert participants for active and pending tours" ON tour_participants;
DROP POLICY IF EXISTS "Participants can update their own leave time" ON tour_participants;

-- Create new policies that include completed tours
CREATE POLICY "Anyone can read participants for active, pending, and completed tours"
ON tour_participants
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = tour_participants.tour_id
    AND tours.status = ANY (ARRAY['active'::text, 'pending'::text, 'completed'::text])
  )
);

CREATE POLICY "Anyone can insert participants for active and pending tours"
ON tour_participants
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = tour_participants.tour_id
    AND tours.status = ANY (ARRAY['active'::text, 'pending'::text])
  )
);

CREATE POLICY "Participants can update their own leave time"
ON tour_participants
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = tour_participants.tour_id
    AND tours.status = ANY (ARRAY['active'::text, 'pending'::text, 'completed'::text])
  )
)
WITH CHECK (
  -- Only allow updating leave_time
  (leave_time IS NOT NULL AND leave_time IS DISTINCT FROM tour_participants.leave_time)
  OR
  -- Or if no other fields changed
  (leave_time IS NOT DISTINCT FROM tour_participants.leave_time)
); 