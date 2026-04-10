# 🔥 Firestore Configuration Guide - Sales Companion

## 📋 Aperçu

Sales Companion utilise maintenant **une architecture hybride**:
- **PostgreSQL**: Base de données principale (transactions ACID)
- **Firestore**: Synchronisation temps réel, backup, et accès cross-platform

### Avantages de cette approche
✅ **Résilience**: Données dupliquées sur 2 systèmes
✅ **Performance**: Firestore en parallèle pour requêtes temps réel
✅ **Scalabilité**: Firestore gère les pics de trafic
✅ **Real-time**: Notifications et mises à jour instantanées
✅ **Offline**: Possibilité de fonctionnement sans PostgreSQL

---

## 🚀 Configuration Firestore

### Étape 1 : Créer un projet Firebase

1. Allez sur https://console.firebase.google.com
2. Cliquez "Create Project"
3. Nommez-le: `sales-companion` (ou votre nom)
4. Acceptez les conditions
5. Cliquez "Create Project"

### Étape 2 : Créer une clé de compte de service

1. Dans Firebase Console, allez dans **Settings ⚙️** → **Service Accounts**
2. Cliquez l'onglet **Firebase Admin SDK**
3. Cliquez **"Generate New Private Key"**
4. Un fichier JSON sera téléchargé (ex: `serviceAccountKey.json`)
5. **Sauvegardez-le en lieu sûr** (ne le commitez jamais!)

### Étape 3 : Configurer les variables d'environnement

**Option A: Sur votre machine locale**

```bash
# Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json

# Windows PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccountKey.json"

# Windows CMD
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccountKey.json
```

**Option B: Sur Railway.app (Production)**

1. Dans Railway Dashboard, allez aux **Variables**
2. Créez une nouvelle variable: `GOOGLE_APPLICATION_CREDENTIALS`
3. Copiez le contenu du JSON (le fichier entier)
4. Collez-le comme valeur

**Option C: Via fichier .env**

```env
# .env
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccountKey.json
```

### Étape 4 : Créer la Firestore Database

1. Dans Firebase Console, allez à **Firestore Database**
2. Cliquez **"Create database"**
3. Choisissez **"Start in production mode"**
4. Sélectionnez votre région (ex: `us-central1`)
5. Cliquez **"Create"**

### Étape 5 : Configurer les règles de sécurité Firestore

1. Dans Firestore, allez à l'onglet **Rules**
2. Copiez-collez les règles depuis [firestore-backend-config.js](./firestore-backend-config.js#L11-L54)
3. Cliquez **"Publish"**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin data - Protected
    match /admin_config/{document=**} {
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isAdmin == true;
    }
    // ... (voir firestore-backend-config.js pour les règles complètes)
  }
}
```

### Étape 6 : Activer Authentication Email/Password

1. Allez à **Authentication** → **Sign-in method**
2. Cliquez **Email/Password**
3. Activez les deux options
4. Cliquez **"Save"**

---

## 📊 Architecture de synchronisation

### Flux de données

```
┌─────────────────┐
│  Client (SPA)   │
└────────┬────────┘
         │
         ├──► API Express ◄─────┐
         │                      │
         └──► Firestore         │ (Sync bidirectionnelle)
                                │
              ┌──────────────────┘
              │
       ┌──────▼───────┐
       │  PostgreSQL  │ ◄──── Source de vérité
       │  (Principal) │
       └──────┬───────┘
              │
              └──► Firestore (Backup)
                   (Double-write)
```

### Points de synchronisation

| Opération | PostgreSQL | Firestore | Délai |
|-----------|-----------|-----------|-------|
| Création utilisateur | ✅ Synchrone | ✅ Async (fire-and-forget) | <100ms |
| Update profil | ✅ Synchrone | ✅ Async | <100ms |
| Usage logs | ✅ Synchrone | ✅ Async | <100ms |
| Stats admin | ✅ Synchrone | ✅ Async | <100ms |
| Companies | ✅ Synchrone | ✅ Async | <100ms |

---

## 🔄 Synchronisation en action

### 1️⃣ Création d'utilisateur

```javascript
// server.js: /auth/register
const newUser = { id: result.id, name, email, plan: 'free', ... };

// Write primaire (PostgreSQL)
await dbQuery('INSERT INTO users ...', params);

