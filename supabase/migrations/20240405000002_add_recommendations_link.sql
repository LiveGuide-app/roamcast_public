-- Add recommendations_link column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS recommendations_link TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN users.recommendations_link IS 'External link to guide recommendations document'; 