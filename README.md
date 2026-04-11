# 🏢 Sales Companion v2.0 - B2B Intelligence Platform

Application multi-plateforme de prospection commerciale B2B pour le Cameroun.

**Statut**: ✅ Production (Firestore EXCLUSIVE)  
**Version**: 2.0.0  
**Déploiement**: Railway.app  
**Base de Données**: 🔥 Google Cloud Firestore (EXCLUSIVE)

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

### Prerequisites
- Node.js 14+
- Credentials Firestore (`GOOGLE_APPLICATION_CREDENTIALS` ou env vars)
- Voir [FIRESTORE-EXCLUSIVE-MIGRATION.md](./FIRESTORE-EXCLUSIVE-MIGRATION.md)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [FIRESTORE-EXCLUSIVE-MIGRATION.md](./FIRESTORE-EXCLUSIVE-MIGRATION.md) | ⭐ Architecture Firestore 100% + changements |
| [server/FIRESTORE-SETUP.md](./server/FIRESTORE-SETUP.md) | Configuration Firebase |
| [FIRESTORE-QUICKSTART.md](./FIRESTORE-QUICKSTART.md) | Quickstart Firestore |

---

## 📊 Architecture

| Composant | Framework | Statut |
|-----------|-----------|--------|
| **Backend** | Express.js 4.18 + Firestore | ✅ Production |
| **Desktop** | Electron 41.2.0 | ✅ Fonctionnel |
| **Mobile** | PWA + Service Worker | ✅ Fonctionnel |
| **Admin** | HTML/JS SPA | ✅ Production |
| **Database** | Google Cloud Firestore | ✅ EXCLUSIVE |

---

## 🔐 Sécurité

### À faire immédiatement
1. ✅ Changez le mot de passe admin (forcé au premier login)
2. ⚠️ Configurez `JWT_SECRET` en production
3. ⚠️ Activez HTTPS pour les déploiements
4. ⚠️ Configurez Firestore Security Rules

### Base de données
- **Authentification**: JWT HS256 (30 jours)
- **Hash**: bcryptjs 2.4.3
- **SGBD**: Google Cloud Firestore (EXCLUSIVE - pas PostgreSQL, pas SQLite!)
- **Stockage**: Collections Firestore avec auto-scaling

---

## ✅ Migration Firestore COMPLETE

**PostgreSQL et SQLite ont été complètement supprimés.**

- ✅ Dépendance `sqlite3` supprimée
- ✅ Tous les endpoints utilisent Firestore
- ✅ Admin functions → Firestore EXCLUSIVE
- ✅ Fallback d'urgence local documenté

Voir [FIRESTORE-EXCLUSIVE-MIGRATION.md](./FIRESTORE-EXCLUSIVE-MIGRATION.md) pour les détails complets.

---

## 📝 Fichiers clés

```
server/
├── server.js                    # Express app principal (Firestore)
├── firestore-config.js          # Init Firestore
├── firestore-helpers.js         # Helpers Firestore
├── admin-db-local.js            # Backup d'urgence (Firestore primaire)
└── FIRESTORE-SETUP.md           # Setup Firestore

client/
├── index.html                   # Desktop UI (Electron)
├── main.js                      # Electron main process
└── preload.js                   # IPC preload

admin/
├── index.html                   # Admin dashboard
└── assets/js/auth.js            # Auth logic

mobile/
├── index.html                   # PWA mobile
├── manifest.json                # PWA config
└── sw.js                        # Service Worker
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
