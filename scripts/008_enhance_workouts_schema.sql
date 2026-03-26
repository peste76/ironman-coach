-- Add training metrics columns to workouts table
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
ADD COLUMN IF NOT EXISTS tss INTEGER CHECK (tss >= 0),
ADD COLUMN IF NOT EXISTS avg_heart_rate INTEGER CHECK (avg_heart_rate > 0),
ADD COLUMN IF NOT EXISTS max_heart_rate INTEGER CHECK (max_heart_rate > 0),
ADD COLUMN IF NOT EXISTS avg_power INTEGER CHECK (avg_power >= 0),
ADD COLUMN IF NOT EXISTS elevation_gain INTEGER CHECK (elevation_gain >= 0),
ADD COLUMN IF NOT EXISTS avg_cadence INTEGER CHECK (avg_cadence >= 0),
ADD COLUMN IF NOT EXISTS training_load_score INTEGER CHECK (training_load_score >= 0),
ADD COLUMN IF NOT EXISTS intensity_factor DECIMAL(3,2) CHECK (intensity_factor >= 0),
ADD COLUMN IF NOT EXISTS weather_data JSONB,
ADD COLUMN IF NOT EXISTS equipment_used TEXT[],
ADD COLUMN IF NOT EXISTS strava_activity_type TEXT,
ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_power_meter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_heart_rate_monitor BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_training_load ON public.workouts(user_id, date, training_load_score);
CREATE INDEX IF NOT EXISTS idx_workouts_strava_type ON public.workouts(user_id, strava_activity_type);
CREATE INDEX IF NOT EXISTS idx_workouts_tss ON public.workouts(user_id, tss);

-- Create training summary table for analytics
CREATE TABLE IF NOT EXISTS public.training_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  total_tss INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  total_distance_km DECIMAL(10,2) DEFAULT 0,
  avg_rpe DECIMAL(3,2) DEFAULT 0,
  training_stress_balance INTEGER DEFAULT 0,
  chronic_training_load INTEGER DEFAULT 0,
  acute_training_load INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS for training_summary
ALTER TABLE public.training_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for training_summary
CREATE POLICY "training_summary_select_own" ON public.training_summary 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "training_summary_insert_own" ON public.training_summary 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "training_summary_update_own" ON public.training_summary 
  FOR UPDATE USING (auth.uid() = user_id);
