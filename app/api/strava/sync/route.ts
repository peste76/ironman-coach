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

function formatStravaSummary(activity: any): string {
  const type = activity.sport_type || activity.type || 'Unknown'
  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : 'n/a'
  const durationMin = activity.moving_time ? Math.round(activity.moving_time / 60) : 0
  const avgHrt = activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : 'n/a'
  const maxHrt = activity.max_heartrate ? `${Math.round(activity.max_heartrate)} bpm` : 'n/a'
  const avgPwd = activity.average_watts ? `${Math.round(activity.average_watts)} W` : 'n/a'
  const elevation = activity.total_elevation_gain ?? 'n/a'
  const cadence = activity.average_cadence ? `${Math.round(activity.average_cadence)} rpm` : 'n/a'

  return `Strava sync details:\n- Type: ${type}\n- Distance: ${distanceKm} km\n- Duration: ${durationMin} min\n- Avg HR: ${avgHrt}\n- Max HR: ${maxHrt}\n- Avg Power: ${avgPwd}\n- Elevation: ${elevation} m\n- Cadence: ${cadence}`
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
    const { data: existingWorkouts } = await supabase
      .from("workouts")
      .select("strava_activity_id")
      .eq("user_id", user.id)
      .not("strava_activity_id", "is", null)
    
    const existingStravaIds = new Set(existingWorkouts?.map(w => w.strava_activity_id) || [])
    
    // Filter out already synced activities
    const newActivities = filteredActivities.filter(
      (a: { id: number }) => !existingStravaIds.has(a.id)
    )
    
    console.log(`Found ${newActivities.length} new activities to import`)
    
    // Insert new activities with basic columns only
    const workoutsToInsert = newActivities.map((activity: any) => {
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
        description: activity.description || formatStravaSummary(activity),
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
