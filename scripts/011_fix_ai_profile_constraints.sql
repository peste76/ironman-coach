-- Fix AI profile constraints to allow empty training days
-- This allows users to save their profile before selecting training days

ALTER TABLE public.user_ai_profiles
DROP CONSTRAINT IF EXISTS user_ai_profiles_training_days_check;

-- Update the constraint to allow empty arrays
ALTER TABLE public.user_ai_profiles
ADD CONSTRAINT user_ai_profiles_training_days_check
CHECK (training_days IS NULL OR array_length(training_days, 1) >= 0);