// ── FIRESTORE CONFIGURATION FOR ADMIN DATA ──
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var)
let db = null;
let initialized = false;

async function initFirestore() {
  try {
    // Check if GOOGLE_APPLICATION_CREDENTIALS is already set
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      console.log('[Firestore] Using credentials from:', credPath);
      
      try {
        // Load the service account key file
        const serviceAccount = require(credPath);
        
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
          });
        }
        
        db = admin.firestore();
        initialized = true;
        console.log('✅ Firestore initialized with GOOGLE_APPLICATION_CREDENTIALS');
        return db;
      } catch (fileError) {
        console.warn('[Firestore] Could not load credential file:', fileError.message);
        // Continue to fallback
      }
    }
    
    // Fallback: Check if credentials are provided via environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      };

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }

      db = admin.firestore();
      initialized = true;
      console.log('✅ Firestore initialized from environment variables');
      return db;
    } else {
      console.log('⚠️  Firestore credentials not found - admin data will use fallback');
      return null;
    }
  } catch (error) {
    console.error('❌ Firestore initialization failed:', error.message);
    return null;
  }
}

// Get Firestore instance
function getFirestore() {
  return db;
}

// Admin data collections
const ADMIN_COLLECTIONS = {
  CONFIG: 'admin_config',
  USERS: 'admin_users',
  COMPANIES: 'admin_companies',
  IMPORT_LOGS: 'admin_import_logs',
  STATS: 'admin_stats'
};

module.exports = {
  initFirestore,
  getFirestore,
  ADMIN_COLLECTIONS,
  isFirestoreReady: () => initialized
};
