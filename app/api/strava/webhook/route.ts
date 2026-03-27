import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

// Strava webhook verification
function verifyStravaWebhook(signature: string, body: string): boolean {
  const secret = process.env.STRAVA_WEBHOOK_SECRET
  if (!secret) return false
  
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const expectedSignature = `sha256=${hmac.digest('hex')}`
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-strava-signature') || ''
  
  if (!verifyStravaWebhook(signature, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(body)
  console.log("Strava webhook event:", event)

  // Handle different event types
  if (event.aspect_type === "create") {
    await handleActivityCreated(event.object_id)
  } else if (event.aspect_type === "update") {
    await handleActivityUpdated(event.object_id)
  } else if (event.aspect_type === "delete") {
    await handleActivityDeleted(event.object_id)
  }

  return NextResponse.json({ status: "ok" })
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

export async function GET(request: Request) {
  // Strava webhook verification
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge })
  }

  return NextResponse.json({ error: "Invalid verification" }, { status: 400 })
}

async function handleActivityCreated(activityId: number) {
  const supabase = await createClient()
  
  // Find user with this Strava activity
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("strava_connected", true)

  if (!profiles) return

  // For each connected user, try to sync this activity
  for (const profile of profiles) {
    try {
      // Get user's Strava tokens
      const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
      const metadata = userData.user?.user_metadata
      
      if (!metadata?.strava_access_token || !metadata?.strava_refresh_token) continue

      let accessToken = metadata.strava_access_token
      const refreshToken = metadata.strava_refresh_token
      const expiresAt = metadata.strava_token_expires_at

      if (expiresAt && Date.now() / 1000 > expiresAt - 300) {
        try {
          const newTokens = await refreshStravaToken(refreshToken)
          accessToken = newTokens.access_token

          await supabase.auth.admin.updateUserById(profile.id, {
            data: {
              strava_access_token: newTokens.access_token,
              strava_refresh_token: newTokens.refresh_token,
              strava_token_expires_at: newTokens.expires_at,
            }
          })
        } catch (refreshError) {
          console.error(`Unable to refresh token for user ${profile.id}:`, refreshError)
          continue
        }
      }

      // Fetch the specific activity from Strava
      const response = await fetch(
        `https://www.strava.com/api/v3/activities/${activityId}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) continue

      const activity = await response.json()
      
      // Check if this activity belongs to this user
      if (activity.athlete.id !== metadata.strava_athlete_id) continue

      // Import this activity using the same logic as sync
      await importSingleActivity(supabase, profile.id, activity)
      
    } catch (error) {
      console.error(`Error importing activity ${activityId} for user ${profile.id}:`, error)
    }
  }
}

async function handleActivityUpdated(activityId: number) {
  // Reuse existing create flow for updates
  await handleActivityCreated(activityId)
}

async function handleActivityDeleted(activityId: number) {
  const supabase = await createClient()
  
  // Delete the activity from our database
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("strava_activity_id", activityId)
    
  if (error) {
    console.error(`Error deleting activity ${activityId}:`, error)
  }
}

async function importSingleActivity(supabase: any, userId: string, activity: any) {
  // Reuse the same logic from the sync endpoint
  // This is a simplified version - in production you'd extract this to a shared function
  
  const workoutData = {
    user_id: userId,
    strava_activity_id: activity.id,
    type: mapStravaType(activity.sport_type || activity.type),
    sport: mapStravaType(activity.sport_type || activity.type),
    title: activity.name,
    duration_minutes: Math.round(activity.moving_time / 60),
    planned_distance_km: activity.distance / 1000,
    date: activity.start_date_local.split("T")[0],
    description: activity.description || `Synced from Strava`,
    strava_data: activity,
    rpe: calculateRPE(activity),
    tss: calculateTSS(activity, calculateRPE(activity)),
    training_load_score: calculateTrainingLoadScore(activity, calculateTSS(activity, calculateRPE(activity)), calculateRPE(activity)),
    avg_heart_rate: activity.average_heartrate || null,
    max_heart_rate: activity.max_heartrate || null,
    avg_power: activity.average_watts || null,
    elevation_gain: activity.total_elevation_gain || null,
    avg_cadence: activity.average_cadence || null,
    strava_activity_type: activity.sport_type || activity.type,
    is_manual_entry: activity.manual || false,
    has_power_meter: !!activity.average_watts,
    has_heart_rate_monitor: !!activity.average_heartrate,
  }

  const { error } = await supabase
    .from("workouts")
    .upsert(workoutData, { onConflict: "strava_activity_id" })

  if (error) {
    console.error("Error importing single activity:", error)
  }
}

// Helper functions (these should be extracted to a shared module)
function mapStravaType(stravaType: string): string {
  const typeMap: Record<string, string> = {
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

function calculateRPE(activity: any): number {
  // Simplified RPE calculation
  const type = activity.sport_type || activity.type
  const duration = activity.moving_time / 60
  
  let baseRPE = 3
  if (type === 'Ride' || type === 'VirtualRide') {
    baseRPE = duration > 90 ? 6 : duration > 45 ? 5 : 4
  } else if (type === 'Run' || type === 'VirtualRun') {
    baseRPE = duration > 60 ? 7 : duration > 30 ? 6 : 5
  }
  
  return Math.max(1, Math.min(10, baseRPE))
}

function calculateTSS(activity: any, rpe: number): number {
  const duration = activity.moving_time / 60
  return Math.round(duration * (rpe / 10) * 10)
}

function calculateTrainingLoadScore(activity: any, tss: number, rpe: number): number {
  const durationScore = Math.min((activity.moving_time / 60) / 120 * 50, 50)
  const intensityScore = rpe * 5
  return durationScore + intensityScore
}
