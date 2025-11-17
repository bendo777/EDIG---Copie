# ✅ Dernière Connexion - SOLUTION FINALE (RPC Function)

## 🎯 Le Problème

Vous aviez l'erreur :
```
AuthApiError: User not allowed (403)
```

**Cause :** `auth.admin.listUsers()` nécessite une clé de service, pas accessible depuis le client Angular.

**Solution :** Utiliser une **RPC Function** (PostgreSQL) pour récupérer `last_sign_in_at` de manière sécurisée.

---

## ✅ La Solution en 2 étapes

### Step 1️⃣ : Créer la RPC Function dans Supabase (1 min)

**Fichier :** `CREATE_RPC_LAST_SIGNIN.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_users_with_last_signin()
RETURNS TABLE (
  user_id uuid,
  email text,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.last_sign_in_at,
    au.created_at
  FROM auth.users au
  ORDER BY au.last_sign_in_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_users_with_last_signin() TO authenticated;
```

**À faire :**
1. Ouvrez Supabase → **SQL Editor** → **New Query**
2. Copiez le contenu de `CREATE_RPC_LAST_SIGNIN.sql`
3. Collez et cliquez **Run** ▶️
4. Vérifiez que la fonction fonctionne :
   ```sql
   SELECT * FROM public.get_users_with_last_signin();
   ```

Vous devez voir tous vos utilisateurs avec leurs `last_sign_in_at` ! ✅

### Step 2️⃣ : Code Angular mis à jour ✅

**Le code a automatiquement été modifié :**

```typescript
// Nouvelle fonction dans supabase.service.ts
async getUsersLastSignIn(): Promise<Map<string, string | null>> {
  const { data, error } = await this.supabase.rpc('get_users_with_last_signin');
  // Retourne une map : user_id → last_sign_in_at
}

// Mise à jour de getAdminUsers()
async getAdminUsers(): Promise<AdminUserProfile[]> {
  const profiles = await this.supabase.from('profiles').select('*');
  const lastSignInMap = await this.getUsersLastSignIn(); // ← Appelle la RPC
  
  return profiles.map(profile => ({
    ...profile,
    last_sign_in_at: lastSignInMap.get(profile.id) // ← Récupère la vraie date
  }));
}
```

### Step 3️⃣ : Redémarrer Angular (1 min)

```bash
Ctrl+C          # Arrêter
ng serve        # Relancer
```

---

## 🧪 Test

### Test 1️⃣ : Vérifier que la RPC fonctionne

Dans Supabase SQL Editor :
```sql
SELECT * FROM public.get_users_with_last_signin();
```

Vous devez voir :
```
user_id                              email                last_sign_in_at
────────────────────────────────────────────────────────────────────────
550e8400-e29b-41d4-a716-446655440000 admin1@edig.com      2025-11-02 07:19:21
550e8400-e29b-41d4-a716-446655440001 admin2@edig.com      2025-11-01 14:32:15
550e8400-e29b-41d4-a716-446655440002 user1@edig.com       2025-10-30 09:45:00
```

### Test 2️⃣ : Vérifier l'interface Angular

1. **Ouvrez** "Gestion des utilisateurs" dans le dashboard
2. **Vérifiez** que la colonne "Dernière connexion" affiche les dates ✅
3. Les dates devraient correspondre à celles de Supabase

---

## 📊 Architecture Finale

```
┌──────────────────────────────────┐
│    PostgreSQL (auth.users)       │
├──────────────────────────────────┤
│ id, email, last_sign_in_at ✅    │
└──────────────────────────────────┘
         ↑
         │ (RPC Function)
         │ get_users_with_last_signin()
         │
┌──────────────────────────────────┐
│    Angular (Service)             │
├──────────────────────────────────┤
│ getUsersLastSignIn()             │
│ getAdminUsers()                  │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│    Interface (Gestion Utilisateurs)
├──────────────────────────────────┤
│ Admin 1 | 2 nov. 2025 à 14:32    │ ✅
│ Admin 2 | 1 nov. 2025 à 10:15    │ ✅
│ User 1  | 30 oct. 2025 à 09:45   │ ✅
└──────────────────────────────────┘
```

---

## ✅ Résultat Attendu

**Interface "Gestion des utilisateurs" :**

```
Utilisateur        Rôle            Dernière connexion
──────────────────────────────────────────────────────
Admin 1            Administrateur  2 nov. 2025 à 14:32  ✅
Admin 2            Administrateur  1 nov. 2025 à 10:15  ✅
User 1             Utilisateur     30 oct. 2025 à 09:45 ✅
User 2             Utilisateur     Jamais              ✅
```

---

## 📝 Fichiers Modifiés

| Fichier | Changement |
|---------|-----------|
| `CREATE_RPC_LAST_SIGNIN.sql` | ✅ Créé - à exécuter dans Supabase |
| `supabase.service.ts` | ✅ Ajout `getUsersLastSignIn()` |
| `supabase.service.ts` | ✅ Mise à jour `getAdminUsers()` |

---

## 🔍 Dépannage

### Si vous voyez toujours "Jamais" :

1. **Vérifiez que la RPC fonctionne :**
   ```sql
   SELECT * FROM public.get_users_with_last_signin() LIMIT 1;
   ```

2. **Vérifiez que les utilisateurs sont bien dans auth.users :**
   ```sql
   SELECT id, email, last_sign_in_at FROM auth.users;
   ```

3. **Redémarrez Angular :**
   ```bash
   Ctrl+C && ng serve
   ```

### Si vous voyez une erreur :

```
Error fetching users last sign in via RPC: function get_users_with_last_signin() does not exist
```

→ La RPC n'a pas été créée. Exécutez `CREATE_RPC_LAST_SIGNIN.sql` dans Supabase.

---

## 💡 Comment ça fonctionne

1. **Côté Supabase :** La RPC function accède à `auth.users` avec les droits `SECURITY DEFINER`
2. **Côté Angular :** Vous appelez `this.supabase.rpc('get_users_with_last_signin')`
3. **Résultat :** Une map : `user_id → last_sign_in_at`
4. **Affichage :** L'interface fusionne `profiles` + les dernières connexions

---

**✅ C'est prêt ! Exécutez le script SQL et testez ! 🚀**













