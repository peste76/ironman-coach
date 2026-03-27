"use client"

import { 
  Calendar, 
  LayoutDashboard, 
  Activity, 
  BarChart3, 
  Settings, 
  User,
  LogOut,
  Waves,
  Bike,
  Footprints,
  Dumbbell,
  Brain
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/", current: false },
  { name: "Calendar", icon: Calendar, href: "/", current: true },
  { name: "Workouts", icon: Activity, href: "/analytics/workouts", current: false },
  { name: "Analytics", icon: BarChart3, href: "/analytics", current: false },
  { name: "AI Plans", icon: Brain, href: "/training-plans", current: false },
  { name: "AI Profile", icon: Brain, href: "/profile/ai-setup", current: false },
]

const workoutTypes = [
  { name: "Swim", icon: Waves, color: "bg-[#3B82F6]" },
  { name: "Bike", icon: Bike, color: "bg-[#8B5CF6]" },
  { name: "Run", icon: Footprints, color: "bg-[#22C55E]" },
  { name: "Strength", icon: Dumbbell, color: "bg-[#F97316]" },
]

interface SidebarProps {
  user: SupabaseUser | null
  isStravaConnected?: boolean
  onStravaSync?: () => void
  isSyncing?: boolean
}

export function Sidebar({ user, isStravaConnected = false, onStravaSync, isSyncing = false }: SidebarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleStravaConnect = () => {
    // Redirect to our Strava OAuth route
    window.location.href = "/api/strava/auth"
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
    {/* Desktop Sidebar */}
    <aside className="hidden md:flex flex-col w-64 bg-[#F9FAFB] border-r border-[#EAECF0] h-screen shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#EAECF0]">
        <div className="flex items-center justify-center w-10 h-10 bg-[#101828] rounded-lg">
          <span className="text-white font-bold text-sm">TRI</span>
        </div>
        <div>
          <h1 className="font-semibold text-[#101828] text-lg tracking-tight">UNVRS TRI</h1>
          <p className="text-xs text-[#667085]">Training Coach</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                item.current 
                  ? "bg-white text-[#101828] shadow-sm" 
                  : "text-[#667085] hover:bg-white/50 hover:text-[#344054]"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </a>
          ))}
        </div>

        {/* Workout Types */}
        <div className="mt-8">
          <p className="px-3 text-xs font-semibold text-[#667085] uppercase tracking-wider mb-3">
            Workout Types
          </p>
          <div className="space-y-1">
            {workoutTypes.map((type) => (
              <div
                key={type.name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#344054] hover:bg-white/50 cursor-pointer transition-colors"
              >
                <span className={cn("w-2.5 h-2.5 rounded-full", type.color)} />
                {type.name}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Strava Connect */}
      <div className="px-4 pb-2 space-y-2">
        {!isStravaConnected ? (
          <button
            onClick={handleStravaConnect}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#FC4C02] text-white hover:bg-[#E34402] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect Strava
          </button>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#FC4C02]/10 text-[#FC4C02]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Strava Connected
            </div>
            <button
              onClick={onStravaSync}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-[#EAECF0] text-[#344054] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Activities
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* User Section */}
      <div className="border-t border-[#EAECF0] p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#101828] truncate">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Athlete"}
            </p>
            <p className="text-xs text-[#667085] truncate">{user?.email || "Ironman Athlete"}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-1.5 text-[#667085] hover:text-[#344054] hover:bg-[#F2F4F7] rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    {/* Mobile Bottom Navigation Bar */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EAECF0] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 h-16">
        <button 
          onClick={() => router.push('/')}
          className="flex flex-col items-center justify-center w-full h-full gap-1 text-[#667085]"
        >
          <Calendar className="w-6 h-6 text-[#101828]" />
          <span className="text-[10px] font-medium text-[#101828]">Calendario</span>
        </button>
        
        <button 
          onClick={() => router.push('/training-plans')}
          className="flex flex-col items-center justify-center w-full h-full gap-1 text-[#667085] hover:text-[#101828]"
        >
          <Brain className="w-6 h-6" />
          <span className="text-[10px] font-medium">Piani</span>
        </button>

        <button 
          onClick={handleStravaConnect}
          className="flex flex-col items-center justify-center w-full h-full gap-1 text-[#667085] hover:text-[#FC4C02]"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <span className="text-[10px] font-medium">Strava</span>
        </button>

        <button 
          onClick={() => router.push('/profile')}
          className="flex flex-col items-center justify-center w-full h-full gap-1 text-[#667085] hover:text-[#101828]"
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium">Impostazioni</span>
        </button>
      </div>
    </div>
    </>
  )
}
