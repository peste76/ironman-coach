-- Add user_deleted column to prevent re-import of deleted workouts
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS user_deleted BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_workouts_user_deleted ON public.workouts(user_id, user_deleted);

-- Update sync to skip user-deleted workouts
-- The sync query should now include: .eq("user_deleted", false)

COMMENT ON COLUMN public.workouts.user_deleted IS 'Flag to prevent re-import from Strava when user manually deletes a workout';
