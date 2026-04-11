# Admin Dashboard - Firestore Integration

## Vue d'ensemble

Le tableau de bord admin est maintenant **entièrement synchronisé avec Firestore** pour garantir la persistance des données critiques.

## Architecture

```
Admin Dashboard (Frontend)
    ↓
┌─────────────────────────────┐
│ firestore-storage.js        │ ← Gestionnaire de stockage Firestore
│ (Classe FirestoreAdminStore │   - Save/Get/Query/Delete
│  age)                       │   - Batch operations
└─────────────────────────────┘   - Real-time listeners
    ↓
┌─────────────────────────────┐
│ firestore-admin-hooks.js    │ ← Hooks d'intégration
│ (Synchronisation auto)      │   - onAdminLoginSuccess
└─────────────────────────────┘   - onUsersLoaded
    ↓                             - onCompaniesLoaded
  Firestore                       - onStatsLoaded
(Collections de données)          - onImportCompleted
```

## Collections Firestore exploitées

### 1. **admin_sessions**
Suivi des connexions administrateur

```javascript
{
  email: "admin@example.com",
  loginTime: Timestamp,
  lastActive: Timestamp,
  ip: "web_dashboard",
  userAgent: "..."
}
```

### 2. **admin_users**
Synchronisation de tous les utilisateurs du système

```javascript
{
  id: "user_123",
  name: "John Doe",
  email: "john@example.com",
  plan: "pro",
  dailyUsed: 145,
  status: "active",
  createdAt: Timestamp,
  syncedFrom: "admin_dashboard",
  lastUpdated: Timestamp
}
```

### 3. **admin_companies**
Base de données des entreprises

```javascript
{
  id: "company_456",
  raisonSociale: "ABC SARL",
  niu: "123456789",
  activite: "Commerce",
  region: "Littoral",
  ville: "Douala",
  email: "contact@abc.cm",
  syncedFrom: "admin_dashboard",
  lastUpdated: Timestamp
}
```

### 4. **admin_stats**
Statistiques en temps réel du tableau de bord

```javascript
{
  totalUsers: 247,
  totalCompanies: 15842,
  totalSearches: 8934,
  activeToday: 42,
  timestamp: Timestamp,
  snapshotFrom: "admin_dashboard"
}
```

### 5. **admin_import_logs**
Historique des importations de données

```javascript
{
  filename: "companies_2026_04.csv",
  totalRows: 5000,
  imported: 4850,
  skipped: 100,
  errors: 50,
  importedAt: Timestamp,
  status: "completed"
}
```

### 6. **admin_config**
Configuration du tableau de bord

```javascript
{
  groqApiKey: "gsk_...",
  adminPassword: "hashed",
  settings: {...},
  lastModified: Timestamp,
  modifiedBy: "admin_dashboard"
}
```

### 7. **admin_backups**
Snapshots périodiques de l'état du tableau de bord

```javascript
{
  currentPage: "page-users",
  timestamp: Timestamp,
  syncBackup: {
    initialized: true,
    queueLength: 0,
    isSyncing: false
  }
}
```

## Utilisation dans l'application

### Pour sauvegarder des données :

```javascript
// Simple save
await window.firestoreAdminStorage.save('admin_users', 'user_123', {
  name: 'John',
  email: 'john@example.com'
});

// Batch save (multiple documents)
const users = [
  { id: 'user_1', name: 'User 1' },
  { id: 'user_2', name: 'User 2' }
];
await window.firestoreAdminStorage.batchSave('admin_users', users);

// Query data
const results = await window.firestoreAdminStorage.query('admin_users', [
  { field: 'plan', operator: '==', value: 'pro' }
]);

// Real-time listener
const unsubscribe = window.firestoreAdminStorage.onSnapshot(
  'admin_stats',
  'dashboard_snapshot',
  (data) => {
    console.log('Stats updated:', data);
  }
);
```

### Hooks disponibles :

Ces fonctions sont appelées automatiquement lors des événements clés :

```javascript
onAdminLoginSuccess(admin)        // Après connexion admin
onUsersLoaded(users)               // Après chargement des utilisateurs
onCompaniesLoaded(companies)       // Après chargement des entreprises
onStatsLoaded(stats)               // Après calcul des statistiques
onImportCompleted(importLog)       // Après une importation
onConfigChanged(config)            // Après modification config
```

## Garanties de persistance

### ✅ Synchronisation garantie

- **Queue automatique** : Si Firestore n'est pas disponible, les données sont mises en queue
- **Retry automatique** : Tentatives de synchronisation toutes les 5 secondes
- **Fallback local** : localStorage maintient les données même si Firestore échoue

### ✅ Données critiques prioritaires

1. Sessions admin (authentification)
2. Configuration (settings)
3. Utilisateurs (comptes)
4. Entreprises (base de données principale)
5. Statistiques (dashboards)
6. Logs d'importation (audit)

### ✅ Intégrité des données

- **Timestamps serveur** : Toutes les données ont `lastUpdated` avec le timestamp du serveur
- **Validation** : Les données sont validées avant sauvegarde
- **Sanitization** : Suppression des valeurs `undefined`, gestion des Dates

## Statut de synchronisation

Vérifiez l'état de la synchronisation :

```javascript
const status = window.firestoreAdminStorage.getStatus();
console.log(status);
// {
//   initialized: true,
//   queueLength: 0,
//   isSyncing: false
// }
```

## Dépannage

### "Firestore not initialized"
- Vérifiez que Firebase est chargé
- Attendez l'initialisation complète avant d'utiliser la storage
- Vérifiez les credentials dans la console

### Queue qui grandit
- Vérifiez la connexion internet
- Vérifiez les permissions Firestore (Rules)
- Vérifiez la limite de quota Firebase

### Données manquantes
- Vérifiez que `onSnapshot()` listeners sont actifs
- Vérifiez les règles Firestore permettent la lecture
- Consultez les logs navigateur pour les erreurs

## Performance

- **Batch max** : 10 opérations par cycle de sync
- **Retry interval** : 5 secondes
- **Periodic backup** : 5 minutes
- **Queue max** : Illimité (mais utilise localStorage après 1000 items)

## Sécurité

- Toutes les clés Firebase sont dans `.env` (jamais en dur)
- Les credentials de service account sont en `.gitignore`
- Les sessions admin sont timestampées et tracées
- Chaque opération enregistre `modifiedBy` et `lastUpdated`

## Intégration côté serveur

Le serveur (server.js) synchronise aussi vers Firestore :

```
PostgreSQL (primary)
        ↓
   server.js
        ↓
  firestore-helpers.js
        ↓
  Firestore (backup)
```

Les deux sources (admin dashboard + serveur) convergent vers Firestore pour une vue unique des données.

---

**Statut** : ✅ Production-ready
**Dernière mise à jour** : 2026-04-10
