import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigrations() {
  try {
    // Read and execute SQL files in order
    const sqlFiles = [
      '010_create_ai_tables.sql',
      '011_fix_ai_profile_constraints.sql',
      '012_add_ai_fields_to_workouts.sql'
    ]

    for (const file of sqlFiles) {
      console.log(`Running ${file}...`)
      const sql = fs.readFileSync(path.join(process.cwd(), 'scripts', file), 'utf8')

      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.error(`Error running ${file}:`, error)
      } else {
        console.log(`${file} executed successfully`)
      }
    }

    console.log('Migrations completed')
  } catch (error) {
    console.error('Migration error:', error)
  }
}

runMigrations()