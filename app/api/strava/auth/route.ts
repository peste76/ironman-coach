import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID
  
  if (!clientId) {
    return NextResponse.json(
      { error: "Strava client ID not configured" },
      { status: 500 }
    )
  }
  
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/strava/callback`
  
  const scope = "read,activity:read_all"
  
  const stravaAuthUrl = new URL("https://www.strava.com/oauth/authorize")
  stravaAuthUrl.searchParams.set("client_id", clientId)
  stravaAuthUrl.searchParams.set("redirect_uri", redirectUri)
  stravaAuthUrl.searchParams.set("response_type", "code")
  stravaAuthUrl.searchParams.set("scope", scope)
  stravaAuthUrl.searchParams.set("approval_prompt", "auto")
  
  return NextResponse.redirect(stravaAuthUrl.toString())
}
