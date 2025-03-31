-- Drop existing stripe_payment_link column
ALTER TABLE users
DROP COLUMN stripe_payment_link;

-- Add Stripe-related columns to users table
ALTER TABLE users
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN stripe_account_status TEXT,
ADD COLUMN stripe_account_enabled BOOLEAN DEFAULT false,
ADD COLUMN stripe_account_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN stripe_account_updated_at TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the columns
COMMENT ON COLUMN users.stripe_account_id IS 'The Stripe Connect account ID for the tour guide';
COMMENT ON COLUMN users.stripe_account_status IS 'The current status of the Stripe Connect account (e.g., pending, active, rejected)';
COMMENT ON COLUMN users.stripe_account_enabled IS 'Whether the Stripe Connect account is enabled for accepting payments';
COMMENT ON COLUMN users.stripe_account_created_at IS 'When the Stripe Connect account was created';
COMMENT ON COLUMN users.stripe_account_updated_at IS 'When the Stripe Connect account was last updated';

-- Create an index on stripe_account_id for faster lookups
CREATE INDEX idx_users_stripe_account_id ON users(stripe_account_id); 