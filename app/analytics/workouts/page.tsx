"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Workout {
  id: string
  date: string
  title: string
  type: string
  duration_minutes: number | null
  planned_distance_km: number | null
  rpe: number | null
  tss: number | null
  training_load_score: number | null
  avg_heart_rate: number | null
  elevation_gain: number | null
  strava_activity_type: string | null
  strava_activity_id?: number | null
}

export default function WorkoutsAnalytics() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const load = async () => {
      setLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from("workouts")
          .select(
            "id, date, title, type, duration_minutes, planned_distance_km, rpe, tss, training_load_score, avg_heart_rate, elevation_gain, strava_activity_type, strava_activity_id"
          )
          .eq("user_deleted", false)
          .order("date", { ascending: false })

        if (fetchError) throw fetchError

        setWorkouts(data || [])
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Workout Analytics</h1>
      {loading && <p>Caricamento dati...</p>}
      {error && <p className="text-red-600">Errore: {error}</p>}

      {!loading && !error && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 border rounded-lg bg-white">
              <div className="text-gray-500 text-xs">Totale workout</div>
              <div className="text-xl font-semibold">{workouts.length}</div>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <div className="text-gray-500 text-xs">TSS medio</div>
              <div className="text-xl font-semibold">{Math.round((workouts.reduce((sum, w) => sum + (w.tss || 0), 0) / Math.max(1, workouts.length)) * 10) / 10}</div>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <div className="text-gray-500 text-xs">RPE medio</div>
              <div className="text-xl font-semibold">{Math.round((workouts.reduce((sum, w) => sum + (w.rpe || 0), 0) / Math.max(1, workouts.filter(w => w.rpe !== null).length || 1)) * 10) / 10}</div>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <div className="text-gray-500 text-xs">Distanza totale (km)</div>
              <div className="text-xl font-semibold">{Math.round(workouts.reduce((sum, w) => sum + (w.planned_distance_km || 0), 0) * 100) / 100}</div>
            </div>
          </div>

          <table className="min-w-full text-left border-collapse overflow-hidden border border-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-1 text-xs">Data</th>
                <th className="px-2 py-1 text-xs">Titolo</th>
                <th className="px-2 py-1 text-xs">Tipo</th>
                <th className="px-2 py-1 text-xs">Durata</th>
                <th className="px-2 py-1 text-xs">Distanza</th>
                <th className="px-2 py-1 text-xs">RPE</th>
                <th className="px-2 py-1 text-xs">TSS</th>
                <th className="px-2 py-1 text-xs">Load</th>
                <th className="px-2 py-1 text-xs">FC</th>
                <th className="px-2 py-1 text-xs">Elev.</th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((w) => (
                <tr key={w.id} className="border-t border-slate-200">
                  <td className="px-2 py-1 text-xs">{w.date}</td>
                  <td className="px-2 py-1 text-xs">{w.title}</td>
                  <td className="px-2 py-1 text-xs">{w.strava_activity_type || w.type}</td>
                  <td className="px-2 py-1 text-xs">{w.duration_minutes ?? "-"}</td>
                  <td className="px-2 py-1 text-xs">{w.planned_distance_km ?? "-"}</td>
                  <td className="px-2 py-1 text-xs">{w.rpe ?? "-"}</td>
                  <td className="px-2 py-1 text-xs">{w.tss ?? "-"}</td>
                  <td className="px-2 py-1 text-xs">{w.training_load_score ?? "-"}</td>
                  <td className="px-2 py-1 text-xs">{w.avg_heart_rate ?? "-"}</td>
                  <td className="px-2 py-1 text-xs">{w.elevation_gain ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
