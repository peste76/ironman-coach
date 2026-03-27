"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface AppLayoutProps {
  children: React.ReactNode
  showStravaSync?: boolean
}

export function AppLayout({ children, showStravaSync = true }: AppLayoutProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isStravaConnected, setIsStravaConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        
        // Check if connected via Strava
        const provider = user.app_metadata?.provider
        const stravaConnected = user.user_metadata?.strava_connected
        setIsStravaConnected(provider === "strava" || stravaConnected === true)
      }
    }

    getCurrentUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        const provider = session.user.app_metadata?.provider
        const stravaConnected = session.user.user_metadata?.strava_connected
        setIsStravaConnected(provider === "strava" || stravaConnected === true)
      } else {
        setUser(null)
        setIsStravaConnected(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleStravaSync = async () => {
    if (!user) return
    
    setIsSyncing(true)
    try {
      const response = await fetch("/api/strava/sync", { method: "POST" })
      const data = await response.json()
      
      if (response.ok && data.synced > 0) {
        // Refresh the page to show new workouts
        window.location.reload()
      }
    } catch (err) {
      console.error("Sync error:", err)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex h-[100dvh] bg-white overflow-hidden">
      <Sidebar 
        user={user} 
        isStravaConnected={isStravaConnected} 
        onStravaSync={showStravaSync ? handleStravaSync : undefined}
        isSyncing={isSyncing}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
