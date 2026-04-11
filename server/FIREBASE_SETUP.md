# Firebase / Firestore Configuration for Sales Companion

## Overview

All data is now stored exclusively in **Firestore**. This provides better scalability and real-time capabilities.

## Setup Instructions

### Option 1: Using GOOGLE_APPLICATION_CREDENTIALS (Recommended)

1. **Get Firebase Service Account Key:**
   - Go to https://console.firebase.google.com
   - Select your project
   - Go to **Settings → Service Accounts**
   - Click "Generate New Private Key"
   - Save the JSON file as `serviceAccountKey.json`

2. **On Railway (Easiest):**
   - Upload the `serviceAccountKey.json` file to Railway's "Variables" → "File" section
   - Set the path as: `/app/server/serviceAccountKey.json`
   - The `setup-firebase.js` script will automatically find it

3. **Locally (for development):**
   ```bash
   cp /path/to/serviceAccountKey.json ./server/serviceAccountKey.json
   npm start
   ```

### Option 2: Using Environment Variables

1. **Get credentials from Firebase Console:**
   - Download the service account JSON file
   - Each value becomes an environment variable on Railway:

2. **Set on Railway:**
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=your-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-email@appspot.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   ```

   **Important:** Escape newlines as `\n` in the PRIVATE_KEY

3. **The setup script** will automatically create `serviceAccountKey.json` from these variables

## Firestore Collections

Admin data is stored in these collections:

| Collection | Purpose |
|-----------|---------|
| `admin_config` | Settings (Groq API key, etc.) |
| `admin_users` | User management data |
| `admin_companies` | Company data from imports |
| `admin_import_logs` | Import history |
| `admin_stats` | Dashboard statistics |

## How It Works

1. On server startup, `setup-firebase.js` runs:
   - Checks if `serviceAccountKey.json` exists
   - If not, creates it from environment variables
   - Sets `GOOGLE_APPLICATION_CREDENTIALS` to point to it

2. `firestore-config.js` initializes Firebase Admin SDK using the credentials

3. API endpoints use exclusively Firestore

## Testing

```bash
# Test locally with serviceAccountKey.json
npm start

# Test with environment variables
export FIREBASE_PROJECT_ID=your-id
export FIREBASE_PRIVATE_KEY="your-key"
# ... (set other vars)
npm start
```

## Security Notes

⚠️ **Never commit `serviceAccountKey.json` to git!** It's already in `.gitignore`

- Use Railway's secrets management
- Keep private keys secure
- Rotate service account keys periodically

## Troubleshooting

### "Firestore not initialized"
- Check environment variables are set correctly
- Verify `serviceAccountKey.json` exists and is readable
- Check Railway logs for initialization errors

### "Authentication error"
- Verify service account has Firestore permissions
- Check Firebase project settings
- Ensure credentials haven't expired

### "File not found"
- Verify file path is correct on Railway
- Check file permissions (should be readable by Node.js)

## Upgrading from PostgreSQL (v1.x)

All data is automatically stored in Firestore. To migrate from v1.x PostgreSQL:

1. Setting up Firestore credentials
2. Data will be stored exclusively in Firestore
3. Enjoy the benefits of real-time synchronization

The system will work with either, both, or fallback gracefully if one fails.
