"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Brain, Calendar, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { TrainingPlanCard } from "@/components/dashboard/training-plan-card"
import type { TrainingPlan } from "@/lib/types/ai"
import { toast } from "sonner"
import { startOfWeek, format } from "date-fns"

export default function TrainingPlansPage() {
  const router = useRouter()
  const supabase = createClient()
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start_date', { ascending: false })

    if (error) {
      console.error('Error loading plans:', error)
      toast.error('Errore nel caricamento dei piani')
    } else {
      setPlans(data || [])
    }

    setLoading(false)
  }

  const generateNewPlan = async () => {
    setGenerating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_ai_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        toast.error('Completa prima il profilo AI')
        router.push('/profile/ai-setup')
        return
      }

      // Get previous week analysis if available
      const lastWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
      lastWeek.setDate(lastWeek.getDate() - 7)

      const { data: previousPlan } = await supabase
        .from('training_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', lastWeek.toISOString().split('T')[0])
        .maybeSingle()

      // Generate new plan
      const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
      // For Next.js to not suffer timezone offsets when sending the date string
      const localDateString = format(currentWeek, 'yyyy-MM-dd')

      const response = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: profile,
          previous_week_analysis: previousPlan?.ai_analysis,
          current_week_start: localDateString,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error response:', error)
        throw new Error(error.error || `Errore nella generazione del piano (${response.status})`)
      }

      const result = await response.json()

      toast.success('Piano generato con successo!')
      loadPlans() // Reload plans

    } catch (error) {
      console.error('Error generating plan:', error)
      toast.error('Errore nella generazione del piano')
    } finally {
      setGenerating(false)
    }
  }

  const handleActivatePlan = (planId: string) => {
    loadPlans() // Reload to show updated status
  }

  const handleEditPlan = (planId: string) => {
    // TODO: Implement plan editing
    toast.info('Modifica piano in sviluppo')
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo piano?')) return

    try {
      const { error } = await supabase
        .from('training_plans')
        .delete()
        .eq('id', planId)

      if (error) throw error

      toast.success('Piano eliminato')
      loadPlans()
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error('Errore nell\'eliminazione del piano')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="h-8 w-8 text-purple-600" />
                Piani di Allenamento AI
              </h1>
              <p className="text-gray-600 mt-2">
                Visualizza e gestisci i tuoi piani di training generati dall'intelligenza artificiale
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Torna al Calendario
            </Button>
          </div>
        </div>

        {/* Generate New Plan */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Genera Nuovo Piano
            </CardTitle>
            <CardDescription>
              Crea un piano di allenamento personalizzato basato sul tuo profilo e sui progressi recenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={generateNewPlan}
                disabled={generating}
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Genera Piano Settimanale
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/profile/ai-setup')}
                size="lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Modifica Profilo AI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plans List */}
        <div className="space-y-6">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessun piano ancora
                </h3>
                <p className="text-gray-500 mb-4">
                  Completa il tuo profilo AI e genera il primo piano di allenamento personalizzato
                </p>
                <Button onClick={() => router.push('/profile/ai-setup')}>
                  Setup Profilo AI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {plans.map(plan => (
                <TrainingPlanCard
                  key={plan.id}
                  plan={plan}
                  onActivate={handleActivatePlan}
                  onEdit={handleEditPlan}
                  onDelete={handleDeletePlan}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}