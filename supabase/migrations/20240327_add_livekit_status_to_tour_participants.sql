-- Add LiveKit room status columns to tour_participants table
ALTER TABLE tour_participants
ADD COLUMN livekit_joined_room TIMESTAMP WITH TIME ZONE,
ADD COLUMN livekit_left_room TIMESTAMP WITH TIME ZONE;

-- Add comments to explain the columns
COMMENT ON COLUMN tour_participants.livekit_joined_room IS 'Timestamp when the participant joined the LiveKit room';
COMMENT ON COLUMN tour_participants.livekit_left_room IS 'Timestamp when the participant left the LiveKit room';

-- Create indexes for faster queries
CREATE INDEX idx_tour_participants_livekit_joined_room ON tour_participants(livekit_joined_room);
CREATE INDEX idx_tour_participants_livekit_left_room ON tour_participants(livekit_left_room); 