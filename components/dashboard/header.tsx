"use client"

import { Search, ChevronLeft, ChevronRight, Plus, Bell } from "lucide-react"

interface HeaderProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onAddEvent: () => void
}

export function Header({ currentDate, onPrevMonth, onNextMonth, onToday, onAddEvent }: HeaderProps) {
  const monthYear = currentDate.toLocaleDateString('it-IT', { 
    month: 'long', 
    year: 'numeric' 
  })
  const formattedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1)

  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-[#EAECF0] bg-white sticky top-0 z-20">
      {/* Left Section - Date Navigation */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile Year Back Button (Chevron Left + Month Year) */}
        <div className="flex items-center gap-1 md:hidden">
          <button 
            onClick={onPrevMonth}
            className="p-1 rounded-lg text-[#101828]"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold text-[#101828]">{formattedMonthYear}</h2>
        </div>

        {/* Desktop Month/Year */}
        <h2 className="hidden md:block text-xl font-semibold text-[#101828]">{formattedMonthYear}</h2>
        
        {/* Desktop Nav Buttons */}
        <div className="hidden md:flex items-center gap-1">
          <button 
            onClick={onPrevMonth}
            className="p-1.5 rounded-lg text-[#667085] hover:bg-[#F9FAFB] hover:text-[#344054] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={onNextMonth}
            className="p-1.5 rounded-lg text-[#667085] hover:bg-[#F9FAFB] hover:text-[#344054] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <button 
          onClick={onToday}
          className="hidden md:block px-3 py-1.5 text-sm font-medium text-[#344054] border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] transition-colors"
        >
          Oggi
        </button>
      </div>

      {/* Right Section - Search & Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Desktop Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
          <input
            type="text"
            placeholder="Search workouts..."
            className="w-64 pl-10 pr-4 py-2 text-sm border border-[#D0D5DD] rounded-lg bg-white placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#101828]/10 focus:border-[#101828] transition-all"
          />
        </div>

        {/* Mobile Search Icon */}
        <button className="md:hidden p-2 rounded-lg text-[#101828]">
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="relative hidden md:block p-2 rounded-lg text-[#667085] hover:bg-[#F9FAFB] hover:text-[#344054] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F97316] rounded-full" />
        </button>

        {/* Desktop Add Event Button */}
        <button 
          onClick={onAddEvent}
          className="hidden md:flex items-center gap-2 bg-[#101828] hover:bg-[#1D2939] text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>

        {/* Mobile Add Event Button (Icon only) */}
        <button 
          onClick={onAddEvent}
          className="md:hidden p-2 rounded-lg text-[#101828]"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </header>
  )
}
