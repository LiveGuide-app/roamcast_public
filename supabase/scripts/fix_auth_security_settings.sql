-- Script to fix authentication security warnings
-- Run this in the Supabase SQL Editor

-- Fix for "Auth OTP Long Expiry" warning
-- Fix for "Leaked Password Protection Disabled" warning
UPDATE auth.config
SET 
  -- Set OTP lifetime to 10 minutes (600 seconds)
  otp_lifetime = 600,
  
  -- Enable leaked password protection
  enable_leaked_password_protection = true;

-- Verify the changes
SELECT 
  otp_lifetime,
  enable_leaked_password_protection
FROM auth.config; 