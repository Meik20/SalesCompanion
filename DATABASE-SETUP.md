# 📊 Configuration Base de Données - Sales Companion

## ⚠️ POSTGRESQL DEPRECATED - USE FIRESTORE INSTEAD

**PostgreSQL has been completely removed from SalesCompanion v2.0+**

Sales Companion now uses **Firestore/Firebase exclusively** for all data storage and authentication.

### ✅ Current Architecture (v2.0+)
- ✅ All data in Firestore
- ✅ Firebase Authentication (Admin + Users)
- ✅ Real-time sync across clients
- ✅ Automatic backups

### 📚 See Current Documentation
👉 **[FIRESTORE-DATABASE-SETUP.md](FIRESTORE-DATABASE-SETUP.md)** - Complete Firestore setup guide
👉 **[POSTGRESQL-REMOVAL-COMPLETE.md](POSTGRESQL-REMOVAL-COMPLETE.md)** - Migration details from v1.x

---

## 🗄️ LEGACY: PostgreSQL (v1.x - DEPRECATED)

This file documents the old PostgreSQL architecture.
```sql
psql postgresql://user:password@localhost:5432/sales_companion
```

---

## 🚀 Démarrer le serveur

```bash
cd server
npm install
npm start
```

Le serveur créera automatiquement toutes les tables PostgreSQL lors du premier démarrage.

**Admin par défaut** (à changer obligatoirement):
- Identifiant: `admin`
- Mot de passe: `admin123`
- Port: `3311`

---

## 📝 Recommandations

1. **Ne supprimez pas les fichiers Firebase** (optionnel, ne font pas de mal)
2. **Utilisez PostgreSQL** pour toute nouvelle développement
3. **Changez le mot de passe admin** immédiatement après le premier démarrage
4. **Configurez JWT_SECRET** en production  

---

## ❓ FAQ

**Q: Puis-je utiliser Firebase pour l'authentification?**
A: Oui, le code de fallback existe, mais ce n'est pas recommandé. Utilisez l'API JWT standard.

**Q: Dois-je garder les fichiers Firebase?**
A: Non, vous pouvez les supprimer sans problème s'ils vous dérangent.

**Q: Comment migrer d'une autre base de données?**
A: Voir [README-MIGRATION.md](./README-MIGRATION.md)

---

**Dernière mise à jour**: 2026-04-10  
**Statut**: Production (PostgreSQL)
