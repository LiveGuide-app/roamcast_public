-- Fix for "Function Search Path Mutable" warnings
-- This migration sets the default search_path to 'public' for the database
-- This ensures all functions use a non-mutable search path by default

-- Set the default search path for the database
ALTER DATABASE postgres SET search_path TO public;

-- Reset the search path for the current session
SET search_path TO public;

-- Add comment explaining this change
COMMENT ON DATABASE postgres IS 'Default public schema search path set to mitigate SQL injection risks'; 