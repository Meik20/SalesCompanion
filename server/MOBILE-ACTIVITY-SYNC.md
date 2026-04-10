# Intégration Mobile Activity Sync - Serveur

## Vue d'ensemble
Le `mobile-activity-sync.js` fournit une couche serveur pour enregistrer les activités mobiles dans Firestore. Cela garantit que l'activité est capturée même si l'application mobile rate sa synchronisation.

## Installation dans Server.js

### 1. Importer le module
```javascript
const MobileActivitySync = require('./mobile-activity-sync');
```

### 2. Initialiser après connexion Firestore
```javascript
let mobileSync;

// Dans le setup Firestore
firestoreHelper.getFirestoreDb()
  .then(db => {
    mobileSync = new MobileActivitySync(db);
    console.log('[Server] Mobile Activity Sync initialized');
  })
  .catch(err => {
    console.warn('[Server] Mobile sync initialization delayed:', err.message);
  });
```

## Utilisation dans les Endpoints

### 1. Lors de l'enregistrement (/auth/register)
```javascript
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    // Register in database...
    // ...
    
    // Log to Firestore
    if (mobileSync) {
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /mobile|android|iphone/i.test(userAgent);
      
      if (isMobile) {
        await mobileSync.logMobileRegistration(email, name, {
          device_type: /ipad|android tablet/i.test(userAgent) ? 'tablet' : 'mobile',
          os: /iphone|ipad|ios/i.test(userAgent) ? 'iOS' : /android/i.test(userAgent) ? 'Android' : 'Unknown',
          user_agent: userAgent
        });
      }
    }
    
    res.json({success: true, token, user});
  } catch (error) {
    res.status(400).json({error: error.message});
  }
});
```

### 2. Lors de la connexion (/auth/login)
```javascript
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Login logic...
    const user = await authenticateUser(email, password);
    const token = generateToken(user);
    
    // Log to Firestore
    if (mobileSync) {
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /mobile|android|iphone/i.test(userAgent);
      
      if (isMobile) {
        await mobileSync.logUserActivity(user.id, email, 'login', {
          platform: 'mobile',
          success: true
        }).catch(err => console.warn('Mobile login log failed:', err));
      }
    }
    
    res.json({token, user});
  } catch (error) {
    res.status(401).json({error: error.message});
  }
});
```

### 3. Lors de la recherche (/api/search)
```javascript
app.post('/api/search', authenticateUser, async (req, res) => {
  const {query, filters} = req.body;
  const userId = req.user.id;
  const email = req.user.email;
  
  try {
    // Search logic...
    const results = await searchCompanies(query, filters);
    
    // Log to Firestore
    if (mobileSync) {
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /mobile|android|iphone/i.test(userAgent);
      
      if (isMobile) {
        await mobileSync.logMobileSearch(userId, email, query, filters, results.length)
          .catch(err => console.warn('Mobile search log failed:', err));
      }
    }
    
    res.json({results});
  } catch (error) {
    res.status(400).json({error: error.message});
  }
});
```

### 4. Lors du chat API (/api/chat)
```javascript
app.post('/api/chat', authenticateUser, async (req, res) => {
  const { messages } = req.body;
  const userId = req.user.id;
  const email = req.user.email;
  
  try {
    // Chat logic...
    const response = await generateChatResponse(messages);
    
    // Log to Firestore
    if (mobileSync) {
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /mobile|android|iphone/i.test(userAgent);
      
      if (isMobile) {
        await mobileSync.logMobileChatInteraction(userId, email, messages.length)
          .catch(err => console.warn('Mobile chat log failed:', err));
      }
    }
    
    res.json({choices: [{message: {content: response}}]});
  } catch (error) {
    res.status(400).json({error: error.message});
  }
});
```

## Endpoint Utilitaire pour Stats

### Récupérer les stats utilisateur
```javascript
app.get('/api/mobile/stats', authenticateUser, async (req, res) => {
  try {
    if (!mobileSync) {
      return res.status(503).json({error: 'Mobile sync not ready'});
    }
    
    const stats = await mobileSync.syncUserStats(req.user.email);
    res.json(stats || {activity_count: 0, search_count: 0});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});
```

### Récupérer l'historique d'activité
```javascript
app.get('/api/mobile/activities', authenticateUser, async (req, res) => {
  try {
    if (!mobileSync) {
      return res.status(503).json({error: 'Mobile sync not ready'});
    }
    
    const limit = req.query.limit || 50;
    const activities = await mobileSync.getUserRecentActivities(req.user.email, parseInt(limit));
    res.json({activities});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});
```

## Détection Mobile Recommandée

Pour différencier les requêtes mobiles:
```javascript
function isMobileRequest(userAgent) {
  return /mobile|android|iphone|ipad|windows phone/i.test(userAgent);
}

// Dans routes:
const userAgent = req.headers['user-agent'] || '';
const isMobile = isMobileRequest(userAgent);
```

## Failover & Error Handling

```javascript
// Toujours utiliser .catch() pour éviter que Firestore bloque les réponses API
if (mobileSync) {
  mobileSync.logUserActivity(userId, email, 'action', {})
    .catch(err => {
      console.warn('[Server] Firestore logging failed (API still succeeds):', err);
      // La réponse API est toujours envoyée, l'activité est juste pas loggée
    });
}
```

## Architecture Complète

```
Mobile App
    │
    ├──→ Firestore (client-side: firestore-mobile.js)
    │       └─→ queue locale si offline
    │
    └──→ API Server
            │
            └──→ Firestore (server-side: mobile-activity-sync.js)
                    ├─→ user_activity_logs
                    ├─→ users
                    └─→ saved_searches
```

## Avantages du Double Logging

✅ **Redondance**: Si le client échoue à logger, le serveur garde un backup
✅ **Cohérence**: Les données serveur sont canoniques
✅ **Analytics Real-time**: Les stats peuvent être calculées côté serveur
✅ **Audit Trail**: Trace complète de toute activité
✅ **Offline Resilience**: Le client reessaie, le serveur enregistre aussi

## Monitoring

Pour voir les activités mobiles loggées:
```bash
# Dans Firebase Console
# Collection: user_activity_logs
# Documents: email_normalized (ex: user_at_example_com)

# Pour trouver les activités mobiles:
# db.collectionGroup('activities').where('server_logged', '==', true)

# Pour compter les activités par jour:
# db.collection('user_activity_logs')
#   .where('activities', 'array-contains', {server_logged: true})
```

## Dépannage

**Les activités mobiles ne s'affichent pas**:
1. Vérifier que `mobileSync` est initialisé après Firestore
2. Vérifier que l'utilisateur a un ID valide dans `users` collection
3. Vérifier les logs serveur pour les erreurs Firestore

**Duplication d'activités**:
- Normal: le client log + le serveur log = entrées dupliquées
- Solution: utiliser une query `server_logged: true` pour le serveur uniquement

**Performance dégradée**:
- Les écritures Firestore sont asynchrones et non-bloquantes
- Utiliser `.catch()` toujours pour éviter les blocages
- Les écritures en batch ne sont faites que lors d'actions principales
