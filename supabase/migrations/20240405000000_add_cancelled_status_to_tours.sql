-- Drop the existing constraint
ALTER TABLE tours
DROP CONSTRAINT IF EXISTS tours_status_check;

-- Add the new constraint that includes 'cancelled'
ALTER TABLE tours
ADD CONSTRAINT tours_status_check
CHECK (status IN ('pending', 'active', 'completed', 'cancelled'));

-- Add comment to explain the change
COMMENT ON COLUMN tours.status IS 'Tour status: pending, active, completed, or cancelled'; 