import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  
  if (error) {
    return NextResponse.redirect(`${baseUrl}?strava_error=${error}`)
  }
  
  if (!code) {
    return NextResponse.redirect(`${baseUrl}?strava_error=no_code`)
  }
  
  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}?strava_error=not_configured`)
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
      }),
    })
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Strava token error:", errorData)
      return NextResponse.redirect(`${baseUrl}?strava_error=token_exchange_failed`)
    }
    
    const tokenData = await tokenResponse.json()
    
    // Get current user from Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/auth/login?strava_error=not_authenticated`)
    }
    
    // Store Strava tokens in user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        strava_athlete_id: tokenData.athlete?.id,
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
        strava_connected: true,
        strava_athlete: tokenData.athlete,
      }
    })
    
    if (updateError) {
      console.error("Error storing Strava tokens:", updateError)
      return NextResponse.redirect(`${baseUrl}?strava_error=storage_failed`)
    }
    
    // Redirect back to dashboard with success
    return NextResponse.redirect(`${baseUrl}?strava_connected=true`)
    
  } catch (err) {
    console.error("Strava callback error:", err)
    return NextResponse.redirect(`${baseUrl}?strava_error=unknown`)
  }
}
