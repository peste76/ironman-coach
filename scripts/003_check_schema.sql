-- Verifica schema attuale della tabella workouts
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'workouts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verifica se la tabella esiste
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'workouts';

-- Mostra tutti i constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'workouts' 
AND table_schema = 'public';
