// Script per reinviare email di conferma a utente specifico
const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resendConfirmation() {
  const email = 'ftakeyos01@gmail.com'
  
  console.log(`📧 Reinvio email di conferma a: ${email}`)
  
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    })

    if (error) {
      console.error('❌ Errore:', error.message)
      return
    }

    console.log('✅ Email di conferma reinviata con successo!')
    console.log('📨 Controlla la spam/junk folder di', email)
    
  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

resendConfirmation()
