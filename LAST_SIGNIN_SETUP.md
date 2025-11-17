# 📝 Suivi de la Dernière Connexion

## Objectif
Enregistrer l'heure de déconnexion de chaque utilisateur et l'afficher dans l'interface "Gestion des utilisateurs".

## ✅ Mise en place

### Step 1️⃣ : Exécuter le script SQL (Supabase)

Fichier : `ADD_LAST_SIGNIN_COLUMN.sql`

1. Ouvrez Supabase → **SQL Editor** → **New Query**
2. Copiez le contenu de `ADD_LAST_SIGNIN_COLUMN.sql`
3. Collez et cliquez **Run** ▶️
4. Vérifiez que la colonne `last_sign_in_at` s'affiche

### Step 2️⃣ : Code Angular déjà mis à jour ✅

Le code suivant a été **automatiquement ajouté** :

**Dans `supabase.service.ts` :**
```typescript
// Nouvelle fonction pour mettre à jour la dernière connexion
async updateLastSignIn(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await this.supabase
    .from('profiles')
    .update({ last_sign_in_at: now })
    .eq('id', userId);
  // ...
}
```

**Dans `dashboard.component.ts` (fonction logout) :**
```typescript
async logout(): Promise<void> {
  const user = await this.supabaseService.getUser();
  if (user) {
    await this.supabaseService.updateLastSignIn(user.id); // ← Enregistre le timestamp
  }
  await this.supabaseService.supabase.auth.signOut();
  // ...
}
```

### Step 3️⃣ : Redémarrer l'application

```bash
Ctrl+C          # Arrêter
ng serve        # Relancer
```

## 🧪 Test

### Test 1️⃣ : Vérifier que la colonne existe

Dans Supabase SQL Editor :
```sql
SELECT id, full_name, last_sign_in_at
FROM public.profiles
LIMIT 5;
```

Vous devez voir la colonne `last_sign_in_at` (valeur peut être NULL pour l'instant).

### Test 2️⃣ : Tester le système complet

1. Connectez-vous avec un compte admin
2. Allez dans le dashboard
3. Cliquez sur le profil (haut-droit) → **Déconnexion**
4. La date de déconnexion est enregistrée dans la base de données

### Test 3️⃣ : Afficher les connexions dans l'interface

1. Reconnectez-vous
2. Allez dans **Gestion des utilisateurs**
3. Consultez la colonne **"Dernière connexion"** (ou ouvrez les détails d'un utilisateur)
4. Vous devez voir la date/heure de votre dernière déconnexion ✅

## 📋 Flux Complet

```
Utilisateur clique "Déconnexion"
    ↓
logout() s'exécute
    ↓
updateLastSignIn(userId) enregistre NOW() dans last_sign_in_at
    ↓
signOut() effectue la déconnexion
    ↓
Prochaine connexion :
    L'interface "Gestion des utilisateurs" affiche la date/heure
```

## 🎯 Résultat Attendu

**Dans l'interface "Gestion des utilisateurs" :**

```
Utilisateur           | Rôle              | Dernière connexion
─────────────────────┼──────────────────┼──────────────────────
Admin 1              | Administrateur   | 2 nov. 2025 à 14:32
Admin 2              | Administrateur   | 1 nov. 2025 à 10:15
User 1               | Utilisateur      | 30 oct. 2025 à 09:45
User 2               | Utilisateur      | Jamais
```

## ⚠️ Notes Importantes

1. **Timestamp :** La fonction `updateLastSignIn()` enregistre `NOW()` au moment de la déconnexion
2. **Format :** Utilisez le format ISO 8601 avec timezone
3. **NULL :** Les utilisateurs qui ne se sont jamais déconnectés auront `NULL`
4. **Performance :** Un index est créé sur cette colonne pour les requêtes rapides

## 🔄 Améliorations Futures (Optionnel)

Si vous voulez aussi tracker la **première connexion** et les **connexions répétées** :

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
```

Puis mettre à jour `login_count` à chaque connexion (à faire dans le composant login).

---

**✅ C'est prêt ! Exécutez le script SQL et testez ! 🚀**













