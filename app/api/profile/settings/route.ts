import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Get user profile settings
    const profileData = {
      race_date: user.user_metadata?.race_date || null,
      full_name: user.user_metadata?.full_name || null,
      fitness_level: user.user_metadata?.fitness_level || "beginner",
      target_time: user.user_metadata?.target_time || null,
      experience: user.user_metadata?.experience || null
    }

    return NextResponse.json(profileData)
  } catch (error) {
    console.error("Error fetching profile settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const settings = await request.json()
    
    // Update user metadata with profile settings
    const { error } = await supabase.auth.updateUser({
      data: {
        race_date: settings.race_date || null,
        full_name: settings.full_name || null,
        fitness_level: settings.fitness_level || "beginner",
        target_time: settings.target_time || null,
        experience: settings.experience || null
      }
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating profile settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
