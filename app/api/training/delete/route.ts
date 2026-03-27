import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

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

    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRole) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRole
    )

    let workout: any = null
    let fetchError: any = null

    if (id) {
      const res = await adminSupabase
        .from("workouts")
        .select("id, strava_activity_id, user_id")
        .eq("id", id)
        .maybeSingle()
      workout = res.data
      fetchError = res.error
    }

    if (!workout && strava_activity_id) {
      const res = await adminSupabase
        .from("workouts")
        .select("id, strava_activity_id, user_id")
        .eq("strava_activity_id", strava_activity_id)
        .maybeSingle()
      workout = res.data
      fetchError = res.error
    }

    if (fetchError) {
      console.error("Fetch error during workout query:", fetchError)
      return NextResponse.json({ error: "Workout lookup failed" }, { status: 500 })
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
