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

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Workout ID required" }, { status: 400 })
    }

    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRole) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRole
    )

    const { data: workout, error: fetchError } = await adminSupabase
      .from("workouts")
      .select("strava_activity_id, user_id")
      .eq("id", id)
      .single()

    if (fetchError || !workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 })
    }

    if (workout.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    let error

    if (workout.strava_activity_id) {
      const result = await adminSupabase
        .from("workouts")
        .update({
          user_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
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