// Write secondaire (Firestore - non-blocking)
firestoreHelpers.syncUserToFirestore(newUser)
  .catch(err => console.warn('[Firestore] Sync failed:', err.message));
```

### 2️⃣ Enregistrement d'usage log

```javascript
// server.js: /api/search
await dbQuery('INSERT INTO usage_logs ...', params);

// Sync to Firestore
if (isFirestoreReady()) {
  firestoreHelpers.syncUsageLogToFirestore(logData)
    .catch(err => console.warn('[Firestore] Sync failed:', err.message));
}
```

### 3️⃣ Synchronisation des statistiques

```javascript
// server.js: /admin/stats
const statsData = { totalUsers, totalCompanies, ... };

// Sync to Firestore
if (isFirestoreReady()) {
  firestoreHelpers.syncStatsToFirestore(statsData)
    .catch(err => console.warn('[Firestore] Stats sync failed:', err.message));
}
```

---

## 🧪 Test de synchronisation

### 1. Démarrer le serveur

```bash
cd server
npm install
npm start
```

Vous devriez voir dans les logs:
```
✅ Firestore initialized with GOOGLE_APPLICATION_CREDENTIALS
```

### 2. Créer un utilisateur de test

```bash
curl -X POST http://localhost:3311/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Vérifier dans Firestore Console

1. Allez à https://console.firebase.google.com
2. Sélectionnez votre projet
3. Allez à **Firestore** → Collection `admin_users`
4. Vous devriez voir votre nouvel utilisateur synchronisé!

### 4. Tester une recherche (usage log)

```bash
curl -X POST http://localhost:3311/api/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test",
    "filters": {}
  }'
```

Vérifiez dans Firestore → Collection `admin_usage_logs`

---

## 📝 Fichiers de configuration

| Fichier | Objectif |
|---------|----------|
| `server/firestore-config.js` | Init et gestion de connexion |
| `server/firestore-helpers.js` | Fonctions de CRUD et sync |
| `server/firestore-backend-config.js` | Config, règles, collections |
| `serviceAccountKey.json` | Credentials (NE PAS committer!) |

---

## 🚨 Troubleshooting

### "Firestore not initialized"

```
⚠️  Firestore credentials not found - admin data will use fallback
```

**Solution:**
- Vérifiez que `GOOGLE_APPLICATION_CREDENTIALS` est défini
- Vérifiez le chemin du fichier JSON
- Le serveur fonctionne quand même avec PostgreSQL seul

### "Permission denied" dans Firestore

**Solution:**
- Vérifiez les règles de sécurité Firestore
- Assurez-vous que les collections existent
- Vérifiez que la clé de service a les permissions

### Firestore sync échoue silencieusement

**Vérifiez les logs:**
```bash
# Recherchez les avertissements
npm start | grep "\[Firestore\]"
```

---

## 🔐 Sécurité

### À faire

✅ **Collecte des données sensibles:**
- Stockez le `serviceAccountKey.json` en variable d'environnement
- N'ajoutez jamais `serviceAccountKey.json` à git
- Utilisez des secrets sur Railway/Heroku

✅ **Règles Firestore:**
- Les règles par défaut (production mode) refusent tout
- Customisez selon vos besoins
- Testez les règles dans la console Firebase

✅ **Quotas:**
- Firestore a des quotas gratuits (voir pricing)
- Configurez des alertes Firebase pour les dépassements

### À éviter

❌ Committer `serviceAccountKey.json`
❌ Utiliser des credentials dans le code source
❌ Modifier les règles Firestore sans test
❌ Laisser les logs de debug en production

---

## 💰 Coûts Firestore (2024)

### Plan gratuit (Spark)
- 25,000 lectures/jour
- 20,000 écritures/jour
- 1 GB stockage

### Plan payant (Blaze)  
- $0.06 par 100,000 lectures
- $0.18 par 100,000 écritures
- $0.18 par GB stockage/mois

**Estimation Sales Companion:**
- ~1,000 utilisateurs actifs/jour
- ~10,000 recherches/jour
- **Coût estimé: $5-15/mois** (très inférieur à PostgreSQL géré)

---

## 📚 Documentation officielle

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Firestore Pricing](https://firebase.google.com/pricing)

---

**Dernière mise à jour**: 2026-04-10  
**Statut**: ✅ Production (Hybrid PostgreSQL + Firestore)
