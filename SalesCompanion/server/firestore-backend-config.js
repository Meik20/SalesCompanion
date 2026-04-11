/**
 * Firebase Backend Configuration - FIRESTORE ADMIN SDK
 * 
 * ⚠️ IMPORTANT:
 * 1. Créez un projet Firebase sur https://console.firebase.google.com
 * 2. Activez Firestore Database (non Realtime Database)
 * 3. Activez Authentication → Email/Password
 * 4. Créez une clé de compte de service: Settings ⚙️ → Service Accounts
 * 5. Téléchargez le JSON et mettez le chemin dans GOOGLE_APPLICATION_CREDENTIALS
 * 
 * SECURITY RULES - Appliquez cette règle de sécurité dans Firestore Console:
 */

const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin data - Protected
    match /admin_config/{document=**} {
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /admin_users/{userId} {
      allow read, write: if request.auth.uid == userId || get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /admin_companies/{document=**} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /admin_import_logs/{document=**} {
      allow read, write: if get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /admin_stats/{document=**} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // User data - Protected
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if get(/databases/$(database)/documents/admin_users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /usage_logs/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Public companies data
    match /companies/{companyId} {
      allow read: if request.auth != null;
    }
    
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

/**
 * CONFIGURATION POUR LE DÉPLOIEMENT
 * 
 * Sur Railway.app ou autre:
 * 1. Créez un secret pour le JSON de credentials
 * 2. Sauvegardez le contenu du JSON dans une variable d'env: FIREBASE_CREDENTIALS
 * 3. Ou utilisez GOOGLE_APPLICATION_CREDENTIALS pointant au fichier
 * 
 * Sur localhost:
 * 1. Téléchargez le JSON depuis Firebase Console
 * 2. Sauvegardez dans: ./serviceAccountKey.json
 * 3. Définissez: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 */

const serviceAccountKeyExample = {
  type: 'service_account',
  project_id: 'sales-companion-9cf56',
  private_key_id: 'your_private_key_id',
  private_key: 'your_private_key_with_newlines',
  client_email: 'firebase-adminsdk-xxxxx@sales-companion-9cf56.iam.gserviceaccount.com',
  client_id: 'your_client_id',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/...'
};

module.exports = {
  FIRESTORE_RULES,
  serviceAccountKeyExample,
  
  // Firestore collections organization
  COLLECTIONS: {
    // Admin data
    ADMIN_CONFIG: 'admin_config',
    ADMIN_USERS: 'admin_users',
    ADMIN_COMPANIES: 'admin_companies',
    ADMIN_IMPORT_LOGS: 'admin_import_logs',
    ADMIN_STATS: 'admin_stats',
    
    // User data
    USERS: 'users',
    USAGE_LOGS: 'usage_logs',
    SAVED_SEARCHES: 'saved_searches',
    PIPELINE: 'pipeline',
    
    // Read-only references
    COMPANIES: 'companies',
  },
  
  // Sync strategy configuration
  SYNC_CONFIG: {
    // Firestore is the primary persistence layer
    ENABLED: process.env.FIRESTORE_SYNC_ENABLED !== 'false',
    
    // Which tables to sync
    SYNC_TABLES: [
      'users',
      'admins',
      'usage_logs',
      'saved_searches',
      'pipeline',
      'import_logs'
    ],
    
    // Retry configuration
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    
    // Batch size for sync operations
    BATCH_SIZE: 100,
  }
};
