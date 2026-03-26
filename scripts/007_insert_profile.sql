-- Inserisci il profilo per il tuo utente usando la colonna corretta 'id'
INSERT INTO public.profiles (id, email, full_name)
VALUES (
  '120a2ee2-3ae8-42bc-9451-8da65f2a1eee',
  'stefano.petruzzello@example.com',
  'Stefano Petruzzello'
) ON CONFLICT (id) DO NOTHING;

-- Verifica che il profilo sia stato creato
SELECT * FROM public.profiles WHERE id = '120a2ee2-3ae8-42bc-9451-8da65f2a1eee';
