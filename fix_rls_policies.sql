-- ============================================
-- Script pour corriger les policies RLS et éviter la récursion infinie
-- Exécutez ce script dans le SQL Editor de Supabase
-- ============================================

-- 1. Créer une fonction security definer pour vérifier si un utilisateur est admin
-- Cette fonction s'exécute avec les droits du propriétaire et peut lire profiles sans déclencher les policies RLS
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = uid) = 'admin', false);
$$;

-- 2. Accorder les permissions sur cette fonction
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;

-- 3. Supprimer les anciennes policies qui causent la récursion
DROP POLICY IF EXISTS "Profiles: admins can read all" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable" ON public.profiles;

-- 4. Créer une nouvelle policy pour profiles qui utilise la fonction is_admin
CREATE POLICY "Profiles: users can read own profile or admins can read all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR public.is_admin(auth.uid())
);

-- 5. Supprimer les anciennes policies sur manuals si elles existent
DROP POLICY IF EXISTS "Manuals: admins can read all" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: authenticated users can read" ON public.manuals;
DROP POLICY IF EXISTS "Manuals readable" ON public.manuals;

-- 6. Créer une nouvelle policy pour manuals qui utilise la fonction is_admin
-- Si vous voulez que tous les utilisateurs authentifiés puissent lire les manuels :
CREATE POLICY "Manuals: authenticated users can read"
ON public.manuals
FOR SELECT
TO authenticated
USING (true);

-- Si vous voulez que seuls les admins puissent lire les manuels :
-- CREATE POLICY "Manuals: admins can read"
-- ON public.manuals
-- FOR SELECT
-- TO authenticated
-- USING (public.is_admin(auth.uid()));

-- 7. Policy pour INSERT (seuls les admins peuvent ajouter)
CREATE POLICY "Manuals: admins can insert"
ON public.manuals
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 8. Policy pour UPDATE (seuls les admins peuvent modifier)
CREATE POLICY "Manuals: admins can update"
ON public.manuals
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 9. Policy pour DELETE (seuls les admins peuvent supprimer)
CREATE POLICY "Manuals: admins can delete"
ON public.manuals
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 10. S'assurer que la colonne role existe dans profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 11. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Après avoir exécuté ce script :
-- 1. Vérifiez que vos admins ont bien role = 'admin' dans la table profiles
-- 2. Redémarrez votre application Angular (ng serve)
-- 3. Les erreurs de récursion infinie devraient disparaître
-- ============================================

