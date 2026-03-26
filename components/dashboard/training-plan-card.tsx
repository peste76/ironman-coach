"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Brain, Play, Edit, Trash2, Clock, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { TrainingPlan, WeeklyPlanData, TrainingDay } from "@/lib/types/ai"
import { toast } from "sonner"
import { format, startOfWeek, addDays } from "date-fns"

interface TrainingPlanCardProps {
  plan: TrainingPlan
  onActivate?: (planId: string) => void
  onEdit?: (planId: string) => void
  onDelete?: (planId: string) => void
}

export function TrainingPlanCard({ plan, onActivate, onEdit, onDelete }: TrainingPlanCardProps) {
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  const generateWorkouts = async () => {
    setGenerating(true)
    try {
      // Ensure profile exists
      await supabase.from('profiles').upsert({ id: plan.user_id }, { onConflict: 'id' })

      // Create local date properly without timezone shift issues
      const dateString = typeof plan.week_start_date === 'string' ? plan.week_start_date : (plan.week_start_date as Date).toISOString().split('T')[0]
      const [year, month, day] = dateString.split('-').map(Number)
      
      // Calculate Monday of the given weekStart date, assuming weekStart might be any day of the week
      // Instead of using startOfWeek which can cause timezone shifts depending on local time, we just use the raw date.
      // The week_start_date is ALREADY a Monday from the DB.
      const mondayDate = new Date(year, month - 1, day)

      // Delete previous workouts for this user in this week to avoid conflicts
      const weekEnd = new Date(mondayDate)
      weekEnd.setDate(mondayDate.getDate() + 6)
      
      const { error: deleteError } = await supabase
        .from('workouts')
        .delete()
        .eq('user_id', plan.user_id)
        .gte('date', mondayDate.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0])

      if (deleteError) {
        console.error('Error deleting previous workouts:', deleteError)
        toast.error('Errore nella pulizia dei workout precedenti')
        return
      }

      // For each day in the plan, create workout entries
      for (const [dayName, dayData] of Object.entries(plan.plan_data.days)) {
        if (dayData.sessions.length === 0) continue

        // Extract the exact date string Claude generated for this specific day
        const sDateString = typeof dayData.date === 'string' ? dayData.date : (dayData.date as Date).toISOString().split('T')[0]
        const [sYear, sMonth, sDay] = sDateString.split('-').map(Number)
        // Reconstruct safely avoiding timezones
        const dayDate = new Date(sYear, sMonth - 1, sDay)

        for (const session of dayData.sessions) {
          if (session.type === 'rest') continue

          let intervalsText = ""
          if (session.intervals && Array.isArray(session.intervals) && session.intervals.length > 0) {
            intervalsText = "\n\nWorkout Structure:\n" + session.intervals.map((int: any) => 
              `- ${int.name} (${int.duration}): ${int.description}`
            ).join('\n')
          }

          // Create workout in database
          const { error } = await supabase
            .from('workouts')
            .insert({
              user_id: plan.user_id,
              type: session.type,
              title: session.title,
              duration_minutes: session.duration_minutes,
              planned_distance_km: session.distance_km,
              description: `${session.description}${intervalsText}\n\nCoach Notes: ${session.coach_notes}\n\nIntensity: ${session.intensity}\nZones: ${JSON.stringify(session.zones || {})}\nEquipment: ${(session.equipment_needed || []).join(', ')}\nIndoor/Outdoor: ${session.indoor_outdoor}`,
              date: dayDate.toISOString().split('T')[0],
              is_manual_entry: false,
              ai_generated: true,
              ai_plan_id: plan.id
            })

          if (error) {
            console.error('Error creating workout:', error)
            toast.error(`Errore nella creazione del workout ${session.title}`)
            return
          }
        }
      }

      // Mark plan as active
      await supabase
        .from('training_plans')
        .update({ status: 'active' })
        .eq('id', plan.id)

      toast.success('Piano attivato! I workout sono stati aggiunti al calendario.')
      onActivate?.(plan.id)
    } catch (error) {
      console.error('Error generating workouts:', error)
      toast.error('Errore nell\'attivazione del piano')
    } finally {
      setGenerating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attivo'
      case 'completed': return 'Completato'
      case 'cancelled': return 'Annullato'
      default: return 'Bozza'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">
              Piano {format(new Date(plan.week_start_date), 'dd/MM/yyyy')}
            </CardTitle>
          </div>
          <Badge className={getStatusColor(plan.status)}>
            {getStatusLabel(plan.status)}
          </Badge>
        </div>
        <CardDescription>
          {plan.plan_data.overview.total_sessions} allenamenti • {plan.plan_data.overview.total_hours} ore • TSS: {plan.plan_data.overview.training_stress_score}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Focus Areas */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">Focus della settimana:</h4>
            <div className="flex flex-wrap gap-1">
              {plan.plan_data.overview.focus_areas.map((focus, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {focus}
                </Badge>
              ))}
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-900">{plan.plan_data.overview.total_sessions}</div>
              <div className="text-gray-500">Allenamenti</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{plan.plan_data.overview.total_hours}h</div>
              <div className="text-gray-500">Totale</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{plan.plan_data.overview.training_stress_score}</div>
              <div className="text-gray-500">TSS</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{plan.plan_data.overview.recovery_days}</div>
              <div className="text-gray-500">Riposo</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {plan.status === 'draft' && (
              <Button
                onClick={generateWorkouts}
                disabled={generating}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                {generating ? 'Attivazione...' : 'Attiva Piano'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(plan.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(plan.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getDayIndex(day: TrainingDay): number {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return days.indexOf(day)
}