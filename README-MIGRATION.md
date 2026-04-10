# 🔄 Migration SQLite → PostgreSQL

## ✅ Ce qui a changé

**AVANT** (SQLite - incompatible avec Railway) :
```javascript
const Database = require('better-sqlite3');
const db = new Database('sales_companion.db');
db.prepare('SELECT * FROM users').all();  // ← Synchrone
```

**APRÈS** (PostgreSQL - compatible Railway) :
```javascript
const { Pool } = require('pg');
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
const pool = new Pool({ connectionString: databaseUrl });
await dbQuery('SELECT * FROM users');  // ← Asynchrone
```

## 📦 Installation

### 1. Copier les fichiers dans ton projet

```bash
cd SalesCompanion/SalesCompanion/server

# Sauvegarde l'ancien serveur
mv server.js server-sqlite.js.backup

# Copie les nouveaux fichiers
cp /path/to/server-postgresql.js ./server.js
cp /path/to/.env ./
cp /path/to/package.json ./
```

### 2. Installer les dépendances

```bash
npm install
```

**Important** : Vérifie que `pg` est bien installé :
```bash
npm list pg
```

### 3. Configurer l'URL PostgreSQL

Édite le fichier `.env` avec ton URL Railway :
```env
DATABASE_URL=postgresql://postgres:HSMfPEnUeQPItxoILxysomZIuzHavZIw@maglev.proxy.rlwy.net:30184/railway
DATABASE_PUBLIC_URL=postgresql://postgres:HSMfPEnUeQPItxoILxysomZIuzHavZIw@maglev.proxy.rlwy.net:30184/railway
PORT=3311
NODE_ENV=development
```

### 4. Démarrer le serveur

```bash
npm start
```

Tu devrais voir :
```
🔄 Connecting to PostgreSQL...
✅ Database connected successfully
✅ Database initialized successfully
✅ Admin créé : admin / admin123

🚀 Sales Companion Server v2.0 (PostgreSQL)
   Panel Admin  : http://localhost:3311/admin
```

## 🔧 Principales modifications

### Syntaxe SQL différente

| SQLite | PostgreSQL |
|--------|------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `INTEGER DEFAULT 1` | `BOOLEAN DEFAULT true` |
| `TEXT DEFAULT (datetime('now'))` | `TIMESTAMP DEFAULT NOW()` |
| `LIKE` (sensible à la casse) | `ILIKE` (insensible) |

### Paramètres de requête

| SQLite | PostgreSQL |
|--------|------------|
| `?` (position) | `$1`, `$2`, `$3` (numérotés) |
| `.run(val1, val2)` | `query($1, [val1, val2])` |

### Gestion asynchrone

Toutes les requêtes sont maintenant **asynchrones** :
```javascript
// Avant (SQLite)
const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);

// Après (PostgreSQL)
const user = await dbQueryOne('SELECT * FROM users WHERE id=$1', [userId]);
```

## 🚨 Problèmes courants

### Erreur : "Cannot find module 'pg'"
```bash
npm install pg
```

### Erreur : "getaddrinfo ENOTFOUND"
→ Vérifie que ton URL PostgreSQL est correcte dans `.env`

### Erreur : "there is no unique constraint"
→ Normal ! C'était l'ancien serveur SQLite qui tentait de se connecter à PostgreSQL

### La base est vide après migration
→ Normal ! La base PostgreSQL sur Railway est neuve. Tu devras :
1. Importer à nouveau tes données Excel via l'admin
2. Ou exporter depuis SQLite puis importer dans PostgreSQL

## 📊 Migration des données (optionnel)

Si tu veux garder tes données SQLite, tu peux :

1. **Exporter depuis SQLite** :
```bash
sqlite3 sales_companion.db .dump > backup.sql
```

2. **Convertir le format** (les commandes SQLite → PostgreSQL)
3. **Importer dans PostgreSQL**

Ou plus simplement : **réimporter tes fichiers Excel** via l'admin panel.

## ✅ Checklist de vérification

- [ ] `npm install` terminé sans erreur
- [ ] Fichier `.env` avec `DATABASE_URL` correct
- [ ] Serveur démarre avec `✅ Database connected successfully`
- [ ] Panel admin accessible : http://localhost:3311/admin
- [ ] Login admin fonctionne (admin / admin123)

## 🎯 Prochaines étapes

1. **Tester l'admin** : http://localhost:3311/admin
2. **Importer tes données** : Excel via "Importer fichier"
3. **Déployer sur Railway** : Ce même code fonctionnera tel quel !

---

**Note** : Le fichier `server-sqlite.js.backup` contient ton ancien serveur SQLite au cas où tu en aurais besoin.
