-- ========================================
-- ENHANCED WORKOUTS SCHEMA FOR TRAINING ANALYTICS
-- ========================================

-- Add comprehensive training metrics columns to workouts table
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

-- Performance indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_workouts_training_load ON public.workouts(user_id, date, training_load_score);
CREATE INDEX IF NOT EXISTS idx_workouts_strava_type ON public.workouts(user_id, strava_activity_type);
CREATE INDEX IF NOT EXISTS idx_workouts_tss ON public.workouts(user_id, tss);
CREATE INDEX IF NOT EXISTS idx_workouts_rpe ON public.workouts(user_id, rpe);
CREATE INDEX IF NOT EXISTS idx_workouts_date_type ON public.workouts(user_id, date, type);

-- Training summary table for weekly analytics
CREATE TABLE IF NOT EXISTS public.training_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  total_tss INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  total_distance_km DECIMAL(10,2) DEFAULT 0,
  avg_rpe DECIMAL(3,2) DEFAULT 0,
  training_stress_balance INTEGER DEFAULT 0,
  chronic_training_load INTEGER DEFAULT 0,  -- CTL (42-day avg)
  acute_training_load INTEGER DEFAULT 0,    -- ATL (7-day avg)
  workout_count INTEGER DEFAULT 0,
  swim_count INTEGER DEFAULT 0,
  bike_count INTEGER DEFAULT 0,
  run_count INTEGER DEFAULT 0,
  strength_count INTEGER DEFAULT 0,
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

-- Indexes for training_summary
CREATE INDEX IF NOT EXISTS idx_training_summary_user_week ON public.training_summary(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_training_summary_ctl_atl ON public.training_summary(user_id, chronic_training_load, acute_training_load);

-- Function to automatically update training_summary when workouts are inserted/updated
CREATE OR REPLACE FUNCTION update_training_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.training_summary (
    user_id, 
    week_start_date,
    total_tss,
    total_duration_minutes,
    total_distance_km,
    avg_rpe,
    workout_count,
    swim_count,
    bike_count,
    run_count,
    strength_count
  )
  SELECT 
    NEW.user_id,
    date_trunc('week', NEW.date::date)::DATE as week_start,
    COALESCE(SUM(tss), 0),
    COALESCE(SUM(duration_minutes), 0),
    COALESCE(SUM(planned_distance_km), 0),
    COALESCE(AVG(rpe), 0),
    COUNT(*),
    SUM(CASE WHEN type = 'swim' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'bike' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'run' THEN 1 ELSE 0 END),
    SUM(CASE WHEN type = 'strength' THEN 1 ELSE 0 END)
  FROM public.workouts 
  WHERE user_id = NEW.user_id 
    AND date_trunc('week', date::date) = date_trunc('week', NEW.date::date)
  ON CONFLICT (user_id, week_start_date) 
  DO UPDATE SET
    total_tss = EXCLUDED.total_tss,
    total_duration_minutes = EXCLUDED.total_duration_minutes,
    total_distance_km = EXCLUDED.total_distance_km,
    avg_rpe = EXCLUDED.avg_rpe,
    workout_count = EXCLUDED.workout_count,
    swim_count = EXCLUDED.swim_count,
    bike_count = EXCLUDED.bike_count,
    run_count = EXCLUDED.run_count,
    strength_count = EXCLUDED.strength_count,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update training summaries
CREATE TRIGGER trigger_update_training_summary_insert
  AFTER INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION update_training_summary();

CREATE TRIGGER trigger_update_training_summary_update
  AFTER UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION update_training_summary();

CREATE TRIGGER trigger_update_training_summary_delete
  AFTER DELETE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION update_training_summary();

-- Function to calculate ATL/CTL/TSB for all weeks
CREATE OR REPLACE FUNCTION calculate_atl_ctl_tsb()
RETURNS VOID AS $$
DECLARE
  week_record RECORD;
  atl INTEGER;
  ctl INTEGER;
BEGIN
  FOR week_record IN 
    SELECT DISTINCT user_id, week_start_date 
    FROM public.training_summary 
    ORDER BY user_id, week_start_date
  LOOP
    -- Calculate ATL (7-day average)
    SELECT COALESCE(AVG(total_tss), 0) INTO atl
    FROM public.training_summary 
    WHERE user_id = week_record.user_id 
      AND week_start_date >= week_record.week_start_date - INTERVAL '6 days'
      AND week_start_date <= week_record.week_start_date;
    
    -- Calculate CTL (42-day average)
    SELECT COALESCE(AVG(total_tss), 0) INTO ctl
    FROM public.training_summary 
    WHERE user_id = week_record.user_id 
      AND week_start_date >= week_record.week_start_date - INTERVAL '41 days'
      AND week_start_date <= week_record.week_start_date;
    
    -- Update the record
    UPDATE public.training_summary 
    SET 
      acute_training_load = ROUND(atl),
      chronic_training_load = ROUND(ctl),
      training_stress_balance = ROUND(ctl - atl),
      updated_at = NOW()
    WHERE user_id = week_record.user_id 
      AND week_start_date = week_record.week_start_date;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the training metrics
COMMENT ON COLUMN public.workouts.rpe IS 'Rate of Perceived Exertion (1-10 scale)';
COMMENT ON COLUMN public.workouts.tss IS 'Training Stress Score (0-100+)';
COMMENT ON COLUMN public.workouts.training_load_score IS 'Combined training load score (0-100)';
COMMENT ON COLUMN public.workouts.intensity_factor IS 'Intensity factor for power-based training';
COMMENT ON COLUMN public.workouts.avg_heart_rate IS 'Average heart rate in BPM';
COMMENT ON COLUMN public.workouts.max_heart_rate IS 'Maximum heart rate in BPM';
COMMENT ON COLUMN public.workouts.avg_power IS 'Average power in watts';
COMMENT ON COLUMN public.workouts.elevation_gain IS 'Total elevation gain in meters';
COMMENT ON COLUMN public.workouts.avg_cadence IS 'Average cadence in RPM/steps per minute';
COMMENT ON TABLE public.training_summary IS 'Weekly training summary with ATL/CTL/TSB calculations';
