# SalesCompanion Deployment Guide

## GitHub Repository
Repository: https://github.com/Meik20/SalesCompanion

## Database
**🔥 Google Cloud Firestore (EXCLUSIVE)**
- No PostgreSQL, no SQLite
- Serverless, auto-scaling
- Real-time sync capabilities

## Critical Environment Variables for Deployment

### Firestore Credentials (REQUIRED)
```env
# Option A: Path to service account JSON
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json

# Option B: Environment variables (for CI/CD, Railway, Heroku)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
```

### Application Secrets
```env
PORT=3311
JWT_SECRET=your-secure-random-secret-here
NODE_ENV=production
```

## Auto-Push Enabled
- AUTO_PUSH environment variable: true
- Commits automatically push to origin/master
- Setup date: April 11, 2026

## Deployment Steps (Railway, Heroku)

1. **Set Firestore credentials**:
   - Go to Google Cloud Console
   - Create service account key
   - Export as JSON
   - Add env vars to Railway/Heroku

2. **Set app secrets**:
   ```bash
   heroku config:set PORT=3311 JWT_SECRET=xxxxx NODE_ENV=production
   # or via Railway CLI / UI
   ```

3. **Deploy**:
   ```bash
   git push heroku main
   # or via Railway: automatic on push
   ```

## Testing Deployment
```bash
curl https://your-app.herokuapp.com/health
# Should return: { "status": "ok", "database": "Firestore" }
```

## See Also
- [FIRESTORE-EXCLUSIVE-MIGRATION.md](./FIRESTORE-EXCLUSIVE-MIGRATION.md)
- [server/FIRESTORE-SETUP.md](./server/FIRESTORE-SETUP.md)


