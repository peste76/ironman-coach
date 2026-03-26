"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Save, Target, Clock, Dumbbell, Heart } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { UserAIProfile, ExperienceLevel, TrainingDay, EquipmentType, InjuryType } from "@/lib/types/ai"
import { toast } from "sonner"

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Principiante', description: 'Meno di 6 mesi di allenamento regolare' },
  { value: 'intermediate', label: 'Intermedio', description: '6-18 mesi di allenamento regolare' },
  { value: 'advanced', label: 'Avanzato', description: '1-3 anni di allenamento strutturato' },
  { value: 'expert', label: 'Esperto', description: 'Oltre 3 anni, gare competitive' }
]

const TRAINING_DAYS: { value: TrainingDay; label: string }[] = [
  { value: 'monday', label: 'Lunedì' },
  { value: 'tuesday', label: 'Martedì' },
  { value: 'wednesday', label: 'Mercoledì' },
  { value: 'thursday', label: 'Giovedì' },
  { value: 'friday', label: 'Venerdì' },
  { value: 'saturday', label: 'Sabato' },
  { value: 'sunday', label: 'Domenica' }
]

const EQUIPMENT_OPTIONS: { value: EquipmentType; label: string }[] = [
  { value: 'bike', label: 'Bicicletta' },
  { value: 'treadmill', label: 'Tapis roulant' },
  { value: 'pool', label: 'Piscina' },
  { value: 'weights', label: 'Pesi' },
  { value: 'heart_rate_monitor', label: 'Cardiofrequenzimetro' },
  { value: 'power_meter', label: 'Power meter' },
  { value: 'indoor_trainer', label: 'Rulli indoor' }
]

const INJURY_OPTIONS: { value: InjuryType; label: string }[] = [
  { value: 'knee', label: 'Ginocchio' },
  { value: 'back', label: 'Schiena' },
  { value: 'shoulder', label: 'Spalla' },
  { value: 'ankle', label: 'Caviglia' },
  { value: 'hip', label: 'Anca' },
  { value: 'elbow', label: 'Gomito' },
  { value: 'wrist', label: 'Polso' },
  { value: 'neck', label: 'Collo' },
  { value: 'other', label: 'Altro' }
]

