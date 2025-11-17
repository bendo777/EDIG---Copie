-- ============================================
-- Script COMPLET pour corriger les policies RLS
-- Exécutez ceci dans le SQL Editor de Supabase
-- ============================================

-- 1. DÉSACTIVER RLS SUR TOUTES LES TABLES (temporaire, pour diagnostiquer)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;

-- 2. SUPPRIMER TOUTES LES POLICIES EXISTANTES
DROP POLICY IF EXISTS "Profiles: users can read own profile or admins can read all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admins can read all" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: authenticated users can read own profile" ON public.profiles;

DROP POLICY IF EXISTS "Manuals: authenticated users can read" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admins can read all" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admins can insert" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admins can update" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admins can delete" ON public.manuals;
DROP POLICY IF EXISTS "Manuals readable" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admins can read" ON public.manuals;

DROP POLICY IF EXISTS "Levels readable" ON public.levels;
DROP POLICY IF EXISTS "Levels: authenticated users can read" ON public.levels;

DROP POLICY IF EXISTS "Activities readable" ON public.activities;
DROP POLICY IF EXISTS "Activities: authenticated users can read" ON public.activities;

-- 3. RÉACTIVER RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 4. CRÉER LA FONCTION is_admin CORRECTE (security definer)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = uid LIMIT 1) = 'admin', false);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;

-- 5. CRÉER LES NOUVELLES POLICIES SIMPLES SANS RÉCURSION

-- PROFILES: tout le monde peut lire son propre profil, les admins peuvent lire tous les profils
CREATE POLICY "Profiles: own profile or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR public.is_admin(auth.uid())
);

-- MANUALS: tout le monde peut lire
CREATE POLICY "Manuals: authenticated can read"
ON public.manuals
FOR SELECT
TO authenticated
USING (true);

-- MANUALS: seuls les admins peuvent insérer
CREATE POLICY "Manuals: admin insert"
ON public.manuals
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- MANUALS: seuls les admins peuvent modifier
CREATE POLICY "Manuals: admin update"
ON public.manuals
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- MANUALS: seuls les admins peuvent supprimer
CREATE POLICY "Manuals: admin delete"
ON public.manuals
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- LEVELS: tout le monde peut lire
CREATE POLICY "Levels: authenticated can read"
ON public.levels
FOR SELECT
TO authenticated
USING (true);

-- ACTIVITIES: tout le monde peut lire
CREATE POLICY "Activities: authenticated can read"
ON public.activities
FOR SELECT
TO authenticated
USING (true);

-- 6. VÉRIFIER QUE LA COLONNE role EXISTE
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 7. METTRE À JOUR LES ADMINS AVEC UNE JOINTURE SUR auth.users
-- (email est dans auth.users, pas dans profiles)
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id
AND u.email IN (
  'admin@edig.com',
  'admin3@gmail.com',
  'admin4@admin.com'
);

-- 8. CRÉER DES INDEXES POUR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_manuals_level_id ON public.manuals(level_id);
CREATE INDEX IF NOT EXISTS idx_manuals_created_at ON public.manuals(created_at);

-- 9. VÉRIFIER LES DONNÉES
SELECT 
  COUNT(*) as total_profiles,
  SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
  SUM(CASE WHEN role != 'admin' THEN 1 ELSE 0 END) as user_count
FROM public.profiles;

SELECT 
  COUNT(*) as total_manuals
FROM public.manuals;

-- 10. VÉRIFIER QUE LES ADMINS ONT BIEN LE RÔLE admin
SELECT p.id, u.email, p.role
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY u.email;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Si vous voyez des erreurs d'exécution du script :
-- 1. Vérifiez que vous êtes connecté avec un compte ayant les droits admin
-- 2. Vérifiez que les emails dans la section 7 correspondent exactement à vos admins
-- 3. Relancez le script après corrections
-- ============================================
