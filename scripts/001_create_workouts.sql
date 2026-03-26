-- Create workouts table with notes field
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('swim', 'bike', 'run', 'strength')),
  title TEXT NOT NULL,
  duration TEXT,
  distance TEXT,
  notes TEXT,
  date DATE NOT NULL,
  strava_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "workouts_select_own" ON public.workouts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workouts_insert_own" ON public.workouts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts_update_own" ON public.workouts 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "workouts_delete_own" ON public.workouts 
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workouts_strava_id ON public.workouts(strava_id);
