"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { CalendarGrid } from "@/components/dashboard/calendar-grid"
import { AddWorkoutModal } from "@/components/dashboard/add-workout-modal"
import { type WorkoutType } from "@/components/dashboard/workout-card"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface Workout {
  id: string
  type: WorkoutType
  title: string
  duration?: string
  distance?: string
  notes?: string
  date: Date
  strava_activity_id?: number | null
  rpe?: number | null
  tss?: number | null
  training_load_score?: number | null
  avg_heart_rate?: number | null
  max_heart_rate?: number | null
  avg_power?: number | null
  elevation_gain?: number | null
  avg_cadence?: number | null
  strava_activity_type?: string | null
  has_power_meter?: boolean
  has_heart_rate_monitor?: boolean
}

interface DBWorkout {
  id: string
  user_id: string
  type: string
  title: string
  duration_minutes: number | null
  planned_distance_km: number | null
  description: string | null
  date: string
  strava_activity_id: number | null
  rpe?: number | null
  tss?: number | null
  training_load_score?: number | null
  avg_heart_rate?: number | null
  max_heart_rate?: number | null
  avg_power?: number | null
  elevation_gain?: number | null
  avg_cadence?: number | null
  strava_activity_type?: string | null
  has_power_meter?: boolean
  has_heart_rate_monitor?: boolean
}

