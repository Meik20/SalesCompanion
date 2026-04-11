# ☑️ Firebase + Firestore Setup Checklist (5 min)

## 📊 Estimation du temps

```
✓ Étape 1: Créer projet Firebase        [2 min]
✓ Étape 2: Télécharger clé service      [1 min]  
✓ Étape 3: Configurer Firestore + règles [1 min]
✓ Étape 4: Tester synchronisation        [1 min]
───────────────────────────────────────────
  TOTAL:                                 [5 min]
```

---

## ✅ ÉTAPE 1: Créer projet Firebase (2 minutes)

**Temps estimé: 2 min**

### Checklist:
- [ ] Ouvrir https://console.firebase.google.com
- [ ] Cliquer **"Create Project"** ou **"Add Project"**
- [ ] Nom du projet: `sales-companion`
- [ ] Google Analytics: **OFF** (pas nécessaire)
- [ ] Cliquer **"Create Project"**
- [ ] Attendre que le projet se crée (✓ montrera un coche)
- [ ] Copier votre **PROJECT_ID** (dans l'URL: `firebase.google.com/project/<PROJECT_ID>`)

### ✏️ Notez votre PROJECT_ID:
```
MonProjectID: _________________________
```

**Continuer →**

---

## ✅ ÉTAPE 2: Télécharger la clé de service (1 minute)

**Temps estimé: 1 min**

### Checklist:
- [ ] Dans Firebase Console: Cliquer l'icône ⚙️ **Settings** (en haut à gauche)
- [ ] Aller à l'onglet **"Service Accounts"**
- [ ] Cliquer **"Generate New Private Key"** 
- [ ] Un fichier JSON va se télécharger (ex: `sales-companion-abcd1234-key.json`)
- [ ] ✅ Vérifier le fichier dans Téléchargements

### 📂 Copier le fichier:
```
📥 Depuis:  C:\Users\VOTRENOM\Downloads\[PROJECT_ID]-key.json
📤 Vers:    SalesCompanion\SalesCompanion\serviceAccountKey.json
```

**Comment copier (Windows):**
1. Ouvrir l'Explorateur de fichiers
2. Naviguer à Téléchargements
3. Trouver le fichier JSON (il commence par le PROJECT_ID)
4. **Copier** (Ctrl+C)
5. Aller à `SalesCompanion\SalesCompanion\`
6. **Coller** (Ctrl+V)

### ✅ Vérification:
- [ ] Fichier `serviceAccountKey.json` present dans `SalesCompanion\SalesCompanion\`

**Continuer →**

---

## ✅ ÉTAPE 3: Configurer Firestore + Règles (1 minute)

**Temps estimé: 1 min**

### Part A: Créer la Firestore Database (30 sec)

- [ ] Dans Firebase Console, cliquer **Firestore Database** (menu gauche)
- [ ] Cliquer **"Create Database"**
- [ ] Mode: **"Start in production mode"** (sélectionné)
- [ ] Location: **"us-central1"** (ou région proche de vous)
- [ ] Cliquer **"Create"**
- [ ] Attendre l'initialisation (✓ quand disponible)

### Part B: Appliquer les règles de sécurité (30 sec)

- [ ] Dans Firestore, aller à l'onglet **"Rules"**
- [ ] **Sélectionner TOUT** le texte existant (Ctrl+A)
- [ ] Ouvrir le fichier: `SalesCompanion\firestore-rules.txt`
- [ ] **Copier** tout le contenu (Ctrl+A → Ctrl+C)
- [ ] Revenir à Firestore Rules
- [ ] **Coller** (Ctrl+V)
- [ ] Cliquer **"Publish"**

### ✅ Vérification:
- [ ] Firestore Database créée ✓
- [ ] Règles publiées avec succès ✓

**Continuer →**

---

## ✅ ÉTAPE 4: Configurer applicat local (1 minute)

**Temps estimé: 1 min**

### Windows PowerShell:

**Étape 1:** Naviguer au projet
```powershell
cd SalesCompanion\SalesCompanion
```

**Étape 2:** Définir la variable d'environnement
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="$(pwd)\serviceAccountKey.json"
```

**Étape 3:** Vérifier que c'est configuré
```powershell
echo $env:GOOGLE_APPLICATION_CREDENTIALS
```
Devrait afficher: `C:\...\SalesCompanion\SalesCompanion\serviceAccountKey.json`

### Ou créer un fichier `.env`:

Créer un fichier `SalesCompanion\SalesCompanion\.env`:
```env
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIRESTORE_SYNC_ENABLED=true
PORT=3000
NODE_ENV=development
```

### ✅ Vérification:
- [ ] Variable d'env configurée OU `.env` créé

**Continuer →**

---

## 🧪 ÉTAPE 5: Tester la synchronisation (1 minute)

**Temps estimé: 1 min**

### Démarrer le serveur:

```powershell
cd server
npm install
npm start
```

### ✅ Regarder les logs:

Vous devriez voir:
```
✅ Firestore initialized with GOOGLE_APPLICATION_CREDENTIALS
🚀 Sales Companion Server v2.0 (Firestore)
   Panel Admin  : http://localhost:3000/admin
   API          : http://localhost:3000
   Login        : admin / admin123
```

### 🎯 Tester la création d'utilisateur:

1. Ouvrir http://localhost:3000/admin
2. Identifiants: `admin` / `admin123`
3. Créer un nouvel utilisateur (Registration)
4. Ouvrir Firebase Console → Firestore
5. Aller à Collection `admin_users`
6. **Vérifier que le nouvel utilisateur y apparaît!** 🎉

### ✅ Synchronisation réussie:
- [ ] L'utilisateur apparaît dans Firestore
- [ ] Les logs du serveur montrent `[Firestore] User synced`
- [ ] Pas d'erreurs de connexion

---

## ✨ STATUSFinal

| Étape | ✅ Statut | Notes |
|-------|---------|-------|
| Firebase Project | [?] | À compléter |
| Service Account Key | [?] | À compléter |
| Firestore Database | [?] | À compléter |
| Security Rules | [?] | À compléter |
| Env Config | [?] | À compléter |
| Server Start | [?] | À compléter |
| Test Sync | [?] | À compléter |

---

## ⚠️ Troubleshooting rapide

### "Firestore not initialized"
```
⚠️  Firestore credentials not found - admin data will use fallback
```
**Solution:** 
- Vérifier que `serviceAccountKey.json` existe
- Vérifier que `GOOGLE_APPLICATION_CREDENTIALS` est défini
- ✅ Firestore is the primary database (PostgreSQL no longer used)

### "Permission denied" / "PERMISSION_DENIED"
**Solution:**
- Vérifier les règles Firestore (doit être `allow read, write`)
- Attendre quelques secondes après la publication des règles

### Fichier JSON introuvable
**Solution:**
- Chercher dans: `C:\Users\VOTRENOM\Downloads\*-key.json`
- Copier vers: `SalesCompanion\SalesCompanion\serviceAccountKey.json`
- Vérifier le chemin exact

---

## 🎓 Rappel des fichiers importants

Après configuration, votre structure doit être:
```
SalesCompanion/
├── SalesCompanion/
│   ├── server/
│   │   ├── server.js
│   │   └── firestore-config.js
│   ├── serviceAccountKey.json     ← ✅ Clé de service
│   ├── .env (optionnel)           ← Variables d'env
│   │
│   └── ...autres fichiers...
│
├── firebase-setup.bat             ← Script setup (Windows)
├── firebase-setup.sh              ← Script setup (Linux/Mac)
├── firestore-rules.txt            ← Règles à copier
└── FIRESTORE-QUICKSTART.md
```

---

## 🎉 Félicitations!

Si vous voyez vos utilisateurs dans Firestore Console, c'est que **tout fonctionne!** 

**Prochaines étapes:**
1. ✅ Firebase + Firestore configuré
2. ✅ Synchronisation active
3. → Déployer sur production (Railway.app)
4. → Configurer secrets Firebase

**Documentation complète:**
- [FIRESTORE-QUICKSTART.md](./FIRESTORE-QUICKSTART.md)
- [server/FIRESTORE-SETUP.md](./server/FIRESTORE-SETUP.md)

---

**Temps total: ~5 minutes ⏱️**
