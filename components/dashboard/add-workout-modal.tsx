"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { type WorkoutType } from "./workout-card"

interface AddWorkoutModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (workout: {
    type: WorkoutType
    title: string
    duration: string
    distance: string
    notes: string
    date: Date
  }) => void
  selectedDate: Date | null
}

const workoutTypes: { value: WorkoutType; label: string; color: string }[] = [
  { value: "swim", label: "Swim", color: "bg-[#3B82F6]" },
  { value: "bike", label: "Bike", color: "bg-[#8B5CF6]" },
  { value: "run", label: "Run", color: "bg-[#22C55E]" },
  { value: "strength", label: "Strength", color: "bg-[#F97316]" },
]

export function AddWorkoutModal({ isOpen, onClose, onAdd, selectedDate }: AddWorkoutModalProps) {
  const [type, setType] = useState<WorkoutType>("swim")
  const [title, setTitle] = useState("")
  const [duration, setDuration] = useState("")
  const [distance, setDistance] = useState("")
  const [notes, setNotes] = useState("")

  if (!isOpen || !selectedDate) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onAdd({
      type,
      title: title.trim(),
      duration,
      distance,
      notes,
      date: selectedDate,
    })

    // Reset form
    setTitle("")
    setDuration("")
    setDistance("")
    setNotes("")
    setType("swim")
    onClose()
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECF0]">
          <div>
            <h3 className="text-lg font-semibold text-[#101828]">Add Workout</h3>
            <p className="text-sm text-[#667085] mt-0.5">{formatDate(selectedDate)}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-[#667085] hover:bg-[#F9FAFB] hover:text-[#344054] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Workout Type */}
          <div>
            <label className="block text-sm font-medium text-[#344054] mb-2">
              Workout Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {workoutTypes.map((wt) => (
                <button
                  key={wt.value}
                  type="button"
                  onClick={() => setType(wt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    type === wt.value 
                      ? "border-[#101828] bg-[#F9FAFB]" 
                      : "border-[#EAECF0] hover:border-[#D0D5DD]"
                  )}
                >
                  <span className={cn("w-3 h-3 rounded-full", wt.color)} />
                  <span className="text-xs font-medium text-[#344054]">{wt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[#344054] mb-1.5">
              Workout Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Swim, Hill Repeats"
              className="w-full px-3.5 py-2.5 text-sm border border-[#D0D5DD] rounded-lg bg-white placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#101828]/10 focus:border-[#101828] transition-all"
              required
            />
          </div>

          {/* Duration & Distance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-[#344054] mb-1.5">
                Duration
              </label>
              <input
                id="duration"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 45m, 1.5h"
                className="w-full px-3.5 py-2.5 text-sm border border-[#D0D5DD] rounded-lg bg-white placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#101828]/10 focus:border-[#101828] transition-all"
              />
            </div>
            <div>
              <label htmlFor="distance" className="block text-sm font-medium text-[#344054] mb-1.5">
                Distance
              </label>
              <input
                id="distance"
                type="text"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g., 5km, 2000m"
                className="w-full px-3.5 py-2.5 text-sm border border-[#D0D5DD] rounded-lg bg-white placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#101828]/10 focus:border-[#101828] transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[#344054] mb-1.5">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details: pace targets, intervals, technique focus, how you felt..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm border border-[#D0D5DD] rounded-lg bg-white placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#101828]/10 focus:border-[#101828] transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-[#344054] border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#101828] rounded-lg hover:bg-[#1D2939] transition-colors"
            >
              Add Workout
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
