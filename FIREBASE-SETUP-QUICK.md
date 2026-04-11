# 🚀 Firebase Setup - FASTEST WAY (5 min)

## Étape 1️⃣: Créer Firebase (2 min)
```
https://console.firebase.google.com
  ↓
"Create Project"
  ↓
Name: sales-companion
  ↓
"Create" (attendre ✓)
```
✅ **Résultat**: PROJECT_ID visible dans l'URL

---

## Étape 2️⃣: Télécharger clé (1 min)
```
Settings ⚙️ → "Service Accounts" → "Generate Private Key"
  ↓
Fichier JSON téléchargé: PROJECT_ID-key.json
  ↓
Copier vers: SalesCompanion/SalesCompanion/serviceAccountKey.json
```
✅ **Résultat**: serviceAccountKey.json dans le dossier

---

## Étape 3️⃣: Firestore + Règles (1 min)
```
Firestore Database → "Create Database" → Production → us-central1
  ↓
Onglet "Rules" → Copier contenu de firestore-rules.txt
  ↓
Coller et "Publish"
```
✅ **Résultat**: Firestore Database active avec règles

---

## Étape 4️⃣: Lancer serveur (1 min)
```powershell
cd SalesCompanion\SalesCompanion\server
npm install
npm start
```
✅ **Résultat**: Voir "✅ Firestore initialized"

---

## 🧪 Tester (30 sec)
1. Ouvrir: http://localhost:3311/admin
2. Login: admin / admin123
3. Créer utilisateur de test
4. Ouvrir Firebase Console → Firestore
5. Collection `admin_users` → voir l'utilisateur ✓

---

## 📁 Fichiers à utiliser

| Fichier | Plateforme | Usage |
|---------|-----------|-------|
| `firebase-setup.ps1` | Windows PowerShell | ⭐ RECOMMANDÉ |
| `firebase-setup.bat` | Windows CMD | Alternative |
| `firebase-setup.sh` | Linux/Mac | Alternative |
| `FIRESTORE-CHECKLIST.md` | Tous | Checklist manuelle |
| `firestore-rules.txt` | Tous | Règles à copier |

---

## ⏱️ Timeline réelle

```
🕐 0:00 - 0:30  Créer projet Firebase
🕐 0:30 - 1:40  Télécharger + copier clé
🕐 1:40 - 2:30  Créer Firestore
🕐 2:30 - 3:30  Publier règles
🕐 3:30 - 4:30  Tester serveur + synchronisation
🕐 4:30 - 5:00  Vérification finale
───────────
📍 5:00 ✅ TERMINÉ!
```

---

## ✨ Résultat attendu

### Firebase Console:
```
✅ Projet "sales-companion" créé
✅ Service Account Key téléchargée
✅ Firestore Database active
✅ Règles publiées
```

### Terminal:
```
✅ Firestore initialized with GOOGLE_APPLICATION_CREDENTIALS
🚀 Sales Companion Server v2.0 (Firestore)
```

### Firestore Collections:
```
✅ admin_users (données synchronisées)
✅ admin_usage_logs (logs de recherche)
✅ admin_stats (statistiques)
✅ admin_config (configuration)
```

---

## 🎓 Si erreur:

### "Firestore not initialized"
- C'est normal au démarrage
- Vérifier que `serviceAccountKey.json` existe
- Firestore is the primary database (PostgreSQL no longer needed)

### "Permission denied"
- Les règles ont besoin de temps pour propager
- Attendre 10 secondes et relancer le serveur

### "File not found"
- Vérifier chemin du fichier JSON
- Path doit être absolu ou relatif correct

---

**Commencez par:** `.\firebase-setup.ps1` (Windows) ou `bash firebase-setup.sh` (Mac/Linux)

**Temps total: 5 minutes ⏱️**
