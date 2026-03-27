"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import { 
  Activity, 
  Target, 
  TrendingUp, 
  Calendar, 
  Heart, 
  Zap, 
  Timer,
  MapPin,
  Trophy,
  AlertCircle,
  CheckCircle
} from "lucide-react"

interface AthleteProfile {
  user: User | null
  totalWorkouts: number
  totalDistance: number
  totalDuration: number
  avgRPE: number
  currentPhase: string
  daysToRace: number
  raceDate: string | null
  fitnessLevel: number
  fatigueLevel: number
  formLevel: number
  paceZones: {
    zone1: string
    zone2: string
    zone3: string
    zone4: string
    zone5: string
  }
  weeklyProgress: {
    currentWeek: number
    totalWeeks: number
    completedWorkouts: number
    plannedWorkouts: number
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError("Utente non autenticato")
          return
        }

        // Get workouts data
        const { data: workouts, error: workoutsError } = await supabase
          .from("workouts")
          .select("duration_minutes, planned_distance_km, date, type")
          .eq("user_id", user.id)
          .order("date", { ascending: false })

        if (workoutsError) throw workoutsError

        // Calculate metrics
        const totalWorkouts = workouts?.length || 0
        const totalDistance = workouts?.reduce((sum, w) => sum + (w.planned_distance_km || 0), 0) || 0
        const totalDuration = workouts?.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) || 0

        // Calculate training phase (simple logic based on recent activity)
        const recentWorkouts = workouts?.slice(0, 4) || []
        let currentPhase = "Base"
        if (recentWorkouts.length >= 3) {
          const avgIntensity = recentWorkouts.length > 0 ? 1 : 0
          if (avgIntensity > 0.7) currentPhase = "Peak"
          else if (avgIntensity > 0.5) currentPhase = "Build"
          else currentPhase = "Base"
        }

        // Calculate days to race (mock data - should come from user profile)
        const raceDate = user.user_metadata?.race_date || null
        const daysToRace = raceDate ? Math.ceil((new Date(raceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0

        // Calculate fitness/fatigue/form (simplified)
        const fitnessLevel = Math.min(100, (totalWorkouts * 2 + totalDistance * 0.5))
        const fatigueLevel = Math.min(100, (totalDuration / 60) * 3)
        const formLevel = Math.max(0, Math.min(100, fitnessLevel - fatigueLevel + 50))

        // Pace zones (based on user level - simplified)
        const userLevel = totalWorkouts > 20 ? "intermediate" : "beginner"
        const paceZones = {
          zone1: userLevel === "beginner" ? "6:30-7:00" : "5:45-6:15",
          zone2: userLevel === "beginner" ? "6:00-6:30" : "5:15-5:45",
          zone3: userLevel === "beginner" ? "5:30-6:00" : "4:45-5:15",
          zone4: userLevel === "beginner" ? "5:00-5:30" : "4:15-4:45",
          zone5: userLevel === "beginner" ? "4:30-5:00" : "3:45-4:15"
        }

        // Weekly progress
        const currentWeek = Math.floor((new Date().getDate() - 1) / 7) + 1
        const totalWeeks = 20 // Typical Ironman training plan
        const thisWeekWorkouts = workouts?.filter(w => {
          const workoutDate = new Date(w.date)
          const weekStart = new Date()
          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          return workoutDate >= weekStart
        }).length || 0

        setProfile({
          user,
          totalWorkouts,
          totalDistance,
          totalDuration,
          avgRPE: 0, // Would need RPE data
          currentPhase,
          daysToRace,
          raceDate,
          fitnessLevel,
          fatigueLevel,
          formLevel,
          paceZones,
          weeklyProgress: {
            currentWeek,
            totalWeeks,
            completedWorkouts: thisWeekWorkouts,
            plannedWorkouts: 5 // Typical weekly workouts
          }
        })
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento profilo...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Errore: {error}</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {profile.user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profilo Atleta</h1>
              <p className="text-gray-600">{profile.user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Race Countdown */}
        {profile.raceDate && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Countdown Gara
                </h2>
                <p className="text-gray-600 mt-1">
                  {profile.raceDate && new Date(profile.raceDate).toLocaleDateString('it-IT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{profile.daysToRace}</div>
                <div className="text-sm text-gray-600">giorni mancanti</div>
              </div>
            </div>
          </div>
        )}

        {/* Training Phase */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Fase di Allenamento
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{profile.currentPhase}</div>
              <div className="text-sm text-gray-600 mt-1">
                Settimana {profile.weeklyProgress.currentWeek} di {profile.weeklyProgress.totalWeeks}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Allenamenti questa settimana</div>
              <div className="text-lg font-semibold text-blue-600">
                {profile.weeklyProgress.completedWorkouts}/{profile.weeklyProgress.plannedWorkouts}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(profile.weeklyProgress.currentWeek / profile.weeklyProgress.totalWeeks) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Stato di Forma
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{profile.fitnessLevel.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Fitness</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${profile.fitnessLevel}%` }}></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{profile.fatigueLevel.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Fatica</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${profile.fatigueLevel}%` }}></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{profile.formLevel.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Form</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${profile.formLevel}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pace Zones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Zone di Passo (Corsa)
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Zona 1 - Recupero</span>
              </div>
              <span className="text-green-700 font-mono">{profile.paceZones.zone1} /km</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Zona 2 - Aerobico</span>
              </div>
              <span className="text-blue-700 font-mono">{profile.paceZones.zone2} /km</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="font-medium">Zona 3 - Tempo</span>
              </div>
              <span className="text-yellow-700 font-mono">{profile.paceZones.zone3} /km</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-medium">Zona 4 - Soglia</span>
              </div>
              <span className="text-orange-700 font-mono">{profile.paceZones.zone4} /km</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium">Zona 5 - VO2max</span>
              </div>
              <span className="text-red-700 font-mono">{profile.paceZones.zone5} /km</span>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Allenamenti</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900">{profile.totalWorkouts}</div>
            <div className="text-sm text-gray-600">totali</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-gray-900">Distanza</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900">{profile.totalDistance.toFixed(1)}</div>
            <div className="text-sm text-gray-600">km totali</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <Timer className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-gray-900">Durata</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(profile.totalDuration / 60)}</div>
            <div className="text-sm text-gray-600">ore totali</div>
          </div>
        </div>
      </div>
    </div>
  )
}
