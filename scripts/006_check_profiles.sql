-- Verifica la struttura attuale della tabella profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verifica se la tabella esiste
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Mostra tutti i dati nella tabella profiles
SELECT * FROM public.profiles LIMIT 10;
