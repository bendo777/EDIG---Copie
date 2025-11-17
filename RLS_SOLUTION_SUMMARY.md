# 🚀 SOLUTION COMPLÈTE - Erreurs Récursion RLS

## 📌 RÉSUMÉ RAPIDE

Vos erreurs `infinite recursion detected in policy for relation "profiles"` sont causées par des policies RLS mal configurées.

**Solution** : Exécuter le script `fix_rls_complete.sql` qui :
1. Désactive RLS temporairement
2. Supprime TOUTES les policies problématiques
3. Réactive RLS proprement
4. Crée des policies correctes sans récursion
5. ✅ **Utilise une JOIN avec `auth.users` pour mettre à jour les rôles** (car `email` n'est pas dans `profiles`)

---

## ⚠️ POINT CRITIQUE - À COMPRENDRE

### Structure de données Supabase
```
auth.users (table système) :
├── id (uuid)
├── email ← EMAIL EST ICI !
└── password_hash

profiles (votre table) :
├── id (uuid)  
├── full_name
├── role ← RÔLE EST ICI !
└── avatar_url
```

**Important :** `email` n'existe **PAS** dans `profiles` !
- `email` est géré par Supabase dans `auth.users`
- Pour mettre à jour les rôles, on doit faire une **JOIN** : `profiles` + `auth.users`

---

## 🎯 À FAIRE MAINTENANT

### 1️⃣ Ouvrir Supabase SQL Editor
- Allez sur votre dashboard Supabase
- Cliquez sur **SQL Editor**
- Cliquez sur **New Query**

### 2️⃣ Copier le script
- Ouvrez le fichier `fix_rls_complete.sql` dans votre IDE
- Sélectionnez tout (Ctrl+A)
- Copiez (Ctrl+C)

### 3️⃣ Coller dans Supabase
- Collez dans le SQL Editor (Ctrl+V)
- Cliquez sur **Run** (bouton de lecture ▶️)

### 4️⃣ Attendre la fin
- Le script prend 10-30 secondes
- Vous devez voir des résultats `SELECT` à la fin montrant :
  - Nombre total de profiles
  - Nombre d'admins (doit être >= 3)
  - Nombre de manuels
  - **Liste des admins avec leurs emails et rôles**

### 5️⃣ Vérifier les admins (si pas mis à jour)

⚠️ **Utiliser la JOIN, pas WHERE sur email !**

```sql
-- Voir vos emails dans auth.users
SELECT id, email FROM auth.users ORDER BY email;

-- METTRE À JOUR avec une JOIN (pas WHERE email IN !)
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id
AND u.email IN (
  'admin@edig.com',
  'admin3@gmail.com',
  'admin4@admin.com'
);

-- Vérifier que ça a fonctionné
SELECT p.id, u.email, p.role
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY u.email;
```

### 6️⃣ Relancer Angular
```bash
# Dans le terminal du projet
Ctrl+C  # Arrêter le serveur actuel
ng serve  # Redémarrer
```

### 7️⃣ Vérifier dans le navigateur
- Ouvrez la console (F12)
- Devrait voir : ❌ Plus d'erreurs `infinite recursion`
- Dashboard devrait afficher les manuels totaux ✅

---

## 📂 Fichiers de Support

| Fichier | Contenu |
|---------|---------|
| `fix_rls_complete.sql` | **👈 Utilisez CELUI-CI** - Script avec JOIN correcte |
| `fix_rls_policies.sql` | Script alternatif (backup) |
| `INSTRUCTIONS_RLS_FIX.md` | Instructions détaillées avec diagnostics |

---

## ⚠️ Si ça ne fonctionne pas

### Erreur : "column email does not exist"
✅ **C'est normal !** `email` n'existe pas dans `profiles`
- Utilise la JOIN : `FROM auth.users u WHERE p.id = u.id`

### Test 1 : Vérifier que RLS est bien activé
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'manuals');
```
Devrait afficher `rowsecurity = true` pour tous

### Test 2 : Vérifier les policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```
Devrait afficher les policies créées par le script

### Test 3 : Vérifier que les admins ont le bon rôle
```sql
-- Voir les admins avec leurs emails
SELECT p.id, u.email, p.role
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY u.email;
```
Doit retourner au minimum vos 3 admins

### Test 4 : Vérifier la fonction is_admin
```sql
-- Tester la fonction (remplacer avec un UUID réel)
SELECT public.is_admin('00000000-0000-0000-0000-000000000000'::uuid);
```
Devrait retourner `true` ou `false`

---

## 🔧 Si le script donne une erreur

### Erreur : "Policy already exists"
→ Le script a échoué à supprimer les anciennes policies
→ Supprimez-les manuellement :

```sql
-- Pour profiles
DROP POLICY IF EXISTS "Profiles: users can read own profile or admins can read all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admins can read all" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;

-- Pour manuals
DROP POLICY IF EXISTS "Manuals: authenticated users can read" ON public.manuals;
DROP POLICY IF EXISTS "Manuals: admins can read all" ON public.manuals;

-- Puis relancez le script complet
```

### Erreur : "Function already exists"
→ C'est normal, le script utilise `CREATE OR REPLACE`
→ Ignorez cette erreur et continuez

### Erreur : "Table does not exist"
→ Vous n'avez pas les tables requises
→ Vérifiez que `profiles`, `manuals`, `levels` existent dans votre schéma `public`

---

## ✅ Résultat attendu

Après avoir exécuté le script et redémarré Angular :

**Dashboard :**
- ✅ Nombre total de manuels affiché
- ✅ Statistiques par niveau affichées
- ✅ Pas d'erreurs dans la console

**Gestion des utilisateurs :**
- ✅ Vos 3 admins affichés dans la liste
- ✅ Compteurs corrects (3 admins + autres utilisateurs)

**Console (F12) :**
- ✅ Pas d'erreur `infinite recursion`
- ✅ Pas d'erreur 500 sur les requêtes `/manuals`

---

## 📞 Besoin d'aide supplémentaire ?

Si après tous ces essais vous avez encore des erreurs :

1. Partez du **Diagnostic 1 à 4** dans `INSTRUCTIONS_RLS_FIX.md`
2. Vérifiez chaque point étape par étape
3. Consultez la section **Architecture Supabase** pour comprendre le mécanisme

---

**Temps estimé pour appliquer cette solution : 5-10 minutes ⏱️**
