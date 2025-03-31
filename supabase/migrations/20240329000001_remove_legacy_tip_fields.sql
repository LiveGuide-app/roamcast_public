-- Remove legacy tip fields from tour_participants
ALTER TABLE tour_participants
DROP COLUMN IF EXISTS tip_amount,
DROP COLUMN IF EXISTS tip_currency,
DROP COLUMN IF EXISTS tip_status,
DROP COLUMN IF EXISTS tip_payment_intent_id,
DROP COLUMN IF EXISTS tip_created_at,
DROP COLUMN IF EXISTS tip_updated_at; 