-- Fix for authentication security warnings

-- This SQL uses supabase's auth.config() function to update authentication settings
-- Note: This requires auth admin privileges

-- 1. Set a more secure OTP expiry time (reducing from default to recommended value)
-- 2. Enable leaked password protection

UPDATE auth.config
SET 
  -- Set OTP lifetime to a more secure duration (1 hour instead of longer default)
  otp_lifetime = 3600,
  
  -- Enable leaked password protection
  enable_leaked_password_protection = true;

-- Add comment explaining this change
COMMENT ON TABLE auth.config IS 'Authentication configuration updated on 2024-04-06 to address security warnings'; 