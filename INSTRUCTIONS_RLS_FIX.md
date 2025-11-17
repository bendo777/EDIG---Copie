# 🔧 Instructions Complètes pour Corriger les Erreurs RLS

## Le Problème
Vous avez l'erreur `infinite recursion detected in policy for relation "profiles"`. 

Cela signifie que vos policies RLS font référence à d'autres tables d'une manière qui crée une boucle infinie lors de l'évaluation.

## ⚠️ IMPORTANT : Point Critique
**`email` n'existe PAS dans la table `profiles` !**
- `email` est stocké dans **`auth.users`**
- `profiles` ne contient que l'`id` et les autres infos de profil
- Le script utilise une **JOIN** entre `profiles` et `auth.users` pour mettre à jour les rôles

## ⚠️ IMPORTANT : Il y a 2 approches possibles

### Approche 1 : Script Complet (RECOMMANDÉ) ✅
Utilisez `fix_rls_complete.sql` qui :
- Désactive complètement RLS temporairement
- Supprime TOUTES les policies existantes
- Réactive RLS
- Crée les bonnes policies sans récursion
- **Utilise une JOIN correcte** : `auth.users` + `profiles`

### Approche 2 : Script Original
Utilisez `fix_rls_policies.sql` seulement si l'approche 1 ne fonctionne pas

---

## 📋 Étapes pour l'Approche 1 (Complète)

### Étape 1 : Exécuter le script SQL complet

1. Ouvrez votre projet **Supabase**
2. Allez dans **SQL Editor**
3. Cliquez sur **New Query**
4. Copiez tout le contenu de `fix_rls_complete.sql`
5. Collez-le dans l'éditeur
6. Cliquez sur **Run** (bouton de lecture)
7. ✅ Attendez que le script finisse sans erreur

**Important** : Le script affichera les résultats des requêtes SELECT à la fin. Vérifiez que :
- `total_profiles` > 0
- `admin_count` >= 3 (vos 3 admins)
- `total_manuals` > 0
- La dernière requête `SELECT` affiche vos 3 admins avec `role = 'admin'`

### Étape 2 : Mettre à jour les rôles des admins (si nécessaire)

⚠️ **Le script utilise une JOIN, pas un WHERE sur email !**

Si le script a échoué à mettre à jour les rôles (section 7), faites-le manuellement :

```sql
-- 1️⃣ Vérifiez d'abord vos emails dans auth.users
SELECT id, email FROM auth.users ORDER BY email;

-- 2️⃣ Puis mettez à jour profiles en utilisant une JOIN
-- (car email est dans auth.users, pas profiles !)
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id
AND u.email IN (
  'votre_admin_1@email.com',
  'votre_admin_2@email.com',
  'votre_admin_3@email.com'
);

-- 3️⃣ Vérifiez que ça a fonctionné
SELECT p.id, u.email, p.role
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY u.email;
```

### Étape 3 : Redémarrer l'application Angular

1. **Arrêtez** le serveur de développement : `Ctrl+C` dans le terminal
2. **Relancez** : `ng serve`
3. Attendez le message : `✔ Compiled successfully`
4. **Rafraîchissez** le navigateur : `F5`

### Étape 4 : Vérifier que tout fonctionne

Ouvrez la console (F12) et vérifiez que :
- ❌ Plus d'erreurs `infinite recursion`
- ✅ Le dashboard affiche les **manuels totaux**
- ✅ La page **Liste des manuels** s'affiche
- ✅ L'onglet **Gérer les utilisateurs** affiche vos **3 admins**

---

## 🔍 Si ça ne marche toujours pas

### Diagnostic 1 : Vérifier manuellement dans Supabase

```sql
-- Vérifier que RLS est activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'manuals', 'levels', 'activities');
```

Vous devriez voir `rowsecurity = true` pour toutes les tables.

### Diagnostic 2 : Vérifier les policies

```sql
-- Voir toutes les policies
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Vous devriez voir les policies créées par le script (sans noms récursifs).

### Diagnostic 3 : Vérifier les rôles des admins

```sql
-- Voir qui a le rôle admin
SELECT p.id, u.email, p.role
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY u.email;
```

Au minimum 3 lignes devraient avoir `role = 'admin'`

### Diagnostic 4 : Si une policy spécifique cause toujours des problèmes

Identifiez la problématique :

```sql
-- Supprimer une policy spécifique
DROP POLICY IF EXISTS "nom_de_la_policy" ON public.table_name;

-- Puis relancez le script complet
```

---

## 📝 Notes Techniques

### Pourquoi le script fonctionne ?

1. **Désactiver RLS** : Permet de supprimer les policies sans conflit
2. **Supprimer les policies** : Élimine les références circulaires
3. **Réactiver RLS** : Réengage le système de sécurité
4. **Créer une fonction `is_admin()`** : Elle s'exécute avec les droits du propriétaire (`SECURITY DEFINER`) et peut lire `profiles` sans déclencher ses propres policies
5. **Utiliser cette fonction dans les policies** : Évite la récursion
6. **Utiliser une JOIN** : Pour mettre à jour les rôles puisque `email` est dans `auth.users`

### Architecture Supabase

```
┌─────────────────┐
│   auth.users    │
├─────────────────┤
│ id (uuid)       │
│ email           │ ← email est ICI !
│ password_hash   │
└─────────────────┘
        ↑
        │ (same id)
        │
┌─────────────────┐
│   profiles      │
├─────────────────┤
│ id (uuid)       │
│ full_name       │
│ role = 'admin'  │ ← rôle est ICI !
│ avatar_url      │
└─────────────────┘
```

---

## ✅ Checklist Final

- [ ] Script `fix_rls_complete.sql` exécuté sans erreur
- [ ] Vérification des rôles : 3 admins avec `role = 'admin'` via JOIN
- [ ] Application Angular redémarrée (`ng serve`)
- [ ] Console sans erreurs `infinite recursion`
- [ ] Dashboard affiche le nombre de manuels
- [ ] Liste des manuels fonctionne
- [ ] Gestion des utilisateurs affiche les 3 admins

Si tout est ✅, vous pouvez continuer à développer votre application !

