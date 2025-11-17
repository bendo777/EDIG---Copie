# ⚡ Quick Fix Checklist - Corriger les erreurs RLS

## Ordre des étapes (à faire dans cet ordre)

### ✅ Step 1 : Comprendre la structure (2 min)
- [ ] `email` est dans `auth.users` (pas dans `profiles`)
- [ ] `role` est dans `profiles`
- [ ] Pour mettre à jour les rôles : on utilise une **JOIN**
- [ ] Les policies RLS créent une récursion infinie → on va les fixer

---

### ✅ Step 2 : Copier le script SQL (1 min)

**Fichier à copier :** `fix_rls_complete.sql`

```bash
Ctrl+A  # Sélectionner tout
Ctrl+C  # Copier
```

---

### ✅ Step 3 : Exécuter dans Supabase (2 min)

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez **SQL Editor** → **New Query**
4. Collez le script entier :
   ```bash
   Ctrl+V  # Coller
   ```
5. Cliquez **Run** (bouton ▶️)
6. Attendez 10-30 secondes

---

### ✅ Step 4 : Vérifier les résultats (1 min)

Vous devriez voir à la fin :
```
total_profiles | admin_count | user_count
──────────────┼─────────────┼────────────
     X        |      3      |     Y
```

Et ensuite :
```
id        | email              | role
──────────┼────────────────────┼────────
xxxxx     | admin@edig.com     | admin
xxxxx     | admin3@gmail.com   | admin
xxxxx     | admin4@admin.com   | admin
```

✅ Si vous voyez **3 admins** → Passer à l'étape 5
❌ Si vous voyez **0 admins** → Faire l'étape 5

---

### ✅ Step 5 : Mettre à jour les admins (si nécessaire)

**Seulement si l'étape 4 montre 0 admins !**

Exécuter cette requête dans Supabase :

```sql
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id
AND u.email IN (
  'admin@edig.com',
  'admin3@gmail.com',
  'admin4@admin.com'
);
```

Puis vérifier avec :
```sql
SELECT p.id, u.email, p.role
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY u.email;
```

---

### ✅ Step 6 : Redémarrer Angular (2 min)

```bash
Ctrl+C          # Arrêter le serveur
ng serve        # Relancer
```

Attendre le message ✔ Compiled successfully

---

### ✅ Step 7 : Tester dans le navigateur (1 min)

1. Ouvrez la console (F12)
2. Cherchez les erreurs `infinite recursion`
3. Devrait afficher ✅

**Vérifications :**
- [ ] Dashboard affiche "Total manuels : X"
- [ ] "Liste des manuels" fonctionne
- [ ] "Gérer les utilisateurs" affiche 3 admins
- [ ] Pas d'erreurs rouges dans la console

---

## ⚠️ Erreur Courante : "column email does not exist"

**Cause :** Vous avez utilisé `WHERE email IN` au lieu de la JOIN

**Solution :** Utiliser cette query exacte :
```sql
UPDATE public.profiles p      -- ← p = alias pour profiles
SET role = 'admin'
FROM auth.users u             -- ← u = alias pour auth.users
WHERE p.id = u.id            -- ← JOIN sur les IDs
AND u.email IN (              -- ← email dans auth.users
  'admin@edig.com',
  'admin3@gmail.com',
  'admin4@admin.com'
);
```

---

## 🔍 Diagnostics Rapides

### Si le script échoue :
```sql
-- Vérifier que RLS est activé
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'manuals');
-- Tous les tablename doivent avoir rowsecurity = true
```

### Si les admins ne s'affichent pas :
```sql
-- Vérifier les rôles
SELECT p.id, u.email, p.role FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';
-- Doit afficher 3 lignes minimum
```

### Si le dashboard affiche "0 manuels" :
```sql
-- Vérifier les manuels
SELECT COUNT(*) as total_manuals FROM public.manuals;
-- Doit afficher > 0
```

---

## 📊 Résumé des fichiers

| Fichier | Usage |
|---------|-------|
| `fix_rls_complete.sql` | 👈 **Exécuter CELUI-CI** |
| `INSTRUCTIONS_RLS_FIX.md` | Lire si vous avez des problèmes |
| `RLS_SOLUTION_SUMMARY.md` | Comprendre le contexte général |
| `QUICK_FIX_CHECKLIST.md` | Vous êtes ici ! |

---

## ⏱️ Temps total estimé : 10-15 minutes

1. Comprendre : 2 min
2. Copier/Exécuter : 3 min
3. Vérifier/Fixer : 3 min
4. Redémarrer Angular : 2 min
5. Tester : 1 min

---

**Status : Prêt à commencer ? 🚀**

▶️ Commencez par `fix_rls_complete.sql` dans Supabase !
