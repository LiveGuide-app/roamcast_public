-- Add room status columns to tours table
ALTER TABLE tours
ADD COLUMN room_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN room_finished_at TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the columns
COMMENT ON COLUMN tours.room_started_at IS 'Timestamp when the LiveKit room for this tour started';
COMMENT ON COLUMN tours.room_finished_at IS 'Timestamp when the LiveKit room for this tour finished';

-- Create an index on room_started_at for faster queries
CREATE INDEX idx_tours_room_started_at ON tours(room_started_at); 