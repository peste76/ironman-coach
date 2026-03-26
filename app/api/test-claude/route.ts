import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "No API key configured" }, { status: 500 })
    }

    // Try a simple message to test the API
    const message = await anthropic.messages.create({
      model: "claude-2.1",
      max_tokens: 100,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: "Say 'Hello, API is working!'"
        }
      ]
    })

    return NextResponse.json({
      success: true,
      response: message.content[0].type === 'text' ? message.content[0].text : 'No text response'
    })

  } catch (error) {
    console.error('API test error:', error)
    return NextResponse.json({
      error: 'API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}