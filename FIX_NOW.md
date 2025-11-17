# 🚨 FIX IMMÉDIAT - Lisez ceci d'abord

## Le Problème
- Dashboard affiche "0 manuels" alors qu'il y a 14 manuels dans Supabase
- Erreur : `infinite recursion detected in policy for relation "profiles"`
- Les policies RLS sont cassées

## La Solution (2 minutes)

### Step 1️⃣ : Copier le code suivant

```sql
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manuals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activities DISABLE ROW LEVEL SECURITY;
```

### Step 2️⃣ : Exécuter dans Supabase

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. **SQL Editor** → **New Query**
4. Collez le code ci-dessus
5. Cliquez **Run** ▶️
6. Attendez 5 secondes

### Step 3️⃣ : Vérifier que ça marche

Toujours dans Supabase, exécutez ceci :

```sql
SELECT COUNT(*) as total_manuals FROM public.manuals;
SELECT COUNT(*) as total_profiles FROM public.profiles;
```

✅ Vous devez voir :
- `total_manuals` = 14
- `total_profiles` = 4 (ou plus)

### Step 4️⃣ : Redémarrer Angular

```bash
Ctrl+C          # Arrêter
ng serve        # Relancer
```

### Step 5️⃣ : Vérifier le navigateur

- F12 pour ouvrir la console
- Pas d'erreur `infinite recursion` ?
- Dashboard affiche le nombre de manuels ?

✅ **SI OUI → C'EST RÉGLÉ ! 🎉**

---

## ⚠️ Si ça ne marche pas encore

Exécutez ceci pour voir l'état des policies :

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Vous verrez toutes les policies. S'il y en a, supprimez-les :

```sql
DROP POLICY IF EXISTS "Profiles: users can read own profile or admins can read all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: own profile or admin" ON public.profiles;
DROP POLICY IF EXISTS "Manuals: authenticated can read" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admin insert" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admin update" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admin delete" ON public.manuals;
DROP POLICY IF EXISTS "Levels: authenticated can read" ON public.levels;
DROP POLICY IF EXISTS "Activities: authenticated can read" ON public.activities;
```

Puis relancer le navigateur (F5).

---

## 📝 Note

Vous venez de **désactiver RLS** (Row Level Security) sur toutes les tables. C'est pour diagnostiquer rapidement le problème.

**Ensuite**, quand l'app fonctionne, nous pourrons créer des policies RLS **simples et correctes** sans récursion.

---

**Êtes-vous prêt ? Commencez par Step 1 ! 🚀**
