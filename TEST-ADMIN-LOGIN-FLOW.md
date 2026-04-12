# Test de Redirection Admin - Vérification Manuelle

## Checklist de Test

### Test 1: Accès direct à la page de connexion
```
URL: https://salescompanion-production-a34d.up.railway.app/admin/login.html

Expected:
- ✅ Page de connexion affichée (nouveau design)
- ✅ Formulaire avec 3 champs: URL Serveur, Identifiant, Mot de passe
- ✅ Logo et branding Sales Companion visibles
```

### Test 2: Connexion réussie
```
Actions:
1. Enter URL serveur: https://salescompanion-production-a34d.up.railway.app
2. Enter username: admin
3. Enter password: [your password]
4. Click "Se connecter"

Expected:
- ✅ Message "Connexion réussie! Redirection..."
- ✅ Redirigé vers: /admin/index.html#dashboard
- ✅ Dashboard admin affiche correctement
- ✅ Aucune "boucle" de connexion
```

### Test 3: Accès sans token
```
URL: https://salescompanion-production-a34d.up.railway.app/admin/

Expected:
- ✅ Redirigé automatiquement vers: /admin/login.html
- ✅ Page de connexion affichée
```

### Test 4: Rafraîchissement après connexion
```
Actions:
1. Connecté au dashboard
2. Cliquer sur F5 pour rafraîchir
3. Attendre 1 seconde

Expected:
- ✅ Dashboard conservé (pas de redirect vers login)
- ✅ Token trouvé dans localStorage
- ✅ Session validée en Firestore
```

### Test 5: Logout et reconnexion
```
Actions:
1. Cliquer le bouton "← Déconnexion"
2. Appuyer sur F5

Expected:
- ✅ Redirigé vers login.html
- ✅ Tous les tokens supprimés
- ✅ Session marquée inactive dans Firestore
- ✅ Nouvelle connexion possible
```

### Test 6: Erreur de credentials
```
Actions:
1. Aller à /admin/login.html
2. Entrer wrong password
3. Click "Se connecter"

Expected:
- ✅ Message d'erreur: "Mot de passe incorrect" ou similaire
- ✅ Rester à la page de connexion
- ✅ Pas de boucle infinie
```

## What Changed

### Before (Problematique)
```
/admin/login.html 
    ↓ (redirect ./)
/admin/ 
    ↓ (loads index.html)
affiche auth-page inline
    ↓ (user enters credentials)
handleLoginSubmit() 
    ↓ (stored token)
affiche dashboard
```
**Problème**: Deux pages de connexion, redirects implicites, confusion

### After (Fixée)
```
/admin/login.html (SEULE page de connexion)
    ↓ (credentials entered)
Token sauvé → Session créée → Firestore stockage
    ↓ (redirect ./index.html#dashboard)
/admin/index.html vérifie token
    ↓
Affiche dashboard
```

## Fichiers Supprimés
- ✅ `SalesCompanion/admin/login-debug.html`
- ✅ `SalesCompanion/admin/login-test.html`

## Fichiers Modifiés
1. **SalesCompanion/admin/login.html**
   - Redirects mises à jour pour pointer vers index.html#dashboard
   - Sessions créées dans Firestore avant redirection

2. **SalesCompanion/admin/index.html**
   - Redirige vers login.html si pas authentifié
   - Session validée en Firestore au chargement

## Validation Technique

```javascript
// Structure de redirection vérifiée:

// login.html ✅
window.location.href = './index.html#dashboard';

// index.html ✅
if(!authManager.isAuthenticated()) {
    window.location.href = './login.html';
}

// Sessions en Firestore ✅
db.collection('admin_sessions').doc(sessionId).set(sessionData);
```

## Signaux Attendus dans Console

```
[Admin Login] ✅ Authentication successful
[Admin Login] ✅ Session stored in Firestore
[Admin Dashboard] ✅ Valid session found in Firestore
[Admin Dashboard] Dashboard panel displayed
```

## Troubleshooting

### Symptôme: Boucle infinie de logout
- Cause: Token expiré
- Vérifier: Firestore session pas expired
- Solution: Se reconnecter

### Symptôme: Redirigé vers login mais pas connecté
- Cause: localStorage cleared
- Vérifier: Browser console → Application → Local Storage
- Solution: Vérifier `sc_admin_token` existe

### Symptôme: Page blanche après connexion
- Cause: Script error possible
- Solution:
  1. Check browser console for errors
  2. Check Firestore session was created
  3. Try clearing localStorage and reconnecting
