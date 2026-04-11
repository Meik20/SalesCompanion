# 📊 FIRESTORE COLLECTIONS SCHEMA

## Overview
Toutes les nouvelles données sont **automatiquement enregistrées** dans Firestore. Chaque opération est loggée dans `activity_logs`.

---

## Collections Principales

### 1️⃣ **users** — Utilisateurs Standards
```javascript
{
  email: string,                    // Email unique
  name: string,                     // Nom complet
  company: string,                  // Entreprise
  password_hash: string,            // Bcrypt hash
  plan: string (free|starter|pro),  // Plan tarif
  status: string (active|inactive),
  created_at: timestamp,
  updated_at: timestamp,
  last_login: timestamp,
  search_count: number,
  phone?: string,
  website?: string
}
```

**Endpoints:**
- `POST /api/users/create` → Crée un nouvel utilisateur + LOG
- `GET /api/users/:userId` → Récupère le profil
- `PUT /api/users/:userId` → Met à jour le profil + LOG

---

### 2️⃣ **admin_users** — Administrateurs
```javascript
{
  email: string,              // Email unique
  password_hash: string,      // Bcrypt hash
  role: string (admin),
  first_login: boolean,
  last_login?: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Endpoints:**
- `POST /admin/login` → Authentifie + UPDATE last_login + LOG
- `POST /admin/register` → Crée un nouvel admin + LOG

---

### 3️⃣ **companies** — Entreprises Enregistrées
```javascript
{
  name: string,                    // Nom entreprise
  industry: string,                // Secteur
  location: string,                // Localisation
  contact_name: string,
  contact_email: string,
  phone: string,
  website: string,
  created_by: string (user_id),   // Qui l'a créée
  created_at: timestamp,
  updated_at: timestamp,
  status: string (active|archived)
}
```

**Endpoints:**
- `POST /api/companies/create` → Crée une entreprise + LOG (require auth)
- `GET /api/companies` → Liste les entreprises
- `GET /api/companies/:companyId` → Détails entreprise

---

### 4️⃣ **activity_logs** — Journal d'Activités (AUTO)
**AUTO-CREATED** pour chaque action utilisateur.

```javascript
{
  type: string,                    // user_created, company_created, search_performed, etc.
  user_id: string,                 // Qui l'a fait
  details: object,                 // Données contextuelles
  timestamp: timestamp,            // Quand
  ip: string,                      // Adresse IP (si disponible)
  status?: string (success|error)
}
```

**Types d'activités trackées:**
- `user_created` — Nouvel utilisateur créé
- `admin_login_success` — Admin connecté
- `admin_login_failed` — Tentative échouée
- `company_created` — Entreprise créée
- `search_performed` — Recherche effectuée
- `user_updated` — Profil mis à jour
- `*_error` — Erreur rencontrée
- ...et plus

**Accès:**
- `GET /api/activity-logs` → Liste les logs (admin only)

---

### 5️⃣ **search_logs** — Historique des Recherches
```javascript
{
  user_id: string,
  query: string,              // Texte recherché
  filters: object,            // Filtres appliqués
  results_count: number,      // Nombres de résultats
  timestamp: timestamp
}
```

**Endpoint:**
- `POST /api/search` → Enregistre la recherche + LOG

---

### 6️⃣ **admin_config** — Configuration Application
```javascript
{
  app_name: string,
  version: string,
  created_at: timestamp,
  last_updated: timestamp,
  sync_enabled: boolean,
  features: object               // Flags fonctionnalités
}
```

---

### 7️⃣ **usage_logs** (Dépreciated → Voir activity_logs)
Remplacé par `activity_logs` pour meilleur suivi.

---

## AUTO-LOGGING Pattern

Chaque opération qui modifie des données:

```javascript
// 1️⃣ Effectuer l'action
const result = await db.collection('users').add({...});

// 2️⃣ Auto-log (appelé automatiquement)
await logActivity('user_created', userId, { email, name });

// 3️⃣ Réponse utilisateur
res.json({ id: result.id, ...data });
```

---

## Endpoints Disponibles

### 👤 Users
```bash
POST   /api/users/create              # Créer utilisateur
GET    /api/users/:userId             # Profil utilisateur
PUT    /api/users/:userId             # Mettre à jour profil
```

### 📊 Companies
```bash
POST   /api/companies/create          # Créer entreprise
GET    /api/companies                 # Lister entreprises
GET    /api/companies/:companyId      # Détails entreprise
```

### 🔍 Search
```bash
POST   /api/search                    # Effectuer recherche (enregistrée auto)
GET    /api/search-logs               # Historique recherches
```

### 👨‍💼 Admin
```bash
POST   /admin/login                   # Connexion admin (loggée)
POST   /admin/register                # Créer admin
GET    /api/activity-logs             # Voir tous les logs
```

---

## Exemple de Requête pour Créer un Utilisateur

### Request
```bash
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "secure123",
    "company": "ACME Corp",
    "plan": "starter"
  }'
```

### Response
```json
{
  "id": "ABC123",
  "email": "user@example.com",
  "name": "John Doe",
  "token": "eyJhbGci...",
  "message": "User created successfully"
}
```

### Firestore Enregistré
**Collection: `users`**
```
Doc: ABC123
{
  email: "user@example.com",
  name: "John Doe",
  password_hash: "$2a$10$...",
  company: "ACME Corp",
  plan: "starter",
  status: "active",
  created_at: "2026-04-11T10:30:00.000Z",
  search_count: 0
}
```

**Collection: `activity_logs`**
```
Doc: XYZ789
{
  type: "user_created",
  user_id: "ABC123",
  details: {
    email: "user@example.com",
    name: "John Doe",
    company: "ACME Corp",
    plan: "starter"
  },
  timestamp: "2026-04-11T10:30:00.000Z"
}
```

---

## Sécurité Firestore Rules (À Implémenter)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Logs visibility
    match /activity_logs/{logId} {
      allow read: if request.auth.token.role == 'admin';
      allow write: if request.auth != null;
    }
    
    // Users can edit themselves
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.token.role == 'admin';
    }
    
    // Admin only
    match /admin_users/{adminId} {
      allow read, write: if request.auth.token.role == 'admin';
    }
    
    // Companies
    match /companies/{companyId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }
  }
}
```

---

## Status: ✅ LIVE

- ✅ Auto-logging pour tous les utilisateurs
- ✅ Tracking des activités
- ✅ Endpoints pour créer utilisateurs/entreprises
- ✅ Tokens JWT pour authentification
- ⏳ Firestore Rules (à configurer)
