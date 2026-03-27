"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type TrainingSummary = {
  weekly_summaries: Array<{
    week_start: string
    total_tss: number
    total_duration_minutes: number
    total_distance_km: number
    avg_rpe: number
    workout_count: number
    by_type: Record<string, number>
    acute_training_load: number
    chronic_training_load: number
    training_stress_balance: number
  }>
  trends: {
    direction: string
    current_atl: number
    current_ctl: number
    current_tsb: number
  }
  stats: {
    total_workouts: number
    total_tss_all_time: number
    avg_tss_per_week: number
  }
}

export default function Analytics() {
  const [summary, setSummary] = useState<TrainingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/training/summary")
        if (!res.ok) {
          const payload = await res.json()
          throw new Error(payload.error || "Failed to load analytics")
        }
        const data = await res.json()
        setSummary(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  return (
    <main className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
      <div className="mb-4">
        <Link href="/analytics/workouts" className="text-sm font-medium text-blue-600 hover:underline">
          Vai a workouts analytics →
        </Link>
      </div>

      {loading && <p>Caricamento dati...</p>}
      {error && <p className="text-red-600">Errore: {error}</p>}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-sm text-gray-500">Totale allenamenti 12 settimane</div>
            <div className="text-xl font-semibold">{summary.stats.total_workouts}</div>
          </div>
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-sm text-gray-500">Totale TSS</div>
            <div className="text-xl font-semibold">{summary.stats.total_tss_all_time}</div>
          </div>
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-sm text-gray-500">TSS medio/settimana</div>
            <div className="text-xl font-semibold">{summary.stats.avg_tss_per_week}</div>
          </div>
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-sm text-gray-500">Trend</div>
            <div className="text-xl font-semibold capitalize">{summary.trends.direction}</div>
          </div>
        </div>
      )}

      {summary && summary.weekly_summaries.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Ultime settimane</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {summary.weekly_summaries.slice(-6).map(week => (
              <div key={week.week_start} className="p-3 border rounded-lg bg-white">
                <div className="text-xs text-gray-500">Settimana inizio {week.week_start}</div>
                <div className="font-semibold">TSS: {week.total_tss}</div>
                <div className="text-sm">Durata: {week.total_duration_minutes} min</div>
                <div className="text-sm">Distanza: {week.total_distance_km} km</div>
                <div className="text-sm">RPE medio: {week.avg_rpe}</div>
                <div className="text-sm">Workouts: {week.workout_count}</div>
                <div className="text-sm">TSB: {week.training_stress_balance}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
