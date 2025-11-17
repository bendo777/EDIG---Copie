-- ============================================
-- Créer une fonction RPC pour récupérer last_sign_in_at
-- (Accessible côté client, pas besoin de clé service)
-- ============================================

-- 1️⃣ Créer une fonction qui retourne les infos de dernière connexion
CREATE OR REPLACE FUNCTION public.get_users_with_last_signin()
RETURNS TABLE (
  user_id uuid,
  email text,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone
) AS $$
BEGIN
  -- Récupérer les données depuis auth.users
  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    au.last_sign_in_at,
    au.created_at
  FROM auth.users au
  ORDER BY au.last_sign_in_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ Accorder les permissions pour que les utilisateurs authentifiés puissent l'utiliser
GRANT EXECUTE ON FUNCTION public.get_users_with_last_signin() TO authenticated;

-- 3️⃣ Vérifier que la fonction fonctionne
SELECT * FROM public.get_users_with_last_signin();

-- ============================================
-- Résultat attendu :
-- - Une liste de tous les utilisateurs
-- - Avec leur email, last_sign_in_at, created_at
-- - Triés par dernière connexion (plus récent d'abord)
-- ============================================

-- Si vous voyez des résultats :
-- ✅ La fonction fonctionne correctement !
-- ✅ Elle est accessible depuis Angular

-- ============================================
-- 4️⃣ Créer une fonction pour agréger les connexions par jour
CREATE OR REPLACE FUNCTION public.get_user_signin_activity(days integer DEFAULT 30)
RETURNS TABLE (
  activity_date date,
  login_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days - 1),
      CURRENT_DATE,
      INTERVAL '1 day'
    )::date AS activity_date
  )
  SELECT 
    ds.activity_date,
    COUNT(au.id)::integer AS login_count
  FROM date_series ds
  LEFT JOIN auth.users au
    ON au.last_sign_in_at IS NOT NULL
   AND au.last_sign_in_at::date = ds.activity_date
  GROUP BY ds.activity_date
  ORDER BY ds.activity_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_signin_activity(integer) TO authenticated;

-- 5️⃣ Vérifier que la fonction retourne bien des données
SELECT * FROM public.get_user_signin_activity(30);

-- ============================================

