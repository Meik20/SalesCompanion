# 📊 Configuration Base de Données - Sales Companion

## ✅ Base de données actuelle : PostgreSQL

Sales Companion **2.0** utilise **PostgreSQL** comme base de données principale.

### Migration effectuée
- ✅ SQLite → PostgreSQL (complétée)
- ✅ Tous les données migrées
- ✅ Toutes les requêtes optimisées pour PostgreSQL

---

## ⚠️ À propos des fichiers Firebase

Certains fichiers Firebase existent dans le répertoire (`firebase-auth.js`, `firebase-init.js`, etc.), mais ils sont **déprécié et ne sont pas utilisés** pour la base de données.

### Pourquoi existent-ils?
- **Compatibilité optionnelle** : Peuvent être utilisés pour l'authentification utilisateur (en complément)
- **Historique** : Vestiges de la version 1.x (optionnel, laissés pour référence)
- **Non critiques** : Peuvent être supprimés sans affecter le fonctionnement

### Authentification
- ✅ **API JWT** : Authentification utilisateur via `/auth/login` et `/auth/register` (principal)
- ⚠️ **Firebase Auth** : Code de fallback inclus (fallback optionnel, non utilisé par défaut)
- 🔐 **Token stockés** : JWT HS256 (30 jours d'expiration)

---

## 🗄️ Configuration PostgreSQL

### Variables d'environnement requises
```env
DATABASE_URL=postgresql://user:password@localhost:5432/sales_companion
JWT_SECRET=sc-secret-2025
PORT=3311
NODE_ENV=production
```

### Tables principales
- `admins` - Comptes administrateurs
- `users` - Comptes utilisateurs
- `companies` - Base de données entreprises
- `usage_logs` - Historique des recherches
- `pipeline` - CRM d'opportunités
- `saved_searches` - Signets utilisateurs
- `import_logs` - Historique des imports
- `config` - Configuration système (API keys, etc.)

### Connexion locale
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
