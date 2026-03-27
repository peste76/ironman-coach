-- Add training metrics columns to workouts table
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
ADD COLUMN IF NOT EXISTS tss INTEGER CHECK (tss >= 0),
ADD COLUMN IF NOT EXISTS training_load_score INTEGER CHECK (training_load_score >= 0),
ADD COLUMN IF NOT EXISTS avg_heart_rate INTEGER CHECK (avg_heart_rate > 0),
ADD COLUMN IF NOT EXISTS max_heart_rate INTEGER CHECK (max_heart_rate > 0),
ADD COLUMN IF NOT EXISTS avg_power INTEGER CHECK (avg_power >= 0),
ADD COLUMN IF NOT EXISTS elevation_gain INTEGER CHECK (elevation_gain >= 0),
ADD COLUMN IF NOT EXISTS avg_cadence INTEGER CHECK (avg_cadence >= 0),
ADD COLUMN IF NOT EXISTS intensity_factor DECIMAL(3,2) CHECK (intensity_factor >= 0);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_training_load ON public.workouts(user_id, date, training_load_score);
CREATE INDEX IF NOT EXISTS idx_workouts_tss ON public.workouts(user_id, tss);
CREATE INDEX IF NOT EXISTS idx_workouts_rpe ON public.workouts(user_id, rpe);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workouts' 
  AND table_schema = 'public'
  AND column_name IN ('rpe', 'tss', 'training_load_score')
ORDER BY ordinal_position;
