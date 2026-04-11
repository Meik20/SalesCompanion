# Firestore Database Setup Guide

## Overview
Sales Companion **2.0+** now uses **Firestore** (Firebase Realtime Database) as its primary data persistence layer.

This transition provides:
- ✅ Scalability: Automatic scaling without infrastructure management
- ✅ Real-time Sync: Live data updates across all clients
- ✅ Security: Built-in authentication & authorization rules
- ✅ Offline Support: Service workers handle offline scenarios
- ✅ Zero Setup: No database server to manage

## Quick Start

### 1. Set Up Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing one
3. Navigate to **Settings → Service Accounts**
4. Click **Generate New Private Key** to download JSON credential file
5. Save the file as `serviceAccountKey.json` in the project root

### 2. Create Firestore Database
1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Start in **Production Mode** (we'll set security rules)
4. Choose your region closest to users

### 3. Configure Environment
Create or update `.env`:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
FIRESTORE_SYNC_ENABLED=true
PORT=3000
JWT_SECRET=your-secret-key
```

### 4. Set Firestore Security Rules
Go to **Firestore → Rules** and paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public collections (read-only)
    match /companies/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == 'admin';
    }
    match /config/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == 'admin';
    }
    
    // User-specific data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /usage_logs/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /admins/{document=**} {
      allow read, write: if request.auth.uid == 'admin';
    }
  }
}
```

### 5. Start Server
```bash
cd server
npm install
npm start
```

The server will automatically:
- Initialize Firestore connection
- Create necessary collections
- Set up default admin account

## Collections Structure

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| **users** | User accounts | id, email, password, plan, daily_used |
| **admins** | Admin accounts | username, password, first_login |
| **companies** | Company database | raison_sociale, secteur, region, niu |
| **usage_logs** | Search history | user_id, query, results_count, created_at |
| **config** | App settings | groq_api_key |
| **import_logs** | Import history | filename, imported, errors, imported_at |

## Troubleshooting

### Firestore Connection Failed
- ✅ Verify `GOOGLE_APPLICATION_CREDENTIALS` path
- ✅ Check service account has Firestore permissions
- ✅ Ensure Firestore database is created in Firebase Console

### Authentication Issues
- ✅ Default admin: `admin/admin123` (change on first login)
- ✅ JWT tokens valid for 30 days (user) / 8 hours (admin)

### Performance Issues
- ✅ Use indexes for queries with multiple filters
- ✅ Firestore will auto-suggest indexes when needed

## Migration from PostgreSQL

If upgrading from v1.x (PostgreSQL):

1. **Export data from PostgreSQL**:
   ```bash
   # Dump all tables
   pg_dump -t users -t companies -t usage_logs > data.sql
   ```

2. **Import into Firestore**:
   ```bash
   # Use admin SDK or UI to bulk import
   # See server/firestore-helpers.js for batch functions
   ```

3. **Verify data**:
   - Check Firestore Console for data
   - Test /auth/login and /api/search endpoints

## Development

### Create Admin User Programmatically
```javascript
const { initFirestore, getFirestore } = require('./firestore-config');
await initFirestore();
const db = getFirestore();
await db.collection('admins').doc('myadmin').set({
  username: 'myad min',
  password: bcrypt.hashSync('password', 10),
  first_login: true
});
```

### Query Collections
```javascript
const snapshot = await db.collection('users').where('plan', '==', 'pro').get();
snapshot.forEach(doc => console.log(doc.data()));
```

## Next Steps
- Review [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- Set up [Firestore Backups](https://cloud.google.com/firestore/docs/backups)
- Monitor [Firestore Usage](https://console.firebase.google.com/project/_/firestore/usage)
