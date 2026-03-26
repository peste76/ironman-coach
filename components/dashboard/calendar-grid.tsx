"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkoutCard, type WorkoutType } from "./workout-card"

interface Workout {
  id: string
  type: WorkoutType
  title: string
  duration?: string
  distance?: string
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  workouts: Workout[]
}

import { useState } from "react"
import { WorkoutDetailsModal } from "./workout-details-modal"

interface CalendarGridProps {
  days: CalendarDay[]
  onDeleteWorkout: (id: string) => void
  onAddWorkout: (date: Date) => void
  onWorkoutMove?: (workoutId: string, newDate: Date) => void
}

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function CalendarGrid({ days, onDeleteWorkout, onAddWorkout, onWorkoutMove }: CalendarGridProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  
  const handleDragStart = (e: React.DragEvent, workout: Workout) => {
    e.dataTransfer.setData("workoutId", workout.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Required to allow dropping
  }

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    const workoutId = e.dataTransfer.getData("workoutId")
    if (workoutId && onWorkoutMove) {
      onWorkoutMove(workoutId, targetDate)
    }
  }

  // Shorten weekdays for mobile
  const shortWeekDays = ["L", "M", "M", "G", "V", "S", "D"]

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {/* Week Day Headers (Sticky) */}
      <div className="grid grid-cols-7 border-b border-[#EAECF0] sticky top-0 bg-white z-10">
        {weekDays.map((day, index) => (
          <div 
            key={day}
            className="px-1 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-semibold text-[#667085] uppercase tracking-wider text-center border-r last:border-r-0 border-[#EAECF0]"
          >
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{shortWeekDays[index]}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 min-h-0 overflow-y-auto">
        {days.map((day, index) => (
          <div 
            key={index}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day.date)}
            className={cn(
              "group/cell border-r border-b border-[#EAECF0] last:border-r-0 p-1 md:p-2 min-h-[80px] md:min-h-[120px] flex flex-col relative",
              !day.isCurrentMonth && "bg-[#F9FAFB]",
              day.isToday && "bg-red-50/10"
            )}
          >
            {/* Date Number & Add Button */}
            <div className="flex items-center justify-center md:justify-between mb-1">
              <span 
                className={cn(
                  "text-xs md:text-sm font-medium w-6 h-6 md:w-auto md:h-auto flex items-center justify-center rounded-full",
                  !day.isCurrentMonth && "text-[#98A2B3]",
                  day.isCurrentMonth && !day.isToday && "text-[#344054]",
                  day.isToday && "bg-red-500 text-white shadow-sm"
                )}
              >
                {day.date.getDate()}
              </span>
              <button
                onClick={() => onAddWorkout(day.date)}
                className="opacity-0 group-hover/cell:opacity-100 p-1 rounded-md text-[#667085] hover:bg-[#F2F4F7] hover:text-[#344054] transition-all"
                aria-label={`Add workout on ${day.date.toLocaleDateString()}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Workouts */}
            <div className="flex-1 space-y-1 overflow-hidden">
              {day.workouts.slice(0, 3).map((workout) => (
                <WorkoutCard 
                  key={workout.id} 
                  workout={workout} 
                  onDelete={onDeleteWorkout}
                  onClick={() => setSelectedWorkout(workout)}
                  draggable={true}
                  onDragStart={handleDragStart}
                />
              ))}
              {day.workouts.length > 3 && (
                <button className="text-xs text-[#667085] hover:text-[#344054] font-medium pl-2">
                  +{day.workouts.length - 3} more
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <WorkoutDetailsModal
        isOpen={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        workout={selectedWorkout as any}
      />
    </div>
  )
}
