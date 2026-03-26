-- Add AI-related fields to workouts table
ALTER TABLE public.workouts
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS planned_distance_km DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_plan_id UUID REFERENCES public.training_plans(id) ON DELETE SET NULL;

-- Add index for AI plan queries
CREATE INDEX IF NOT EXISTS idx_workouts_ai_plan ON public.workouts(user_id, ai_plan_id, ai_generated);