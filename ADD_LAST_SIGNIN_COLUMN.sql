-- ============================================
-- Ajouter la colonne last_sign_in_at à profiles
-- Exécutez ceci dans Supabase SQL Editor
-- ============================================

-- 1. Ajouter la colonne si elle n'existe pas
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Ajouter un index pour performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_sign_in_at 
ON public.profiles(last_sign_in_at DESC);

-- 3. Vérifier que la colonne existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name = 'last_sign_in_at';

-- 4. Afficher les profils avec leurs dernières connexions
SELECT id, full_name, email, role, last_sign_in_at
FROM public.profiles
ORDER BY last_sign_in_at DESC NULLS LAST;

-- ============================================
-- Résultat attendu :
-- - La colonne last_sign_in_at s'affiche
-- - Les profils sont listés avec leur dernière connexion
-- - Les profils sans dernière connexion affichent NULL
-- ============================================