export default function AISetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<UserAIProfile>>({
    experience_level: 'beginner',
    weekly_training_hours: 8,
    training_days: [],
    available_equipment: [],
    injuries: [],
    training_preferences: {}
  })

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('user_ai_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        setProfile({
          ...data,
          target_race_date: data.target_race_date ? new Date(data.target_race_date) : undefined
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Validate required fields
      if (!profile.experience_level) {
        throw new Error('Seleziona un livello di esperienza')
      }
      const hours = Number(profile.weekly_training_hours)
      if (!hours || isNaN(hours) || hours < 1 || hours > 168) {
        throw new Error('Inserisci un numero valido di ore di allenamento settimanali (1-168)')
      }

      const profileData = {
        ...profile,
        user_id: user.id,
        target_race_date: profile.target_race_date?.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_ai_profiles')
        .upsert(profileData, { onConflict: 'user_id' })

      if (error) {
        console.error('Database error:', error)

        // Check if it's a table doesn't exist error
        if (error.message?.includes('relation "public.user_ai_profiles" does not exist')) {
          throw new Error('Le tabelle AI non sono state create. Esegui gli script SQL nella cartella scripts/ prima di continuare.')
        }

        throw new Error(`Errore database: ${error.message}`)
      }

      toast.success('Profilo AI salvato con successo!')
      router.push('/training-plans')
    } catch (error) {
      console.error('Error saving profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto nel salvare il profilo'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const updateProfile = (field: keyof UserAIProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const toggleTrainingDay = (day: TrainingDay) => {
    setProfile(prev => ({
      ...prev,
      training_days: prev.training_days?.includes(day)
        ? prev.training_days.filter(d => d !== day)
        : [...(prev.training_days || []), day]
    }))
  }

  const toggleEquipment = (equipment: EquipmentType) => {
    setProfile(prev => ({
      ...prev,
      available_equipment: prev.available_equipment?.includes(equipment)
        ? prev.available_equipment.filter(e => e !== equipment)
        : [...(prev.available_equipment || []), equipment]
    }))
  }

  const toggleInjury = (injury: InjuryType) => {
    setProfile(prev => ({
      ...prev,
      injuries: prev.injuries?.includes(injury)
        ? prev.injuries.filter(i => i !== injury)
        : [...(prev.injuries || []), injury]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="h-8 w-8 text-blue-600" />
                Setup Profilo AI Training
              </h1>
              <p className="text-gray-600 mt-2">
                Configura il tuo profilo per ricevere piani di allenamento personalizzati generati dall'AI
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              Torna al Calendario
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Target Race */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Gara Obiettivo
              </CardTitle>
              <CardDescription>
                Definisci la tua gara principale per pianificare il periodo di preparazione
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="race-name">Nome Gara</Label>
                  <Input
                    id="race-name"
                    placeholder="Es: Ironman 70.3 Rimini"
                    value={profile.target_race_name || ''}
                    onChange={(e) => updateProfile('target_race_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="race-distance">Distanza</Label>
                  <Select value={profile.target_race_distance || ''} onValueChange={(value) => updateProfile('target_race_distance', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona distanza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sprint">Sprint (750m swim, 20km bike, 5km run)</SelectItem>
                      <SelectItem value="olympic">Olympic (1.5km swim, 40km bike, 10km run)</SelectItem>
                      <SelectItem value="70.3">70.3 (1.9km swim, 90km bike, 21.1km run)</SelectItem>
                      <SelectItem value="ironman">Ironman (3.8km swim, 180km bike, 42.2km run)</SelectItem>
                      <SelectItem value="marathon">Maratona (42.2km)</SelectItem>
                      <SelectItem value="half-marathon">Mezza Maratona (21.1km)</SelectItem>
                      <SelectItem value="10k">10km</SelectItem>
                      <SelectItem value="5k">5km</SelectItem>
                      <SelectItem value="century">Century Ride (100 miglia bici)</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Data Gara</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !profile.target_race_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {profile.target_race_date ? format(profile.target_race_date, "PPP") : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={profile.target_race_date}
                      onSelect={(date) => updateProfile('target_race_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Experience Level */}
          <Card>
            <CardHeader>
              <CardTitle>Livello di Esperienza</CardTitle>
              <CardDescription>
                Questo aiuta l'AI a calibrare la difficoltà degli allenamenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={profile.experience_level} onValueChange={(value: ExperienceLevel) => updateProfile('experience_level', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-sm text-gray-500">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Training Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Orario di Allenamento
              </CardTitle>
              <CardDescription>
                Quante ore a settimana puoi dedicare e quali giorni preferisci
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="weekly-hours">Ore settimanali disponibili</Label>
                <Input
                  id="weekly-hours"
                  type="number"
                  min="1"
                  max="168"
                  value={profile.weekly_training_hours || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    updateProfile('weekly_training_hours', isNaN(value) ? undefined : value)
                  }}
                />
              </div>
              <div>
                <Label>Giorni di allenamento disponibili</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {TRAINING_DAYS.map(day => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.value}
                        checked={profile.training_days?.includes(day.value) || false}
                        onCheckedChange={() => toggleTrainingDay(day.value)}
                      />
                      <Label htmlFor={day.value} className="text-sm">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipment & Injuries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Attrezzature Disponibili
                </CardTitle>
                <CardDescription>
                  Seleziona cosa hai a disposizione per allenarti
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {EQUIPMENT_OPTIONS.map(equipment => (
                    <div key={equipment.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={equipment.value}
                        checked={profile.available_equipment?.includes(equipment.value) || false}
                        onCheckedChange={() => toggleEquipment(equipment.value)}
                      />
                      <Label htmlFor={equipment.value} className="text-sm">{equipment.label}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Infortuni o Problemi Fisici
                </CardTitle>
                <CardDescription>
                  Segnala eventuali infortuni per piani sicuri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {INJURY_OPTIONS.map(injury => (
                    <div key={injury.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={injury.value}
                        checked={profile.injuries?.includes(injury.value) || false}
                        onCheckedChange={() => toggleInjury(injury.value)}
                      />
                      <Label htmlFor={injury.value} className="text-sm">{injury.label}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fitness Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Metriche di Fitness</CardTitle>
              <CardDescription>
                Queste possono essere aggiornate nel tempo. Lasciale vuote se non le conosci.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ftp">FTP (Watts)</Label>
                <Input
                  id="ftp"
                  type="number"
                  placeholder="Es: 250"
                  value={profile.ftp_watts || ''}
                  onChange={(e) => updateProfile('ftp_watts', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label htmlFor="max-hr">FC Max (bpm)</Label>
                <Input
                  id="max-hr"
                  type="number"
                  placeholder="Es: 190"
                  value={profile.max_hr || ''}
                  onChange={(e) => updateProfile('max_hr', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label htmlFor="resting-hr">FC Riposo (bpm)</Label>
                <Input
                  id="resting-hr"
                  type="number"
                  placeholder="Es: 50"
                  value={profile.resting_hr || ''}
                  onChange={(e) => updateProfile('resting_hr', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferenze di Allenamento</CardTitle>
              <CardDescription>
                Personalizza ulteriormente i tuoi piani
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="preferences">Note aggiuntive</Label>
                <Textarea
                  id="preferences"
                  placeholder="Es: Preferisco allenamenti al mattino, ho difficoltà con il nuoto, voglio focus su bici, ecc."
                  value={profile.training_preferences?.notes || ''}
                  onChange={(e) => updateProfile('training_preferences', {
                    ...profile.training_preferences,
                    notes: e.target.value
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvataggio...' : 'Salva Profilo AI'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}