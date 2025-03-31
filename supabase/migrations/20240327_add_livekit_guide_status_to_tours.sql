-- Add LiveKit guide status columns to tours table
ALTER TABLE tours
ADD COLUMN livekit_guide_joined TIMESTAMP WITH TIME ZONE,
ADD COLUMN livekit_guide_left TIMESTAMP WITH TIME ZONE;

-- Add comments to explain the columns
COMMENT ON COLUMN tours.livekit_guide_joined IS 'Timestamp when the guide joined the LiveKit room';
COMMENT ON COLUMN tours.livekit_guide_left IS 'Timestamp when the guide left the LiveKit room';

-- Create indexes for faster queries
CREATE INDEX idx_tours_livekit_guide_joined ON tours(livekit_guide_joined);
CREATE INDEX idx_tours_livekit_guide_left ON tours(livekit_guide_left); 