import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Get last 12 weeks of training data
    const twelveWeeksAgo = new Date()
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
    
    const { data: workouts, error } = await supabase
      .from("workouts")
      .select("date, tss, duration_minutes, planned_distance_km, rpe, training_load_score, type")
      .eq("user_id", user.id)
      .gte("date", twelveWeeksAgo.toISOString().split('T')[0])
      .order("date", { ascending: true })

    if (error) {
      console.error("Error fetching training data:", error)
      return NextResponse.json({ error: "Failed to fetch training data" }, { status: 500 })
    }

    // Calculate weekly summaries
    const weeklyData = new Map<string, {
      totalTSS: number
      totalDuration: number
      totalDistance: number
      avgRPE: number
      workoutCount: number
      byType: Record<string, number>
    }>()

    workouts?.forEach(workout => {
      const date = new Date(workout.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          totalTSS: 0,
          totalDuration: 0,
          totalDistance: 0,
          avgRPE: 0,
          workoutCount: 0,
          byType: {}
        })
      }

      const week = weeklyData.get(weekKey)!
      week.totalTSS += workout.tss || 0
      week.totalDuration += workout.duration_minutes || 0
      week.totalDistance += workout.planned_distance_km || 0
      week.avgRPE += workout.rpe || 0
      week.workoutCount += 1
      week.byType[workout.type] = (week.byType[workout.type] || 0) + 1
    })

    // Calculate averages and training load metrics
    const summaries = Array.from(weeklyData.entries()).map(([weekStart, data]) => ({
      week_start: weekStart,
      total_tss: data.totalTSS,
      total_duration_minutes: data.totalDuration,
      total_distance_km: Math.round(data.totalDistance * 100) / 100,
      avg_rpe: Math.round((data.avgRPE / data.workoutCount) * 10) / 10,
      workout_count: data.workoutCount,
      by_type: data.byType,
      training_stress_balance: 0, // Will be calculated based on ATL/CTL
      chronic_training_load: 0,  // 42-day average
      acute_training_load: 0     // 7-day average
    }))

    // Calculate ATL (Acute Training Load) and CTL (Chronic Training Load)
    for (let i = 0; i < summaries.length; i++) {
      const current = summaries[i]
      
      // ATL: 7-day average of TSS
      const atlStart = Math.max(0, i - 1)
      const atlWeeks = summaries.slice(atlStart, i + 1)
      current.acute_training_load = Math.round(
        atlWeeks.reduce((sum, week) => sum + week.total_tss, 0) / atlWeeks.length
      )
      
      // CTL: 42-day (6-week) average of TSS
      const ctlStart = Math.max(0, i - 5)
      const ctlWeeks = summaries.slice(ctlStart, i + 1)
      current.chronic_training_load = Math.round(
        ctlWeeks.reduce((sum, week) => sum + week.total_tss, 0) / ctlWeeks.length
      )
      
      // Training Stress Balance: CTL - ATL
      current.training_stress_balance = current.chronic_training_load - current.acute_training_load
    }

    // Calculate fitness trends
    const recentWeeks = summaries.slice(-4) // Last 4 weeks
    const olderWeeks = summaries.slice(-8, -4) // Previous 4 weeks
    
    let trend = "stable"
    if (recentWeeks.length > 0 && olderWeeks.length > 0) {
      const recentAvgTSS = recentWeeks.reduce((sum, week) => sum + week.total_tss, 0) / recentWeeks.length
      const olderAvgTSS = olderWeeks.reduce((sum, week) => sum + week.total_tss, 0) / olderWeeks.length
      
      if (recentAvgTSS > olderAvgTSS * 1.1) trend = "increasing"
      else if (recentAvgTSS < olderAvgTSS * 0.9) trend = "decreasing"
    }

    return NextResponse.json({
      weekly_summaries: summaries,
      trends: {
        direction: trend,
        current_atl: summaries[summaries.length - 1]?.acute_training_load || 0,
        current_ctl: summaries[summaries.length - 1]?.chronic_training_load || 0,
        current_tsb: summaries[summaries.length - 1]?.training_stress_balance || 0
      },
      stats: {
        total_workouts: workouts?.length || 0,
        total_tss_all_time: workouts?.reduce((sum, w) => sum + (w.tss || 0), 0) || 0,
        avg_tss_per_week: Math.round(
          (workouts?.reduce((sum, w) => sum + (w.tss || 0), 0) || 0) / Math.max(1, summaries.length)
        )
      }
    })

  } catch (err) {
    console.error("Training summary error:", err)
    return NextResponse.json({ error: "Failed to calculate training summary" }, { status: 500 })
  }
}
