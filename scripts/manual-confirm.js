// Script per confermare manualmente un utente
const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function manualConfirm() {
  const email = 'ftakeyos01@gmail.com'
  
  console.log(`🔧 Conferma manuale utente: ${email}`)
  
  try {
    // 1. Trova l'utente
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Errore elenco utenti:', listError.message)
      return
    }

    const user = users.find(u => u.email === email)
    
    if (!user) {
      console.error('❌ Utente non trovato')
      return
    }

    console.log(`👤 Utente trovato: ID=${user.id}, Status=${user.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}`)

    // 2. Aggiorna utente come confermato
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        email_confirm: true,
        user_metadata: { 
          ...user.user_metadata,
          email_confirmed_manually: true,
          confirmed_at: new Date().toISOString()
        }
      }
    )

    if (updateError) {
      console.error('❌ Errore conferma:', updateError.message)
      return
    }

    console.log('✅ Utente confermato manualmente con successo!')
    console.log('🔑 Ora può fare login con:', email)
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

manualConfirm()
