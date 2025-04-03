-- Add stripe_account_id column to tour_tips table
ALTER TABLE tour_tips
ADD COLUMN stripe_account_id text;

-- Drop existing policy
DROP POLICY IF EXISTS "Access own tips" ON tour_tips;

-- Create new policy that covers both guides and participants
CREATE POLICY "Access own tips" ON tour_tips
FOR ALL TO public
USING (
  auth.uid() IN (
    -- Guide can see tips for their tours
    SELECT guide_id FROM tours
    WHERE tours.id IN (
      SELECT tour_id FROM tour_participants
      WHERE tour_participants.id = tour_tips.tour_participant_id
    )
    UNION
    -- Participant can see their own tips
    SELECT tours.guide_id FROM tour_participants
    JOIN tours ON tours.id = tour_participants.tour_id
    WHERE tour_participants.id = tour_tips.tour_participant_id
    AND tour_participants.device_id = current_setting('request.jwt.claims')::json->>'device_id'
  )
);

-- Add not null constraint after we have populated the data
-- Note: You'll need to populate the data before running this part
-- ALTER TABLE tour_tips ALTER COLUMN stripe_account_id SET NOT NULL;

COMMENT ON COLUMN tour_tips.stripe_account_id IS 'The Stripe Connect account ID of the guide receiving the tip'; 