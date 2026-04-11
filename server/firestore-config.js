const admin = require('firebase-admin');

let db = null;

async function initFirestore() {
  if (db) return db;

  try {
    // Charger directement le fichier credentials
    const serviceAccount = require('./salescompanion-firebase-adminsdk.json');
    
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