# 🏢 Sales Companion v2.0 - B2B Intelligence Platform

Application multi-plateforme de prospection commerciale B2B pour le Cameroun.

**Statut**: ✅ Production (PostgreSQL)  
**Version**: 2.0.0  
**Déploiement**: Railway.app  

---

## 🚀 Démarrage rapide

### Installation locale
```bash
cd server
npm install
npm start
```

**Accès**:
- Panel Admin: http://localhost:3311/admin
- API: http://localhost:3311
- Mobile: http://localhost:3311/mobile

### Admin par défaut
- **Utilisateur**: `admin`
- **Mot de passe**: `admin123` (changez-le obligatoirement)
- **Port**: 3311

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [DATABASE-SETUP.md](./DATABASE-SETUP.md) | Configuration PostgreSQL et clarification Firebase |
| [README-MIGRATION.md](./README-MIGRATION.md) | Guide de migration SQLite → PostgreSQL |
| [server/FIREBASE_SETUP.md](./server/FIREBASE_SETUP.md) | Configuration Firebase (optionnel) |

---

## 📊 Architecture

| Composant | Framework | Statut |
|-----------|-----------|--------|
| **Backend** | Express.js 4.18 + PostgreSQL | ✅ Production |
| **Desktop** | Electron 41.2.0 | ✅ Fonctionnel |
| **Mobile** | PWA + Service Worker | ✅ Fonctionnel |
| **Admin** | HTML/JS SPA | ✅ Production |

---

## 🔐 Sécurité

### À faire immédiatement
1. ✅ Changez le mot de passe admin (forcé au premier login)
2. ⚠️ Configurez `JWT_SECRET` en production
3. ⚠️ Activez HTTPS pour les déploiements

### Base de données
- **Authentification**: JWT HS256 (30 jours)
- **Hash**: bcryptjs 2.4.3
- **SGBD**: PostgreSQL (pas SQLite!)

---

## ⚠️ Note sur Firebase

**Fichiers Firebase présents mais non utilisés**:
- `firebase-auth.js`, `firebase-init.js`, etc.

Ces fichiers sont des **vestiges optionnels**; l'application utilise PostgreSQL comme base de données principale. Voir [DATABASE-SETUP.md](./DATABASE-SETUP.md) pour plus d'infos.

---

## 📝 Fichiers clés

```
server/
├── server.js              # Express app principal
├── firestore-config.js    # Config BD
├── firestore-helpers.js   # Helpers BD
└── FIREBASE_SETUP.md      # Setup Firebase (optionnel)

client/
├── index.html             # Desktop UI (Electron)
├── main.js                # Electron main process
└── preload.js             # IPC preload

admin/
├── index.html             # Admin dashboard
└── assets/js/auth.js      # Auth logic

mobile/
├── index.html             # PWA mobile
├── manifest.json          # PWA config
└── sw.js                  # Service Worker
```

---

## 🛠️ Technologies utilisées

- **Node.js**: Backend runtime
- **Express 4.18**: Framework web
- **PostgreSQL**: Base de données
- **Electron 41.2**: Desktop app
- **JWT**: Authentification stateless
- **bcryptjs**: Hash de mots de passe
- **GROQ API**: Intégration IA

---

## 📞 Support

Pour des questions ou des problèmes:
1. Consultez [DATABASE-SETUP.md](./DATABASE-SETUP.md)
2. Vérifiez [README-MIGRATION.md](./README-MIGRATION.md)
3. Consultez les logs du serveur

---

**Dernière mise à jour**: 2026-04-10
