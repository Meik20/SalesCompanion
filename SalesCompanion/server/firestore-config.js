const admin = require('firebase-admin');

let db = null;

async function initFirestore() {
  if (db) return db;

  try {
    let serviceAccount;
    
    // Try to load from environment variable first (Railway production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('📦 Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT env var...');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } 
    // Fall back to local file (development)
    else {
      console.log('📁 Loading Firebase credentials from local file...');
      serviceAccount = require('./salescompanion-firebase-adminsdk.json');
    }
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    db = admin.firestore();
    console.log('✅ Firestore initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Firestore initialization error:', error.message);
    console.error('   Hint: Set FIREBASE_SERVICE_ACCOUNT env var on Railway or provide salescompanion-firebase-adminsdk.json locally');
    throw error;
  }
}

function getFirestore() {
  return db;
}

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
  isFirestoreReady: () => !!db
};