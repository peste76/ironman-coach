import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import type { ClaudePlanRequest, WeeklyPlanData, TrainingDay } from "@/lib/types/ai"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Debug: Check if API key is loaded
console.log('Anthropic API key loaded:', !!process.env.ANTHROPIC_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log('Starting plan generation...')
    console.log('Anthropic API key available:', !!process.env.ANTHROPIC_API_KEY)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('No authenticated user')
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Anthropic API key not found in environment')
      return NextResponse.json({ error: "AI service not configured - missing API key" }, { status: 500 })
    }

    const body: ClaudePlanRequest = await request.json()
    const { user_profile, previous_week_analysis, current_week_start, customization_requests, userId } = body

    console.log('Request body:', { user_profile: !!user_profile, current_week_start, customization_requests })

    // Get userId from body or session
    let authenticatedUserId = userId || user?.id

    if (!authenticatedUserId) {
      console.log('No userId provided and no authenticated user')
      return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 })
    }

    // Build the comprehensive prompt for Claude
    const prompt = buildPlanGenerationPrompt(user_profile, previous_week_analysis, new Date(current_week_start), customization_requests)
    console.log('Built prompt, length:', prompt.length)

    // Call Claude API
    console.log('Calling Claude API...')
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      temperature: 0.7,
      system: "You are an expert triathlon coach and training planner. Create detailed, periodized training plans that balance stress and recovery while progressing athletes toward their goals. Always prioritize athlete safety and long-term development over short-term performance gains.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })

    console.log('Claude API response received')
    const planText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('Plan text length:', planText.length)

    // Parse Claude's response into structured data
    const planData = parseClaudeResponse(planText)
    console.log('Parsed plan data:', !!planData)

    // Validate the parsed plan
    if (!planData) {
      console.log('Failed to parse plan data', planText)
      return NextResponse.json({ error: "Failed to generate valid plan: Check server logs" }, { status: 500 })
    }

    // Save the plan to database
    console.log('Saving plan to database...')
    const { data: savedPlan, error: saveError } = await supabase
      .from('training_plans')
      .insert({
        user_id: authenticatedUserId,
        week_start_date: current_week_start,
        plan_data: planData,
        ai_analysis: previous_week_analysis,
        status: 'draft'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving plan:', saveError)
      return NextResponse.json({ error: `Failed to save plan: ${saveError.message}` }, { status: 500 })
    }

    console.log('Plan saved successfully')
    return NextResponse.json({
      success: true,
      plan: savedPlan
    })

  } catch (error) {
    console.error('Error generating plan:', error)
    return NextResponse.json({ error: `Failed to generate plan: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}

function buildPlanGenerationPrompt(
  profile: any,
  previousAnalysis: any,
  weekStart: Date,
  customizations?: string[]
): string {
  const raceInfo = profile.target_race_date && profile.target_race_distance
    ? `Target race: ${profile.target_race_distance} on ${profile.target_race_date}`
    : 'No specific target race set'

  const experience = profile.experience_level || 'intermediate'
  const weeklyHours = profile.weekly_training_hours || 8
  const trainingDays = profile.training_days || []
  const equipment = profile.available_equipment || []
  const injuries = profile.injuries || []

  let prompt = `Create a detailed weekly training plan for a ${experience} triathlete.

ATHLETE PROFILE:
- Experience Level: ${experience}
- Weekly Training Hours: ${weeklyHours}
- Available Training Days: ${trainingDays.join(', ') || 'flexible'}
- Equipment Available: ${equipment.join(', ') || 'basic equipment'}
- Injuries/Concerns: ${injuries.join(', ') || 'none'}
- ${raceInfo}
- FTP: ${profile.ftp_watts || 'unknown'} watts
- Max HR: ${profile.max_hr || 'unknown'} bpm
- Resting HR: ${profile.resting_hr || 'unknown'} bpm

MANDATORY WEEKLY STRUCTURE:
Ensure the days match EXACTLY. The generated plan must align properly with the dates:
- Monday (start of the week): Strength (upper body) AND Swim (easy/technique)
- Tuesday: Run (intervals/threshold)
- Wednesday: Bike (quality/sweet spot) AND Strength (light lower body)
- Thursday: Swim (medium/long) (evening free)
- Friday: Run (easy) AND Strength (light/maintenance)
- Saturday: Bike (long endurance - fundamental)
- Sunday (end of the week): Run (long) OR Brick (Bike + Run)

For the dates, you MUST use the exact correct calendar dates starting from the provided weekStart date (${weekStart.toISOString().split('T')[0]} - which is a Monday).
Monday is ${weekStart.toISOString().split('T')[0]}, Tuesday is the next day, etc., until Sunday. Make sure the dates in your JSON days objects match this exact mathematical progression.

CRITICAL JSON INSTRUCTION:
Keep your descriptions and notes VERY concise to avoid hitting token limits. DO NOT write excessively long strings in "description" or "coach_notes". Be precise but brief. Ensure the output is valid, fully closed JSON.

WORKOUT DETAIL LEVEL (CRITICAL):
Write highly detailed, coach-level workouts. DO NOT write generic descriptions like "Go for a run".
- Swim: Must include structured Warm-up, Drill sets (e.g., 4x50m catch-up), Main set (e.g., 8x100m at threshold with 15s rest), and Cool-down.
- Bike & Run Intervals: Must specify EXACT interval counts, durations, and intensities (e.g., "Warm-up 15 min. Main: 5 x 4 min @ Sweet Spot (88-92% FTP) with 2 min easy recovery. Cool-down 10 min.").
- Use standard coaching notation (e.g., 4x400m, 3x10min). Write the specific details inside the "description" field or within the "intervals" array. Be extremely precise.

PERIODIZATION RULES:
- Consider the target race date and calculate how many weeks are left to appropriately determine the phase (Base, Build, Peak, Taper).
- Use a 4-week mesocycle approach: 3 weeks of progressive loading followed by 1 fixed recovery/deload week (reduced volume by ~30%, keep some intensity).
- Analyze the user's progress and adjust volume/intensity based on previous week completion, but adhere to the weekly structure above.

`

  if (previousAnalysis) {
    prompt += `
PREVIOUS WEEK ANALYSIS:
- Completion Rate: ${previousAnalysis.completion_rate || 0}%
- Average Performance Score: ${previousAnalysis.average_performance_score || 0}/10
- Training Load Achieved: ${previousAnalysis.training_load_achieved || 0}
- Recovery Quality: ${previousAnalysis.recovery_quality || 'unknown'}
- Strengths: ${previousAnalysis.strengths?.join(', ') || 'none noted'}
- Weaknesses: ${previousAnalysis.weaknesses?.join(', ') || 'none noted'}
- Recommendations: ${previousAnalysis.recommendations?.join(', ') || 'none'}

`
  }

  if (customizations && customizations.length > 0) {
    prompt += `
CUSTOM REQUESTS:
${customizations.map(req => `- ${req}`).join('\n')}

`
  }

  prompt += `
REQUIREMENTS:
1. Plan must fit within ${weeklyHours} hours per week
2. Only schedule on these days: ${trainingDays.join(', ') || 'any day'}
3. Consider available equipment: ${equipment.join(', ')}
4. Account for injuries: ${injuries.join(', ')}
5. Include proper warm-up, main set, cool-down structure
6. Specify intensity zones (easy, moderate, tempo, threshold, interval)
7. Include estimated TSS (Training Stress Score) for each session
8. Balance training stress with recovery days
9. Progress toward ${raceInfo || 'general fitness'}

IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or formatting. Start your response with { and end with }.

OUTPUT FORMAT:
{
  "overview": {
    "total_hours": 10,
    "total_sessions": 7,
    "focus_areas": ["array of focus areas"],
    "training_stress_score": 385,
    "recovery_days": 1
  },
  "days": {
    "monday": {
      "date": "YYYY-MM-DD",
      "sessions": [
        {
          "id": "mon-strength-01",
          "type": "strength",
          "title": "Full Body Triathlon Strength",
          "duration_minutes": 55,
          "distance_km": 0,
          "intensity": "moderate",
          "description": "Full body strength session",
          "coach_notes": "Keep heart rate in Zone 2",
          "zones": {"hr_zones": ["Zone 2"], "power_zones": []},
          "intervals": [{"name": "Warm-Up", "duration": "10 minutes", "description": "Foam rolling"}],
          "equipment_needed": ["weights"],
          "indoor_outdoor": "indoor",
          "estimated_tss": 45
        }
      ],
      "total_duration": 55,
      "training_load": 45,
      "focus": "Strength",
      "notes": "Rest day follows"
    },
    "tuesday": { ... },
    "wednesday": { ... },
    "thursday": { ... },
    "friday": { ... },
    "saturday": { ... },
    "sunday": { ... }
  }
}

Make the plan realistic and safe. Focus on quality over quantity.`

  return prompt
}

function parseClaudeResponse(responseText: string): WeeklyPlanData | null {
  try {
    console.log('Parsing Claude response, text length:', responseText.length)
    console.log('Response text preview:', responseText.substring(0, 500))

    let parsed;

    // Remove markdown code blocks if present
    let cleanText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    // Try to find JSON object - look for the first { and last }
    const startIndex = cleanText.indexOf('{')
    let lastIndex = cleanText.lastIndexOf('}')

    if (startIndex === -1) {
      console.log('No valid JSON structure found')
      return null
    }

    let jsonCandidate = cleanText.substring(startIndex)
    
    if (lastIndex !== -1 && lastIndex > startIndex) {
       jsonCandidate = cleanText.substring(startIndex, lastIndex + 1)
    }

    try {
      // First attempt parsing
      parsed = JSON.parse(jsonCandidate)
      console.log('Successfully parsed JSON')
    } catch (parseError) {
      console.error('First JSON parse attempt failed:', parseError)
      
      // If the detailed JSON got truncated again despite 8000 tokens (often happens with heavy arrays)
      // Try to repair the JSON aggressively by finding the last valid comma or brace and closing it.
      try {
        let fixedJson = jsonCandidate;
        
        // Remove trailing commas that break JSON
        fixedJson = fixedJson.replace(/,\s*$/, "");
        fixedJson = fixedJson.replace(/,\s*}/g, "}");
        fixedJson = fixedJson.replace(/,\s*]/g, "]");

        // Add missing closing brackets/braces based on common truncation points in our structure
        const openBraces = (fixedJson.match(/{/g) || []).length;
        const closeBraces = (fixedJson.match(/}/g) || []).length;
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/\]/g) || []).length;
        
        if (openBrackets > closeBrackets) {
           fixedJson += "]}"; 
        } else if (openBraces > closeBraces) {
           fixedJson += "}";
        }

        // Just blindly close the main structure if it's completely broken at the end
        if (!fixedJson.endsWith('}')) {
          fixedJson += '"}]}}}'; // End array, end session, end sessions array, end day, end days, end main
        }
        
        // Replace typical last minute errors
        fixedJson = fixedJson.replace(/""}]}}}/g, '"}]}}}');

        parsed = JSON.parse(fixedJson)
        console.log('Successfully parsed repaired JSON')
      } catch (repairError) {
        console.error('Failed to repair JSON:', repairError)
        console.log('Failed JSON candidate (end snippet):', jsonCandidate.substring(jsonCandidate.length - 200))
        return null
      }
    }

    // Validate structure
    if (!parsed || typeof parsed !== 'object' || !parsed.overview || !parsed.days) {
      console.log('Missing overview or days in parsed data')
      return null
    }

    console.log('Parsed successfully, validating days...')
    // Ensure all days are present
    const requiredDays: TrainingDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    for (const day of requiredDays) {
      if (!parsed.days[day]) {
        parsed.days[day] = {
          date: "", // Will be filled by the caller
          sessions: [],
          total_duration: 0,
          training_load: 0,
          focus: "Rest",
          notes: ""
        }
      }
    }

    console.log('Parse successful')
    return parsed as WeeklyPlanData
  } catch (error) {
    console.error('Error parsing Claude response:', error)
    console.log('Full response text:', responseText)
    return null
  }
}