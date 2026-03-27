import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  return handleDelete(request)
}

export async function DELETE(request: NextRequest) {
  return handleDelete(request)
}

async function handleDelete(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error("No user authenticated")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await request.json()

    console.log("Delete request for workout ID:", id, "by user:", user.id)

    if (!id) {
      return NextResponse.json({ error: "Workout ID required" }, { status: 400 })
    }

    // No service key needed — use the authenticated server-side client and RLS
    const adminSupabase = supabase

    // First, get the workout to verify ownership and type
    const { data: workout, error: fetchError } = await adminSupabase
      .from("workouts")
      .select("strava_activity_id, user_id")
      .eq("id", id)
      .single()

    console.log("Fetched workout:", workout, "fetchError:", fetchError)

    if (fetchError || !workout) {
      console.error("Workout not found or fetch error:", fetchError)
      return NextResponse.json({ error: "Workout not found" }, { status: 404 })
    }

    // Verify user owns this workout
    if (workout.user_id !== user.id) {
      console.error("User does not own workout:", workout.user_id, "vs", user.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    let error

    if (workout.strava_activity_id) {
      console.log("Doing soft delete for Strava workout")
      // Soft delete for Strava workouts - mark as user_deleted
      const result = await adminSupabase
        .from("workouts")
        .update({
          user_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
      error = result.error
    } else {
      console.log("Doing hard delete for manual/AI workout")
      // Hard delete for manual workouts
      const result = await adminSupabase
        .from("workouts")
        .delete()
        .eq("id", id)
      error = result.error
      console.log("Hard delete result:", result)
    }

    if (error) {
      console.error("Error deleting workout:", error)
      return NextResponse.json({ error: `Failed to delete workout: ${error.message}` }, { status: 500 })
    }

    console.log("Workout deleted successfully")
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Unexpected error in delete API:", err)
    return NextResponse.json({ error: `Unexpected error: ${(err as Error).message}` }, { status: 500 })
  }
}
