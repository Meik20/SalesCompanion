# Intégration Firestore - Application Mobile

## Vue d'ensemble
L'application mobile Sales Companion est maintenant connectée à Firestore pour la persiste persistante des enquêtes et l'activité de l'utilisateur.

## Architecture

### 1. **Enregistrement Utilisateur (Inscription)**
- L'utilisateur crée un compte via le formulaire d'inscription
- Les données sont d'abord envoyées au serveur API (`/auth/register`)
- Ensuite, les données utilisateur sont persistées dans Firestore:
  - Collection: `users`
  - Champs: email, name, plan, device_type, os, user_agent, created_at, last_login, activity_count, search_count, metadata

### 2. **Synchronisation de Session (Connexion)**
- L'utilisateur se connecte via API ou Firebase Auth
- La session est synchronisée dans Firestore:
  - `users` collection: last_login, last_sync
  - Permet la récupération d'activité précédente

### 3. **Journalisation d'Activité**
L'app mobile enregistre automatiquement:

#### a) **Activité de Recherche**
```javascript
await mobileFirestore.logSearch(query, filters, resultCount);
```
- Query: texte de recherche
- Filters: critères appliqués
- Result Count: nombre de résultats trouvés

#### b) **Visualisation d'Entreprises**
```javascript
await mobileFirestore.logCompanyView(companyId, companyName);
```
- Enregistre chaque entreprise consultée

#### c) **Activité Générale**
```javascript
await mobileFirestore.logActivity(action, details);
```
- Actions: 'search', 'company_view', 'share', 'call', 'email', etc.

### 4. **Sauvegarde des Requêtes**
- Les utilisateurs peuvent sauvegarder des recherches pour accès rapide
- Les données sont stockées dans Firestore:
  - Collection: `saved_searches`
  - Lié à l'utilisateur via `user_id`

## Collections Firestore Utilisées

### `users`
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "plan": "free",
  "device_type": "mobile/tablet",
  "os": "iOS/Android",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2026-04-10T12:34:56Z",
  "last_login": "2026-04-10T15:45:30Z",
  "last_sync": "2026-04-10T15:45:30Z",
  "activity_count": 42,
  "search_count": 15,
  "last_activity": "2026-04-10T15:45:00Z",
  "saved_searches": ["search_id_1", "search_id_2"],
  "metadata": {
    "app_version": "1.0.0",
    "timezone": "Africa/Douala",
    "language": "fr"
  }
}
```

### `user_activity_logs`
```json
{
  "user_id": "user_email_normalized",
  "email": "user@example.com",
  "registrations": [
    {
      "timestamp": "2026-04-10T12:34:56Z",
      "device_type": "mobile",
      "os": "Android"
    }
  ],
  "activities": [
    {
      "action": "search",
      "timestamp": "2026-04-10T15:45:30Z",
      "details": {
        "query": "industrie textile",
        "filters": { "region": "Douala", "size": "SME" },
        "result_count": 23
      },
      "device_info": {
        "device_type": "mobile",
        "os": "Android",
        "screen_size": "1080x2340"
      }
    }
  ],
  "activity_count": 42,
  "created_at": "2026-04-10T12:34:56Z",
  "last_activity": "2026-04-10T15:45:00Z"
}
```

### `saved_searches`
```json
{
  "user_id": "user_email_normalized",
  "query": "exportateurs africains",
  "filters": {
    "region": "Cameroun",
    "industry": "Agriculture",
    "size": "Large"
  },
  "results_count": 156,
  "timestamp": "2026-04-10T15:45:30Z",
  "device_type": "mobile"
}
```

## Persistance Offline

### Queue de Synchronisation
L'app implémente une queue de synchronisation offline:

1. **Création de Queue**: Quand une action échoue (pas de connexion), elle est mise en queue
2. **Stockage Local**: La queue est persistée dans localStorage
3. **Traitement Automatique**: Chaque 30 secondes, la système tente de synchroniser
4. **Rétention**: Max 3 tentatives avec délai exponentiel

### Événements Synchronisés
- Enregistrement utilisateur
- Activité (search, company_view)
- Sauvegarde de recherches
- Synchronisation de session

## Points d'Intégration dans le Code

### 1. **Auth.js** (firestore-mobile.js)
- `MobileFirestoreManager` class
- Méthodes: initialize, registerUser, logActivity, logSearch, logCompanyView, saveSearch, syncSession
- Queue management avec retry logic

### 2. **Mobile Index.html**
- Import des scripts Firestore après Firebase
- Initialisation au démarrage de l'app
- Appels intégrés dans doLogin(), doRegister()

## Avantages de cette Architecture

✅ **Persistance Multiplateforme**: Données accessibles du web, desktop, mobile
✅ **Offline Resilience**: Queue locale permet fonctionnement hors ligne
✅ **Real-time Sync**: Les données sont à jour en temps réel
✅ **Analytics Built-in**: L'activité est capturée et traçable
✅ **Cross-Device**: L'utilisateur volt son historique sur tous les appareils
✅ **No Data Loss**: Les actions offline sont rattrapées quand online

## Troubleshooting

### L'activité n'est pas enregistrée
1. Vérifier que Firestore est initialisé: `console.log(mobileFirestore.isInitialized)`
2. Vérifier l'userId est défini: `console.log(mobileFirestore.userId)`
3. Vérifier la connexion à Firestore: `console.log(mobileFirestore.db)`

### Queue de synchronisation bloquée
1. Vérifier localStorage: `localStorage.getItem('firestore_sync_queue')`
2. Nettoyer la queue: `localStorage.removeItem('firestore_sync_queue')`
3. Forcer la sync: `mobileFirestore.processSyncQueue()`

### Données dupliquées
- Les actions en queue sont retraitées avec retry logic
- Les documents Firestore sont créés avec `merge: true` pour éviter les écrasements

## Prochaines Étapes

1. ✅ **Logs d'Activité Complets**: Ajouter logs des actions: share, email, call, visit_website
2. ✅ **Analytics Dashboard**: Créer un dashboard pour voir les stats d'utilisation par utilisateur
3. ✅ **Export des Données**: Permettre aux utilisateurs d'exporter l'historique de leurs recherches
4. ✅ **Notifications**: Notifier les utilisateurs hors ligne que sync est en cours
5. ✅ **Encryption Offline**: Chiffrer les données offline pour sécurité
