-- Drop the existing policy
DROP POLICY IF EXISTS "Participants can create feedback" ON feedback;

-- Drop the existing table
DROP TABLE IF EXISTS feedback;

-- Create the feedback table with the new structure
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id uuid NOT NULL REFERENCES tours(id),
  device_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  has_tipped boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  deleted_at timestamptz,
  -- Ensure one rating per tour per device
  UNIQUE(tour_id, device_id)
);

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policy for feedback creation
CREATE POLICY "Participants can create feedback"
ON feedback FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = feedback.tour_id
    AND tours.status = 'completed'
  )
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY; 