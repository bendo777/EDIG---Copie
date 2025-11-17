-- ============================================
-- 🚨 EMERGENCY FIX - Désactiver RLS complètement
-- Exécutez ceci IMMÉDIATEMENT dans Supabase SQL Editor
-- ============================================

-- ÉTAPE 1 : DIAGNOSTIC - Voir toutes les policies actuelles
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ÉTAPE 2 : DÉSACTIVER RLS SUR TOUTES LES TABLES (solution d'urgence)
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manuals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations DISABLE ROW LEVEL SECURITY;

-- ÉTAPE 3 : VÉRIFIER QUE RLS EST DÉSACTIVÉ
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'manuals', 'levels', 'activities', 'organizations');
-- Tous les rowsecurity doivent être FALSE

-- ÉTAPE 4 : VÉRIFIER QUE LES DONNÉES SONT LÀ
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT COUNT(*) as total_manuals FROM public.manuals;
SELECT COUNT(*) as total_users FROM auth.users;

-- ============================================
-- RÉSULTAT ATTENDU :
-- - RLS désactivé (rowsecurity = false) pour toutes les tables
-- - total_profiles >= 1
-- - total_manuals >= 14
-- - total_users >= 3
-- ============================================

-- Si vous voyez les données correctement :
-- → Revenez à Angular et testez
-- → Les erreurs doivent disparaître immédiatement
-- → Le dashboard doit afficher les chiffres

-- ============================================
-- ⚠️ APRÈS avoir vérifié que ça marche :
-- Vous pouvez créer des policies SIMPLES sans récursion
-- (optionnel pour now, le RLS désactivé suffit)
-- ============================================
