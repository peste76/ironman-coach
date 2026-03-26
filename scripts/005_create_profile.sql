-- Verifica se esiste la tabella profiles
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Se non esiste, creala
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = user_id);

-- Inserisci il profilo per il tuo utente
INSERT INTO public.profiles (user_id, email, full_name)
VALUES (
  '120a2ee2-3ae8-42bc-9451-8da65f2a1eee',
  'your-email@example.com',
  'Your Name'
) ON CONFLICT (user_id) DO NOTHING;

-- Verifica che il profilo sia stato creato
SELECT * FROM public.profiles WHERE user_id = '120a2ee2-3ae8-42bc-9451-8da65f2a1eee';
