"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type WorkoutType = "swim" | "bike" | "run" | "strength"

interface Workout {
  id: string
  type: WorkoutType
  title: string
  duration?: string
  distance?: string
  notes?: string
  strava_activity_id?: number | null
  rpe?: number | null
  tss?: number | null
}

interface WorkoutCardProps {
  workout: Workout
  onDelete?: (id: string) => void
  onClick?: (workout: Workout) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, workout: Workout) => void
}

const workoutColors: Record<WorkoutType, { dot: string; bg: string; text: string; hoverBg: string }> = {
  swim: { 
    dot: "bg-[#3B82F6]", 
    bg: "bg-[#EFF6FF]", 
    text: "text-[#1D4ED8]",
    hoverBg: "hover:bg-[#DBEAFE]"
  },
  bike: { 
    dot: "bg-[#8B5CF6]", 
    bg: "bg-[#F5F3FF]", 
    text: "text-[#6D28D9]",
    hoverBg: "hover:bg-[#EDE9FE]"
  },
  run: { 
    dot: "bg-[#22C55E]", 
    bg: "bg-[#F0FDF4]", 
    text: "text-[#15803D]",
    hoverBg: "hover:bg-[#DCFCE7]"
  },
  strength: { 
    dot: "bg-[#F97316]", 
    bg: "bg-[#FFF7ED]", 
    text: "text-[#C2410C]",
    hoverBg: "hover:bg-[#FFEDD5]"
  },
}

import { Waves, Bike, Footprints, Dumbbell } from "lucide-react"

export function WorkoutCard({ workout, onDelete, onClick, draggable, onDragStart }: WorkoutCardProps) {
  const colors = workoutColors[workout.type] || workoutColors.strength
  const isFromStrava = !!workout.strava_activity_id

  const getIcon = () => {
    switch (workout.type) {
      case 'swim': return <Waves className="w-3 h-3 shrink-0" />
      case 'bike': return <Bike className="w-3 h-3 shrink-0" />
      case 'run': return <Footprints className="w-3 h-3 shrink-0" />
      case 'strength': return <Dumbbell className="w-3 h-3 shrink-0" />
      default: return <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", colors.dot)} />
    }
  }

  return (
    <div 
      draggable={draggable}
      onDragStart={(e) => onDragStart && onDragStart(e, workout)}
      onClick={() => onClick?.(workout)}
      className={cn(
        "group flex items-center gap-1 md:gap-1.5 p-1 md:px-2.5 md:py-1.5 rounded-full md:rounded-full text-[10px] md:text-xs font-medium transition-all justify-center md:justify-start",
        onClick ? "cursor-pointer" : "",
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        colors.bg,
        colors.text,
        colors.hoverBg
      )}
      title={workout.notes ? `${workout.title}\n\nNotes: ${workout.notes}` : workout.title}
    >
      <span className="md:hidden flex items-center justify-center">
        {getIcon()}
      </span>
      <span className={cn("hidden md:block w-1.5 h-1.5 rounded-full shrink-0", colors.dot)} />
      <span className="hidden md:block truncate flex-1">{workout.title}</span>
      {workout.distance && (
         <span className="md:hidden text-[10px] font-bold">{workout.distance.split(' ')[0]}</span>
      )}
      {workout.duration && !workout.distance && (
        <span className="md:hidden text-[10px] font-bold">{workout.duration.split(' ')[0]}</span>
      )}
      {workout.duration && (
        <span className="hidden md:block text-[10px] opacity-70 shrink-0">{workout.duration}</span>
      )}
      {workout.rpe && (
        <span className="hidden md:block text-[10px] opacity-70 ml-1">RPE {workout.rpe}</span>
      )}
      {workout.tss && (
        <span className="hidden md:block text-[10px] opacity-70 ml-1">TSS {workout.tss}</span>
      )}
      {isFromStrava && (
        <svg className="w-3 h-3 shrink-0 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
          <title>Synced from Strava</title>
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(workout.id)
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-black/10 transition-all shrink-0"
          aria-label={`Delete ${workout.title}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
