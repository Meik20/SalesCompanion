/**
 * Initialize Firestore Collections
 * Creates all necessary collections with initial documents
 * Run: node create-firestore-collections.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('Error loading service account key:', error.message);
  console.error('Expected path:', serviceAccountPath);
  process.exit(1);
}

const db = admin.firestore();

// Collections to create
const COLLECTIONS = [
  'admin_config',
  'admin_users',
  'admin_companies',
  'admin_import_logs',
  'admin_stats',
  'users',
  'usage_logs',
  'saved_searches',
  'pipeline',
  'companies',
  'user_backups'
];

// Initialize each collection with a template document
const initializationData = {
  admin_config: {
    doc: 'metadata',
    data: {
      app_name: 'Sales Companion',
      version: '2.0',
      created_at: new Date(),
      last_updated: new Date(),
      sync_enabled: true
    }
  },
  admin_users: {
    doc: 'template',
    data: {
      email: '[template - delete this document]',
      password_hash: '[template]',
      role: 'admin',
      first_login: true,
      created_at: new Date()
    }
  },
  admin_companies: {
    doc: 'template',
    data: {
      name: '[template - delete this document]',
      contact: '[template]',
      email: '[template]',
      phone: '[template]',
      created_at: new Date()
    }
  },
  admin_import_logs: {
    doc: 'template',
    data: {
      file_name: '[template - delete this document]',
      records_count: 0,
      import_date: new Date(),
      status: 'completed'
    }
  },
  admin_stats: {
    doc: 'current',
    data: {
      total_users: 0,
      total_companies: 0,
      total_searches: 0,
      active_users_today: 0,
      last_updated: new Date()
    }
  },
  users: {
    doc: 'template',
    data: {
      email: '[template - delete this document]',
      name: '[template]',
      company: '[template]',
      password_hash: '[template]',
      created_at: new Date(),
      last_login: null
    }
  },
  usage_logs: {
    doc: 'template',
    data: {
      user_id: '[template - delete this document]',
      search_query: '[template]',
      results_count: 0,
      timestamp: new Date()
    }
  },
  saved_searches: {
    doc: 'template',
    data: {
      user_id: '[template - delete this document]',
      search_query: '[template]',
      name: '[template]',
      created_at: new Date()
    }
  },
  pipeline: {
    doc: 'template',
    data: {
      user_id: '[template - delete this document]',
      stage: 'prospecting',
      company_id: '[template]',
      last_contact: new Date(),
      next_action: '[template]'
    }
  },
  companies: {
    doc: 'template',
    data: {
      name: '[template - delete this document]',
      industry: '[template]',
      location: '[template]',
      contact_name: '[template]',
      contact_email: '[template]',
      created_at: new Date()
    }
  },
  user_backups: {
    doc: 'template',
    data: {
      user_id: '[template - delete this document]',
      backup_number: 1,
      data: {},
      created_at: new Date()
    }
  }
};

async function verifyFirestoreConnection() {
  console.log('Verifying Firestore connection...\n');
  try {
    // Try to access Firestore
    const testDoc = await db.collection('connectiontest').doc('test').set({
      timestamp: new Date(),
      test: true
    });
    
    // Clean up test document
    await db.collection('connectiontest').doc('test').delete();
    console.log('[OK] Firestore connection successful\n');
    return true;
  } catch (error) {
    console.error('[FAIL] Cannot connect to Firestore');
    console.error('Error:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Firestore database was not created in Firebase Console');
    console.error('2. Security rules not applied correctly');
    console.error('3. Invalid service account credentials\n');
    console.error('Solution: Go to https://console.firebase.google.com');
    console.error('- Ensure Firestore Database is CREATED (not just project)');
    console.error('- Firestore should show collections/documents');
    console.error('- Rules should include permissions for service account\n');
    return false;
  }
}

async function createCollections() {
  console.log('\n' + '='.repeat(60));
  console.log('Initializing Firestore Collections');
  console.log('='.repeat(60) + '\n');

  // First, verify connection
  const isConnected = await verifyFirestoreConnection();
  if (!isConnected) {
    console.error('[FAIL] Cannot proceed without Firestore connection');
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const collectionName of COLLECTIONS) {
    try {
      const collectionRef = db.collection(collectionName);
      const initData = initializationData[collectionName];

      if (initData) {
        const docRef = collectionRef.doc(initData.doc);
        await docRef.set(initData.data);
        console.log(`[OK] ${collectionName}`);
        console.log(`     Created template document: ${initData.doc}`);
      } else {
        // Just verify collection can be accessed
        await collectionRef.limit(1).get();
        console.log(`[OK] ${collectionName} (verified)`);
      }
      successCount++;
    } catch (error) {
      console.error(`[FAIL] ${collectionName}`);
      console.error(`       Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${successCount} collections initialized, ${errorCount} errors`);
  console.log('='.repeat(60) + '\n');

  if (errorCount === 0) {
    console.log('SUCCESS! All Firestore collections are ready.');
    console.log('\nNext steps:');
    console.log('1. Review template documents in Firestore Console');
    console.log('2. Delete __template__ and __metadata__ documents if needed');
    console.log('3. Start the server: npm start');
    console.log('4. Test synchronization by creating users/searches\n');
  } else {
    console.error('Some collections failed to initialize.');
    console.error('Check your Firebase credentials and try again.\n');
    process.exit(1);
  }

  process.exit(0);
}

// Run initialization
createCollections().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
