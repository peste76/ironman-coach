import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type WorkoutType = "swim" | "bike" | "run" | "strength"

function mapStravaType(stravaType: string): WorkoutType {
  const typeMap: Record<string, WorkoutType> = {
    "Swim": "swim",
    "Ride": "bike",
    "VirtualRide": "bike",
    "Run": "run",
    "VirtualRun": "run",
    "Walk": "run",
    "Hike": "run",
    "WeightTraining": "strength",
    "Workout": "strength",
    "Crossfit": "strength",
  }
  return typeMap[stravaType] || "strength"
}

async function refreshStravaToken(refreshToken: string) {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  
  if (!response.ok) {
    throw new Error("Failed to refresh Strava token")
  }
  
  return response.json()
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  
  const stravaConnected = user.user_metadata?.strava_connected
  if (!stravaConnected) {
    return NextResponse.json({ error: "Strava not connected" }, { status: 400 })
  }
  
  let accessToken = user.user_metadata?.strava_access_token
  const refreshToken = user.user_metadata?.strava_refresh_token
  const expiresAt = user.user_metadata?.strava_token_expires_at
  
  // Check if token needs refresh
  if (expiresAt && Date.now() / 1000 > expiresAt - 300) {
    try {
      const newTokens = await refreshStravaToken(refreshToken)
      accessToken = newTokens.access_token
      
      // Update tokens in user metadata
      await supabase.auth.updateUser({
        data: {
          strava_access_token: newTokens.access_token,
          strava_refresh_token: newTokens.refresh_token,
          strava_token_expires_at: newTokens.expires_at,
        }
      })
    } catch {
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 401 })
    }
  }
  
  try {
    // Fetch recent activities from Strava (last 90 days, better for training analysis)
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60)
    
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${ninetyDaysAgo}&per_page=100`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    )
    
    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text()
      console.error("Strava API error:", errorText)
      return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
    }
    
    const activities = await activitiesResponse.json()
    
    // Filter out unwanted activities and manual entries
    const filteredActivities = activities.filter((activity: any) => {
      // Exclude manual entries (no GPS data)
      if (activity.manual) return false
      
      // Include only training-relevant sports
      const validTypes = ['Swim', 'Ride', 'VirtualRide', 'Run', 'VirtualRun', 'Walk', 'Hike', 'WeightTraining', 'Workout', 'Crossfit']
      if (!validTypes.includes(activity.type) && !validTypes.includes(activity.sport_type)) return false
      
      // Exclude very short activities (< 5 minutes)
      if (activity.moving_time && activity.moving_time < 300) return false
      
      return true
    })
    
    console.log(`Filtered ${filteredActivities.length} activities from ${activities.length} total`)
    
    // Get existing Strava activities to avoid duplicates
    // Also get user_deleted activities to prevent re-import
    const { data: existingWorkouts } = await supabase
      .from("workouts")
      .select("strava_activity_id, user_deleted")
      .eq("user_id", user.id)
      .not("strava_activity_id", "is", null)
    
    // Create sets for efficient lookup
    const existingStravaIds = new Set(
      existingWorkouts
        ?.filter(w => !w.user_deleted) // Only non-deleted
        .map(w => w.strava_activity_id) || []
    )
    
    const deletedStravaIds = new Set(
      existingWorkouts
        ?.filter(w => w.user_deleted) // User-deleted ones
        .map(w => w.strava_activity_id) || []
    )
    
    // Filter out already synced activities AND user-deleted activities
    const newActivities = filteredActivities.filter(
      (a: { id: number }) => !existingStravaIds.has(a.id) && !deletedStravaIds.has(a.id)
    )
    
    console.log(`Found ${newActivities.length} new activities to import (skipped ${deletedStravaIds.size} user-deleted)`)
    
    // Training calculation functions
    function calculateRPE(activity: any): number {
      const type = activity.sport_type || activity.type
      const duration = activity.moving_time / 60 // minutes
      const distance = activity.distance / 1000 // km
      
      // Base RPE by activity type
      let baseRPE = 3
      if (type === 'Ride' || type === 'VirtualRide') {
        baseRPE = distance > 50 ? 6 : distance > 25 ? 5 : 4
      } else if (type === 'Run' || type === 'VirtualRun') {
        baseRPE = distance > 10 ? 7 : distance > 5 ? 6 : 5
      } else if (type === 'Swim') {
        baseRPE = distance > 2 ? 6 : distance > 1 ? 5 : 4
      } else if (type === 'WeightTraining' || type === 'Workout') {
        baseRPE = duration > 60 ? 6 : duration > 30 ? 5 : 4
      }
      
      // Adjust based on heart rate if available
      if (activity.average_heartrate) {
        const maxHR = 220 - 30 // Assuming 30 years old, should be calculated from user profile
        const hrPercent = (activity.average_heartrate / maxHR) * 100
        if (hrPercent > 85) baseRPE += 2
        else if (hrPercent > 75) baseRPE += 1
        else if (hrPercent < 60) baseRPE -= 1
      }
      
      return Math.max(1, Math.min(10, baseRPE))
    }
    
    function calculateTSS(activity: any, rpe: number): number {
      const duration = activity.moving_time / 60 // minutes
      const type = activity.sport_type || activity.type
      
      // Simplified TSS calculation: duration * intensity factor
      let intensityFactor = rpe / 10
      
      // Adjust intensity factor by activity type
      if (type === 'Ride' || type === 'VirtualRide') {
        intensityFactor *= 1.2 // Cycling typically higher sustained intensity
      } else if (type === 'Swim') {
        intensityFactor *= 0.8 // Swimming typically lower impact
      }
      
      return Math.round(duration * intensityFactor * 10)
    }
    
    function calculateTrainingLoadScore(activity: any, tss: number, rpe: number): number {
      // Combined training load score (0-100)
      const durationScore = Math.min((activity.moving_time / 60) / 120 * 50, 50) // Max 50 points for 2h+
      const intensityScore = rpe * 5 // Max 50 points for RPE 10
      return durationScore + intensityScore
    }
    
    // Insert / update activities with expanded fields for AI evaluation
    const workoutsToInsert = newActivities.map((activity: any) => {
      const rpe = calculateRPE(activity)
      const tss = calculateTSS(activity, rpe)
      const trainingLoadScore = calculateTrainingLoadScore(activity, tss, rpe)
      const activityType = activity.sport_type || activity.type
      
      return {
        user_id: user.id,
        strava_activity_id: activity.id,
        type: mapStravaType(activityType),
        sport: mapStravaType(activityType),
        title: activity.name,
        duration_minutes: Math.round(activity.moving_time / 60),
        planned_distance_km: activity.distance / 1000,
        date: activity.start_date_local.split("T")[0],
        description: activity.description || `Synced from Strava`,
        notes: activity.description || null,
        intensity: activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : null,
        rpe,
        tss,
        training_load_score: trainingLoadScore,
        avg_heart_rate: activity.average_heartrate || null,
        max_heart_rate: activity.max_heartrate || null,
        avg_power: activity.average_watts || null,
        elevation_gain: activity.total_elevation_gain || null,
        avg_cadence: activity.average_cadence || null,
        avg_speed: activity.average_speed || null,
        max_speed: activity.max_speed || null,
        strava_activity_type: activityType,
        is_manual_entry: activity.manual || false,
        has_power_meter: !!activity.average_watts,
        has_heart_rate_monitor: !!activity.average_heartrate,
        strava_data: activity,
      }
    })
    
    if (workoutsToInsert.length > 0) {
      const { error } = await supabase
        .from("workouts")
        .upsert(workoutsToInsert, { onConflict: "strava_activity_id" })
      
      if (error) {
        console.error("Error upserting workouts:", error)
        return NextResponse.json({ error: "Failed to save activities" }, { status: 500 })
      }
    }
    
    return NextResponse.json({ 
      synced: workoutsToInsert.length,
      message: `Synced ${workoutsToInsert.length} new activities from Strava`
    })
    
  } catch (err) {
    console.error("Strava sync error:", err)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