function formatDuration(minutes: number | null): string | undefined {
  if (!minutes) return undefined
  if (minutes < 60) return `${minutes}m`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

function parseDuration(duration: string): number | null {
  if (!duration) return null
  const hourMatch = duration.match(/(\d+(?:\.\d+)?)\s*h/)
  const minMatch = duration.match(/(\d+)\s*m/)
  let totalMinutes = 0
  if (hourMatch) totalMinutes += parseFloat(hourMatch[1]) * 60
  if (minMatch) totalMinutes += parseInt(minMatch[1])
  if (totalMinutes === 0 && /^\d+$/.test(duration.trim())) {
    totalMinutes = parseInt(duration.trim())
  }
  return totalMinutes > 0 ? Math.round(totalMinutes) : null
}

function parseDistance(distance: string): number | null {
  if (!distance) return null
  const kmMatch = distance.match(/(\d+(?:\.\d+)?)\s*km/i)
  const mMatch = distance.match(/(\d+)\s*m(?!i)/i)
  if (kmMatch) return parseFloat(kmMatch[1])
  if (mMatch) return parseInt(mMatch[1]) / 1000
  const num = parseFloat(distance)
  return isNaN(num) ? null : num
}

function formatDistance(km: number | null): string | undefined {
  if (!km) return undefined
  if (km >= 1) return `${km}km`
  return `${Math.round(km * 1000)}m`
}

function dbToWorkout(db: DBWorkout): Workout {
  return {
    id: db.id,
    type: db.type as WorkoutType,
    title: db.title,
    duration: formatDuration(db.duration_minutes),
    distance: formatDistance(db.planned_distance_km),
    notes: db.description || undefined,
    date: new Date(db.date + "T00:00:00"),
    strava_activity_id: db.strava_activity_id,
    rpe: db.rpe ?? undefined,
    tss: db.tss ?? undefined,
    training_load_score: db.training_load_score ?? undefined,
    avg_heart_rate: db.avg_heart_rate ?? undefined,
    max_heart_rate: db.max_heart_rate ?? undefined,
    avg_power: db.avg_power ?? undefined,
    elevation_gain: db.elevation_gain ?? undefined,
    avg_cadence: db.avg_cadence ?? undefined,
    strava_activity_type: db.strava_activity_type ?? undefined,
    has_power_meter: db.has_power_meter ?? undefined,
    has_heart_rate_monitor: db.has_heart_rate_monitor ?? undefined,
  }
}

function getCalendarDays(year: number, month: number, workouts: Workout[]) {
  // Use localized math to handle day offsets reliably. getDay() returns 0 for Sunday.
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = new Date()
  
  let startPadding = firstDay.getDay() - 1
  if (startPadding < 0) startPadding = 6 // Make Monday index 0
  
  const days = []
  
  const prevMonth = new Date(year, month, 0)
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i)
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      workouts: workouts.filter(w => 
        w.date.getDate() === date.getDate() && 
        w.date.getMonth() === date.getMonth() &&
        w.date.getFullYear() === date.getFullYear()
      )
    })
  }
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear()
    days.push({
      date,
      isCurrentMonth: true,
      isToday,
      workouts: workouts.filter(w => 
        w.date.getDate() === date.getDate() && 
        w.date.getMonth() === date.getMonth() &&
        w.date.getFullYear() === date.getFullYear()
      )
    })
  }
  
  const remaining = 35 - days.length
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      workouts: workouts.filter(w => 
        w.date.getDate() === date.getDate() && 
        w.date.getMonth() === date.getMonth() &&
        w.date.getFullYear() === date.getFullYear()
      )
    })
  }
  
  return days
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isStravaConnected, setIsStravaConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Check auth and load workouts
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)
      
      // Check if connected via Strava (either provider or manual connection)
      const provider = user.app_metadata?.provider
      const stravaConnected = user.user_metadata?.strava_connected
      setIsStravaConnected(provider === "strava" || stravaConnected === true)
      
      // Load workouts from database (exclude user-deleted)
      const { data: workoutsData, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .eq("user_deleted", false)
        .order("date", { ascending: true })
      
      if (error) {
        console.error("Error loading workouts:", error)
      } else if (workoutsData) {
        setWorkouts(workoutsData.map(dbToWorkout))
      }
      
      setLoading(false)
    }
    
    checkAuth()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/auth/login")
      } else if (session?.user) {
        setUser(session.user)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [supabase, router])
  
  const days = useMemo(() => {
    return getCalendarDays(
      currentDate.getFullYear(), 
      currentDate.getMonth(), 
      workouts
    )
  }, [currentDate, workouts])
  
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  
  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleAddEvent = () => {
    setSelectedDate(new Date())
    setIsModalOpen(true)
  }

  const handleStravaSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/strava/sync", { method: "POST" })
      const data = await response.json()
      
      if (response.ok && data.synced > 0) {
        // Reload workouts from database (exclude deleted)
        const { data: workoutsData } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", user?.id)
          .eq("user_deleted", false)
          .order("date", { ascending: true })
        
        if (workoutsData) {
          setWorkouts(workoutsData.map(dbToWorkout))
        }
      }
    } catch (err) {
      console.error("Sync error:", err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAddWorkoutOnDate = useCallback((date: Date) => {
    setSelectedDate(date)
    setIsModalOpen(true)
  }, [])

  const handleWorkoutMove = useCallback(async (workoutId: string, newDate: Date) => {
    const dateStr = newDate.toLocaleDateString('en-CA')
    
    // Optimistically update UI
    setWorkouts(prev => prev.map(w => 
      w.id === workoutId ? { ...w, date: newDate } : w
    ))

    try {
      const { error } = await supabase
        .from('workouts')
        .update({ date: dateStr })
        .eq('id', workoutId)

      if (error) {
        console.error('Error updating workout date:', error)
        // Revert on error
        const { data: workoutsData } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", user?.id)
          .eq("user_deleted", false)
          .order("date", { ascending: true })
        if (workoutsData) setWorkouts(workoutsData.map(dbToWorkout))
      }
    } catch (err) {
      console.error('Exception moving workout:', err)
    }
  }, [supabase, user?.id])

  const handleDeleteWorkout = useCallback(async (id: string) => {
    const workout = workouts.find(w => w.id === id)
    if (!workout) {
      console.error("Workout not found for deletion:", id)
      return
    }

    console.log("Deleting workout:", workout.title, "strava_activity_id:", workout.strava_activity_id)
    
    // Optimistically update UI
    setWorkouts(prev => prev.filter(w => w.id !== id))
    
    try {
      const response = await fetch("/api/training/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, strava_activity_id: workout.strava_activity_id }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete workout")
      }
      
      console.log("Workout deleted successfully")
    } catch (error) {
      console.error("Error deleting workout:", error)
      // Reload workouts on error
      const { data: workoutsData } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user?.id)
        .eq("user_deleted", false)
        .order("date", { ascending: true })
      if (workoutsData) setWorkouts(workoutsData.map(dbToWorkout))
    }
  }, [supabase, user?.id, workouts])

  const handleAddWorkout = useCallback(async (workout: {
    type: WorkoutType
    title: string
    duration: string
    distance: string
    notes: string
    date: Date
  }) => {
    console.log("handleAddWorkout called with:", workout)
    
    if (!user) {
      console.error("No user found")
      return
    }
    
    const dateStr = workout.date.toLocaleDateString('en-CA') // en-CA format: YYYY-MM-DD
    
    // Validate required fields
    if (!workout.title || !workout.type || !dateStr) {
      console.error("Missing required fields:", { title: workout.title, type: workout.type, date: dateStr })
      return
    }
    
    const newWorkoutData = {
      user_id: user.id,
      title: workout.title.trim(),
      date: dateStr,
    }
    
    console.log("Attempting to insert workout:", newWorkoutData)
    console.log("Supabase client:", supabase)
    
    try {
      // Insert into database
      const { data, error } = await supabase
        .from("workouts")
        .insert(newWorkoutData)
        .select()
      
      console.log("Supabase response:", { data, error })
      
      if (error) {
        console.error("Error adding workout:", error)
        console.error("Error details:", JSON.stringify(error, null, 2))
        console.error("Workout data being inserted:", newWorkoutData)
        return
      }
      
      if (data && data.length > 0) {
        setWorkouts(prev => [...prev, dbToWorkout(data[0])])
        console.log("Successfully added workout:", data[0])
      } else {
        console.error("No data returned after insert")
      }
    } catch (err) {
      console.error("Exception in handleAddWorkout:", err)
    }
  }, [supabase, user])
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your workouts...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex h-[100dvh] bg-white overflow-hidden">
      <Sidebar 
          user={user} 
          isStravaConnected={isStravaConnected} 
          onStravaSync={handleStravaSync}
          isSyncing={isSyncing}
        />
      {/* 
        Add pb-16 to the main container on mobile to account for the bottom navigation bar
        This prevents the calendar grid content from being hidden under the nav bar
      */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 h-[100dvh]">
        <Header 
          currentDate={currentDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
          onAddEvent={handleAddEvent}
        />
        <div className="flex-1 overflow-hidden relative">
          <CalendarGrid 
            days={days} 
            onDeleteWorkout={handleDeleteWorkout}
            onAddWorkout={handleAddWorkoutOnDate}
            onWorkoutMove={handleWorkoutMove}
          />
          {/* Mobile floating "Oggi" button */}
          <button
            onClick={handleToday}
            className="md:hidden absolute bottom-4 left-4 z-20 bg-white border border-[#EAECF0] text-[#344054] px-4 py-2 rounded-full shadow-lg font-medium text-sm flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-[#101828]"></div>
            Oggi
          </button>
        </div>
      </main>

      <AddWorkoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddWorkout}
        selectedDate={selectedDate}
      />
    </div>
  )
}
