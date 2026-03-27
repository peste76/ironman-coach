import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id, strava_activity_id } = await request.json()

    if (!id && !strava_activity_id) {
      return NextResponse.json({ error: "Workout ID or strava_activity_id required" }, { status: 400 })
    }

    // Use the authenticated server-side client (RLS) so we don't depend on SERVICE_ROLE in production.
    const adminSupabase = supabase

    // Use either id or strava_activity_id search to avoid 404 loops
    const workoutQuery = adminSupabase
      .from("workouts")
      .select("id, strava_activity_id, user_id")
      .or(
        id ? `id.eq.${id}${strava_activity_id ? `,strava_activity_id.eq.${strava_activity_id}` : ""}` :
        `strava_activity_id.eq.${strava_activity_id}`
      )
      .maybeSingle()

    const { data: workout, error: fetchError } = await workoutQuery

    if (fetchError) {
      console.error("Fetch error during workout query:", fetchError)
      return NextResponse.json({ error: `Workout lookup failed: ${fetchError.message}` }, { status: 500 })
    }

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 })
    }

    if (workout.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    let error
    const workoutId = workout.id

    if (workout.strava_activity_id) {
      const result = await adminSupabase
        .from("workouts")
        .update({
          user_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", workoutId)
      error = result.error
    } else {
      const result = await adminSupabase
        .from("workouts")
        .delete()
        .eq("id", id)
      error = result.error
    }

    if (error) {
      return NextResponse.json({ error: `Failed to delete: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: `Error: ${(err as Error).message}` }, { status: 500 })
  }
}
