-- Fix workouts schema to match application requirements
-- This script ensures all required columns exist

-- Add columns if they don't exist
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS distance TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update any existing constraints if needed
ALTER TABLE public.workouts 
ALTER COLUMN distance SET DEFAULT NULL,
ALTER COLUMN duration SET DEFAULT NULL,
ALTER COLUMN notes SET DEFAULT NULL;

-- Fix existing data with invalid types before adding constraint
UPDATE public.workouts 
SET type = 'strength' 
WHERE type NOT IN ('swim', 'bike', 'run', 'strength');

-- Ensure the type constraint is correct (drop if exists, then add)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'workouts_type_check'
    ) THEN
        ALTER TABLE public.workouts DROP CONSTRAINT workouts_type_check;
    END IF;
    
    ALTER TABLE public.workouts 
    ADD CONSTRAINT workouts_type_check 
    CHECK (type IN ('swim', 'bike', 'run', 'strength'));
END $$;

-- Recreate RLS policies to ensure they're correct
DROP POLICY IF EXISTS "workouts_select_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_insert_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_update_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_delete_own" ON public.workouts;

CREATE POLICY "workouts_select_own" ON public.workouts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workouts_insert_own" ON public.workouts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts_update_own" ON public.workouts 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "workouts_delete_own" ON public.workouts 
  FOR DELETE USING (auth.uid() = user_id);
