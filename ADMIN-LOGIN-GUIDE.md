# 🔐 Admin Login - Guide de Résolution des Problèmes

## Status: ✅ Fonctionnel

Page de connexion admin redéveloppée avec :
- ✅ UX moderne et réactive
- ✅ Logs détaillés côté serveur
- ✅ Gestion des erreurs améliorée  
- ✅ Support Firestore automatique
- ✅ Lien vers page de setup

---

## 🚀 Démarrage Rapide

### 1. Démarrer le serveur

```bash
cd SalesCompanion/server
npm install
npm start
```

Vous devriez voir :
```
╔════════════════════════════════════╗
║   SALES COMPANION v2.0 - SERVER    ║
╠════════════════════════════════════╣
║ 🚀 Server running on 0.0.0.0       ║
║ 📍 Port: 3000                      ║
║ 🔥 Firestore: ✅ READY             ║
║ 📍 Panel Admin: http://localhost:3000/admin
║ 📍 Health: http://localhost:3000/health
╠════════════════════════════════════╣
║ 🔐 DEFAULT LOGIN (CHANGE AFTER!)    ║
║ Username: admin                    ║
║ Password: admin123                 ║
╚════════════════════════════════════╝
```

### 2. Accéder à la connexion

- **Pages disponibles** :
  - Admin page: `http://localhost:3000/admin/` (liste des fichiers)
  - Login page: `http://localhost:3000/admin/login.html` (nouvelle page)
  - Old admin panel: `http://localhost:3000/admin/index.html` (ancien index)

### 3. Se connecter

**Identifiants par défaut** :
- Username: `admin`
- Password: `admin123`

⚠️ **Changez ces identifiants après le premier login !**

---

## 🔍 Dépannage

### Problème : "Impossible de contacter le serveur"

**Cause** : Le serveur Node ne tourne pas

**Solution** :
```bash
cd SalesCompanion/server
npm install
npm start
```

Vérifier que vous voyez le message `✅ Server running` et `🔥 Firestore: ✅ READY`.

---

### Problème : "Identifiant ou mot de passe incorrect"

**Cause 1** : L'admin n'existe pas dans Firestore

**Solution** :
1. Vérifier les logs du serveur
2. Si vous voyez `✅ Default admin created`, l'admin a été créé
3. Rafraîchir la page et réessayer

**Cause 2** : Mauvais identifiant/mot de passe

**Solution** :
1. Vérifier que vous utilisez exactement : `admin` / `admin123`
2. Attention aux espaces ou caractères supplémentaires
3. Appuyer sur Entrée ou cliquer sur bouton "Connexion"

---

### Problème : La page de connexion ne charge pas

**Cause** : Firestore n'est pas initialisé

**Solution** :
1. Vérifier que `FIREBASE_SERVICE_ACCOUNT` est défini
2. Vérifier les logs : chercher `❌ Firestore init failed`
3. Voir [FIRESTORE-SETUP.md](../FIRESTORE-SETUP.md)

---

### Problème : "Database not ready"

**Cause** : Firestore n'est pas encore initialisé

**Solution** :
1. L'app essaie de se reconnecter automatiquement
2. Attendre 2-3 secondes
3. Rafraîchir la page

---

## 📋 Fichiers Importants

| Fichier | Rôle |
|---------|------|
| `login.html` | 🆕 Nouvelle page de connexion (moderne) |
| `index.html` | Ancien panel admin (peut ne pas marcher) |
| `server-firestore.js` | Serveur avec endpoint `/admin/login` |
| `firestore-config.js` | Configuration Firestore |

---

## 🧪 Tests Manuels

### Tester l'endpoint directement

```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Réponse attendue** :
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": { "id": "xxx", "email": "admin" },
  "needs_password_change": false
}
```

### Tester le health endpoint

```bash
curl http://localhost:3000/health
```

**Réponse attendue** :
```json
{
  "status": "ok",
  "db": true,
  "time": "2026-04-11T..."
}
```

---

## 🔐 Sécurité

### À faire :

1. ✅ **Changez l'identifiant/mot de passe admin IMMÉDIATEMENT** après le premier login
2. ✅ **Utilisez un `JWT_SECRET` fort** en production :
   ```bash
   openssl rand -base64 32
   ```
3. ✅ **Configurez Firestore Security Rules** pour protéger les données
4. ✅ **Utilisez HTTPS** en production
5. ✅ **Cachez `FIREBASE_SERVICE_ACCOUNT`** (jamais dans le code)

---

## 📞 Support

### Vérifier les logs du serveur

```bash
# Terminal 1 : Lancer le serveur
cd SalesCompanion/server && npm start

# Terminal 2 : Faire un test de connexion dans le navigateur
# Regarder les logs du Terminal 1 pour les détails
```

### Logs à chercher

**Succès** :
```
[POST /admin/login] Tentative de connexion pour: admin
[POST /admin/login] Recherche effectuée. Résultat: Trouvé
[POST /admin/login] ✅ Mot de passe correct
[POST /admin/login] ✅ Token généré et connexion réussie
```

**Erreur** :
```
[POST /admin/login] ❌ Admin non trouvé avec email: admin
[POST /admin/login] ❌ Mot de passe incorrect
[POST /admin/login] ❌ Database not initialized
```

---

## 🚀 Prochaines étapes

- [ ] Tester la page `/admin/login.html`
- [ ] Vérifier les logs du serveur
- [ ] Changer le mot de passe admin par défaut
- [ ] Configurer Firestore Security Rules
- [ ] Déployer sur Railway

---

**Document créé**: 11 avril 2026  
**Version**: 2.0 Firestore Exclusive
