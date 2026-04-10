/**
 * Initialize Default Admin in Firestore
 * Run: node init-firestore-admin.js
 */

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
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
  process.exit(1);
}

const db = admin.firestore();

async function initializeAdmin() {
  console.log('\n' + '='.repeat(60));
  console.log('Initialize Default Admin in Firestore');
  console.log('='.repeat(60) + '\n');

  try {
    // Check if admin already exists
    const existing = await db.collection('admin_users')
      .where('email', '==', 'admin')
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log('[OK] Admin already exists');
      console.log('     Email: admin');
      console.log('     Password: admin123');
    } else {
      // Create default admin
      const passwordHash = await bcrypt.hash('admin123', 10);

      const adminData = {
        email: 'admin',
        password_hash: passwordHash,
        name: 'Administrator',
        role: 'admin',
        first_login: true,
        created_at: new Date(),
        last_login: null
      };

      const docRef = await db.collection('admin_users').add(adminData);

      console.log('[OK] Admin created successfully');
      console.log('     ID: ' + docRef.id);
      console.log('     Email: admin');
      console.log('     Password: admin123');
      console.log('     First Login: true (will be prompted to change password)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Ready to start server!');
    console.log('='.repeat(60) + '\n');
    console.log('Start command: npm run start:firestore');
    console.log('Login: admin / admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

initializeAdmin();
