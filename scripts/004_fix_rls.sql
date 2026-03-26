-- Fix RLS policies for workouts table
DROP POLICY IF EXISTS "workouts_select_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_insert_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_update_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_delete_own" ON public.workouts;

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies
CREATE POLICY "workouts_select_own" ON public.workouts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workouts_insert_own" ON public.workouts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts_update_own" ON public.workouts 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "workouts_delete_own" ON public.workouts 
  FOR DELETE USING (auth.uid() = user_id);

-- Test user permissions (sostituisci con il tuo user_id)
SELECT 
  auth.uid() as current_user_id,
  '120a2ee2-3ae8-42bc-9451-8da65f2a1eee'::uuid as test_user_id,
  auth.uid() = '120a2ee2-3ae8-42bc-9451-8da65f2a1eee'::uuid as is_same_user;
