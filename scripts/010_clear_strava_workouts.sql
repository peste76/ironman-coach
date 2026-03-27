-- Delete all Strava-synced workouts to allow fresh resync
-- This will remove all workouts with strava_activity_id (only Strava activities)
-- Manual workouts will be preserved

DELETE FROM public.workouts 
WHERE strava_activity_id IS NOT NULL;

-- Verify deletion
SELECT COUNT(*) as remaining_workouts, 
       COUNT(CASE WHEN strava_activity_id IS NOT NULL THEN 1 END) as strava_workouts,
       COUNT(CASE WHEN strava_activity_id IS NULL THEN 1 END) as manual_workouts
FROM public.workouts;

-- Show remaining manual workouts (if any)
SELECT id, title, date, type, strava_activity_id 
FROM public.workouts 
WHERE strava_activity_id IS NULL
ORDER BY date DESC;
