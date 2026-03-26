"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Activity, Flag } from "lucide-react"

export type WorkoutType = "swim" | "bike" | "run" | "strength"

interface Workout {
  id: string
  type: WorkoutType
  title: string
  duration?: string
  distance?: string
  notes?: string
  strava_activity_id?: number | null
  description?: string
  duration_minutes?: number
  planned_distance_km?: number
  intensity?: string
}

interface WorkoutDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  workout: Workout | null
}

const typeLabels = {
  swim: "Nuoto",
  bike: "Ciclismo",
  run: "Corsa",
  strength: "Forza",
}

const typeColors = {
  swim: "bg-blue-100 text-blue-800",
  bike: "bg-purple-100 text-purple-800",
  run: "bg-green-100 text-green-800",
  strength: "bg-orange-100 text-orange-800",
}

export function WorkoutDetailsModal({ isOpen, onClose, workout }: WorkoutDetailsModalProps) {
  if (!workout) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Badge className={typeColors[workout.type]} variant="secondary">
              {typeLabels[workout.type]}
            </Badge>
            {workout.strava_activity_id && (
              <Badge variant="outline" className="text-[#FC4C02] border-[#FC4C02]/20 bg-[#FC4C02]/5">
                Strava
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{workout.title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(workout.duration || workout.duration_minutes) && (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Durata</span>
                </div>
                <div className="font-medium">
                  {workout.duration_minutes ? `${workout.duration_minutes} min` : workout.duration}
                </div>
              </div>
            )}
            
            {(workout.distance || workout.planned_distance_km) && (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Flag className="w-4 h-4" />
                  <span>Distanza</span>
                </div>
                <div className="font-medium">
                  {workout.planned_distance_km ? `${workout.planned_distance_km} km` : workout.distance}
                </div>
              </div>
            )}

            {workout.intensity && (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="w-4 h-4" />
                  <span>Intensità</span>
                </div>
                <div className="font-medium capitalize">{workout.intensity}</div>
              </div>
            )}
          </div>

          {(workout.description || workout.notes) && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Dettagli allenamento</h4>
              <div className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
                {workout.description || workout.notes}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
