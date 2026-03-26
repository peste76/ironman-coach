// AI Training Planner Types

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type TrainingDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type EquipmentType = 'bike' | 'treadmill' | 'pool' | 'weights' | 'heart_rate_monitor' | 'power_meter' | 'indoor_trainer';

export type InjuryType = 'knee' | 'back' | 'shoulder' | 'ankle' | 'hip' | 'elbow' | 'wrist' | 'neck' | 'other';

export interface UserAIProfile {
  id: string;
  user_id: string;
  target_race_date?: Date;
  target_race_distance?: string;
  target_race_name?: string;
  experience_level: ExperienceLevel;
  weekly_training_hours: number;
  training_days: TrainingDay[];
  available_equipment: EquipmentType[];
  ftp_watts?: number;
  max_hr?: number;
  resting_hr?: number;
  injuries: InjuryType[];
  training_preferences: {
    preferred_sports?: ('swim' | 'bike' | 'run' | 'strength')[];
    max_daily_sessions?: number;
    preferred_intensity?: 'low' | 'medium' | 'high';
    recovery_focus?: boolean;
    competition_focus?: boolean;
    [key: string]: any;
  };
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutAnalysis {
  id: string;
  workout_id: string;
  user_id: string;
  ai_feedback?: string;
  performance_score?: number; // 0-10
  recommendations?: string[];
  actual_duration_minutes?: number;
  actual_distance_km?: number;
  actual_avg_hr?: number;
  actual_max_hr?: number;
  actual_avg_power?: number;
  perceived_effort?: number; // 1-10
  created_at: Date;
  updated_at: Date;
}

export type TrainingPlanStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface TrainingPlan {
  id: string;
  user_id: string;
  week_start_date: Date;
  plan_data: WeeklyPlanData;
  ai_analysis?: WeeklyAnalysis;
  status: TrainingPlanStatus;
  created_at: Date;
  updated_at: Date;
}

// Detailed weekly plan structure
export interface WeeklyPlanData {
  overview: {
    total_hours: number;
    total_sessions: number;
    focus_areas: string[];
    training_stress_score: number;
    recovery_days: number;
  };
  days: {
    [key in TrainingDay]: DayPlan;
  };
  progression_notes: string[];
  adjustments_needed: string[];
}

export interface DayPlan {
  date: Date;
  sessions: WorkoutSession[];
  total_duration: number; // minutes
  training_load: number; // TSS equivalent
  focus: string;
  notes?: string;
}

export interface WorkoutSession {
  id: string; // For linking to actual workouts
  type: 'swim' | 'bike' | 'run' | 'strength' | 'rest' | 'active_recovery';
  title: string;
  duration_minutes: number;
  distance_km?: number;
  intensity: 'easy' | 'moderate' | 'tempo' | 'threshold' | 'interval' | 'max_effort';
  description: string;
  zones?: {
    hr_zones?: { zone: number; duration: number }[];
    power_zones?: { zone: number; duration: number }[];
  };
  intervals?: IntervalStructure[];
  equipment_needed?: EquipmentType[];
  indoor_outdoor?: 'indoor' | 'outdoor' | 'flexible';
  coach_notes: string;
  estimated_tss?: number;
}

export interface IntervalStructure {
  type: 'warmup' | 'main' | 'cooldown' | 'recovery';
  duration_minutes: number;
  intensity: string;
  description: string;
  repeats?: number;
  rest_duration?: number;
}

export interface WeeklyAnalysis {
  completed_sessions: number;
  total_planned_sessions: number;
  completion_rate: number;
  average_performance_score: number;
  training_load_achieved: number;
  training_load_planned: number;
  recovery_quality: 'poor' | 'fair' | 'good' | 'excellent';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  next_week_adjustments: string[];
  race_progression: {
    weeks_to_race: number;
    current_fitness_level: string;
    recommended_changes: string[];
  };
}

// Claude API types
export interface ClaudePlanRequest {
  user_profile: UserAIProfile;
  previous_week_analysis?: WeeklyAnalysis;
  current_week_start: Date;
  customization_requests?: string[];
}

export interface ClaudeAnalysisRequest {
  user_profile: UserAIProfile;
  planned_workout: WorkoutSession;
  completed_workout: {
    duration_minutes: number;
    distance_km?: number;
    avg_hr?: number;
    max_hr?: number;
    avg_power?: number;
    perceived_effort: number;
    notes?: string;
  };
  strava_data?: any;
}

export interface ClaudeResponse {
  plan?: WeeklyPlanData;
  analysis?: {
    feedback: string;
    performance_score: number;
    recommendations: string[];
  };
}