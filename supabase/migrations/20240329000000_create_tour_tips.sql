-- Create tour_tips table
CREATE TABLE tour_tips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_participant_id uuid NOT NULL REFERENCES tour_participants(id),
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'requires_payment_method', 'requires_confirmation')),
  payment_intent_id text,
  application_fee_amount integer,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  deleted_at timestamptz
);

-- Create partial unique index to ensure one successful tip per participant
CREATE UNIQUE INDEX one_successful_tip_per_participant 
ON tour_tips (tour_participant_id) 
WHERE status = 'succeeded';

-- Create RLS policy for tour_tips
CREATE POLICY "Access own tips"
ON tour_tips
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM tour_participants
    WHERE tour_participants.id = tour_tips.tour_participant_id
    AND tour_participants.device_id = current_setting('request.jwt.claims')::json->>'device_id'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON tour_tips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add currency column to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_default_currency TEXT DEFAULT 'gbp'; 