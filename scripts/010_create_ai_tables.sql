-- ========================================
-- AI TRAINING PLANNER TABLES
-- ========================================

-- User AI Profiles table
CREATE TABLE IF NOT EXISTS public.user_ai_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_race_date DATE,
  target_race_distance TEXT, -- e.g., "70.3", "Ironman", "Marathon"
  target_race_name TEXT,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  weekly_training_hours INTEGER CHECK (weekly_training_hours >= 1 AND weekly_training_hours <= 168),
  training_days TEXT[] CHECK (array_length(training_days, 1) >= 1), -- ['monday', 'wednesday', 'friday']
  available_equipment TEXT[], -- ['bike', 'treadmill', 'pool', 'weights', 'heart_rate_monitor']
  ftp_watts INTEGER CHECK (ftp_watts >= 50 AND ftp_watts <= 500), -- Functional Threshold Power
  max_hr INTEGER CHECK (max_hr >= 120 AND max_hr <= 220), -- Maximum Heart Rate
  resting_hr INTEGER CHECK (resting_hr >= 30 AND resting_hr <= 100), -- Resting Heart Rate
  injuries TEXT[], -- ['knee', 'back', 'shoulder']
  training_preferences JSONB DEFAULT '{}', -- Custom preferences
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Training Plans table
CREATE TABLE IF NOT EXISTS public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  plan_data JSONB NOT NULL, -- Complete AI-generated plan
  ai_analysis JSONB, -- AI analysis of previous week
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Workout Analyses table
CREATE TABLE IF NOT EXISTS public.workout_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_feedback TEXT,
  performance_score DECIMAL(3,1) CHECK (performance_score >= 0 AND performance_score <= 10),
  recommendations TEXT[],
  actual_duration_minutes INTEGER,
  actual_distance_km DECIMAL(6,2),
  actual_avg_hr INTEGER,
  actual_max_hr INTEGER,
  actual_avg_power INTEGER,
  perceived_effort INTEGER CHECK (perceived_effort >= 1 AND perceived_effort <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workout_id)
);

-- Enable RLS
ALTER TABLE public.user_ai_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "user_ai_profiles_select_own" ON public.user_ai_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_ai_profiles_insert_own" ON public.user_ai_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_ai_profiles_update_own" ON public.user_ai_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_ai_profiles_delete_own" ON public.user_ai_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "training_plans_select_own" ON public.training_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "training_plans_insert_own" ON public.training_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "training_plans_update_own" ON public.training_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "training_plans_delete_own" ON public.training_plans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "workout_analyses_select_own" ON public.workout_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workout_analyses_insert_own" ON public.workout_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workout_analyses_update_own" ON public.workout_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workout_analyses_delete_own" ON public.workout_analyses FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ai_profiles_user_id ON public.user_ai_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_user_week ON public.training_plans(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON public.training_plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workout_analyses_workout_id ON public.workout_analyses(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_analyses_user_id ON public.workout_analyses(user_id);

-- Comments
COMMENT ON TABLE public.user_ai_profiles IS 'AI training profiles with user fitness data and preferences';
COMMENT ON TABLE public.training_plans IS 'AI-generated weekly training plans';
COMMENT ON TABLE public.workout_analyses IS 'AI analysis of completed workouts';