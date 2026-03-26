import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const results = {}

    // Try to query each table
    try {
      const { data, error } = await supabase.from('user_ai_profiles').select('count').limit(1)
      results.user_ai_profiles = error ? `Error: ${error.message}` : 'Exists'
    } catch (e) {
      results.user_ai_profiles = 'Does not exist'
    }

    try {
      const { data, error } = await supabase.from('training_plans').select('count').limit(1)
      results.training_plans = error ? `Error: ${error.message}` : 'Exists'
    } catch (e) {
      results.training_plans = 'Does not exist'
    }

    try {
      const { data, error } = await supabase.from('workout_analyses').select('count').limit(1)
      results.workout_analyses = error ? `Error: ${error.message}` : 'Exists'
    } catch (e) {
      results.workout_analyses = 'Does not exist'
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}