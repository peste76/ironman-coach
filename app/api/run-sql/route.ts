import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { script } = await request.json()

    if (!script) {
      return NextResponse.json({ error: 'Script name required' }, { status: 400 })
    }

    const scriptPath = path.join(process.cwd(), 'scripts', `${script}.sql`)
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const sql = fs.readFileSync(scriptPath, 'utf8')

    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)

    const results = []
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          // Note: This won't work with Supabase client. We need to use the REST API or service role
          // For now, just return the SQL that needs to be run
          results.push({ statement: statement.trim(), status: 'needs_manual_execution' })
        } catch (error) {
          results.push({ statement: statement.trim(), error: error.message })
        }
      }
    }

    return NextResponse.json({
      message: 'SQL script parsed. Please run these statements manually in Supabase SQL editor:',
      statements: results
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}