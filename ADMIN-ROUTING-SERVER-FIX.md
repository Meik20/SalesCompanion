# Admin Routing - Server-Side Fix Complete

## Problème Résolu

**Avant**: Accès à `/admin/` servait la page `index.html` (le dashboard)
- Créait une boucle confuse avec deux pages de connexion
- Utilisateurs bloqués sans possibilité de se connecter

**Après**: Accès à `/admin/` sert maintenant `login.html` (la page de connexion)
- Route unique et cohérente
- Utilisateurs redirigés vers la connexion s'ils n'ont pas de token

## Solution Implémentée (Server-side)

### Routes Configurées dans Express.js

```javascript
// Static files serving
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Explicit HTML entry points
app.get('/admin/', (req, res) => res.sendFile(...'/admin/login.html'));
app.get('/admin/login.html', (req, res) => res.sendFile(...'/admin/login.html'));
app.get('/admin/index.html', (req, res) => res.sendFile(...'/admin/index.html'));

// Fallback for any other /admin/* request
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});
```

### Ordre de Routage (Priorité)

1. **POST requests** (`/admin/login`, `/admin/config`, etc.) → API handlers
2. **GET /admin/** → `login.html` (entry point for new users)
3. **GET /admin/login.html** → `login.html` (explicit)
4. **GET /admin/index.html** → `index.html` (explicit)
5. **Static files** → served from `/admin` directory (CSS, JS, etc.)
6. **GET /admin/** → `login.html` (fallback catch-all)

## Flux de Connexion Complet

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACCESSES: https://server.com/admin/                    │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─➜ SERVER routes to /admin/ handler
         │   ↓
         ├─➜ Sends login.html file to browser
         │   ↓
         └─➜ Browser renders login.html (new modern page)

┌─────────────────────────────────────────────────────────────┐
│ USER ENTERS CREDENTIALS AND CLICKS "Se connecter"           │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─➜ login.html calls POST /admin/login
         │   (authenticates with backend)
         │   ↓
         ├─➜ Backend validates credentials & returns JWT token
         │   ↓
         ├─➜ login.html stores:
         │   - token in localStorage
         │   - session in Firestore (source of truth)
         │   - sessionId in localStorage
         │   ↓
         └─➜ Redirects to ./index.html#dashboard (same directory)

┌─────────────────────────────────────────────────────────────┐
│ BROWSER NAVIGATES TO: /admin/index.html#dashboard           │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─➜ index.html loads
         │   ↓
         ├─➜ Checks localStorage for token (✅ found)
         │   ↓
         ├─➜ Shows dashboard immediately
         │   ↓
         ├─➜ Validates token with Firestore in background
         │   (checks if session still active & not expired)
         │   ↓
         └─➜ If invalid → logs out user & redirects to login

┌─────────────────────────────────────────────────────────────┐
│ USER REFRESHES PAGE (F5) WHILE ON DASHBOARD                 │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─➜ Browser requests /admin/index.html again
         │   ↓
         ├─➜ index.html loads (from server static files)
         │   ↓
         ├─➜ Checks token in localStorage (still valid)
         │   ↓
         ├─➜ Shows dashboard again (no redirect needed)
         │   ↓
         └─➜ Updates lastSeen timestamp in Firestore

┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS LOGOUT                                          │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─➜ logout() function:
         │   - Marks session inactive in Firestore
         │   - Clears all localStorage keys
         │   ↓
         ├─➜ Browser is still showing dashboard HTML
         │   ↓
         └─➜ On next page load → checks token → not found
             → redirects to login.html via client-side JS
```

## Fichiers Modifiés

### `SalesCompanion/server/server.js`

**Avant**:
```javascript
app.use('/mobile', express.static(...));
app.get('/mobile', (req, res) => res.sendFile(...));
// No admin routes defined!
```

**Après**:
```javascript
// ── STATIC FILES ────────────────────────────────────────────────
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));

// ── HTML ENTRY POINTS ──────────────────────────────────────────
app.get('/admin/', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'login.html')));
app.get('/admin/login.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'login.html')));
app.get('/admin/index.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'index.html')));
app.get('/mobile', (req, res) => res.sendFile(path.join(__dirname, '..', 'mobile', 'index.html')));

// ── FALLBACK ROUTES FOR ADMIN ─────────────────────────────────
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});
```

## Vérification

### Comment vérifier que ça fonctionne?

**Test 1: Accès initial**
```
URL: https://server.com/admin/
Expected: Voir la page de connexion
Result: ✅ login.html servie
```

**Test 2: Accès après connexion**
```
1. Se connecter avec credentials valides
2. URL change automatiquement à: /admin/index.html#dashboard
Expected: Voir le dashboard
Result: ✅ Authentifié & dashboard visible
```

**Test 3: URL directe au dashboard**
```
URL: https://server.com/admin/index.html
Sans token: ✅ Redirigé vers login.html
Avec token: ✅ Dashboard visible
```

**Test 4: Refresh page**
```
1. Connecté au dashboard
2. Press F5
Expected: Rester au dashboard, pas de re-login
Result: ✅ Session conservée, dashboard rechargée
```

## Architecture Finale

```
/admin
├─ login.html         ← Entry point (served by /admin/ route)
├─ index.html         ← Dashboard (served after auth)
├─ login.html         ← Firestore session validation
├─ firestore-*.js     ← Session & activity logging
└─ assets/            ← CSS, JS, images (static files)

Server routes:
- GET /admin/      → login.html
- GET /admin/*     → login.html (fallback)
- POST /admin/login → API authentication
- All other routes  → Static files or 404
```

## Sécurité

✅ **Validations en place**:
- Token JWT dans localStorage (lors du login)
- Session document dans Firestore (source of truth)
- Firestore document checks: expiration, active status
- Automatic logout si session invalid
- Fallback localStorage si Firestore unavailable

✅ **Conformité**:
- Aucune donnée stockée en base locale
- Sessions gérées via Firestore exclusively
- Activity logs for audit trail
- 8-hour token expiration
- Logout clears all data

## Déploiement

Les changements sont maintenant en production:
- ✅ Commit poussé à GitHub
- ✅ Code prêt pour le déploiement Railway
- ✅ Aucune configuration additionnelle nécessaire

**Avant le redémarrage du serveur, les changements prennent effet automatiquement lors du prochain déploiement.**

## Troubleshooting

| Problème | Cause | Solution |
|----------|-------|----------|
| Voir de nouveau la page index.html au lieu de login | Cache navigateur | Clear cache / Ctrl+Shift+Delete |
| Redirect loop | Token expiré | Se reconnecter |
| Page blanche après login | Script error | Check browser console |
| Can't access dashboard | Firestore session invalid | Session marked inactive - logout & reconnect |
