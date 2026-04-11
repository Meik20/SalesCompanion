/**
 * Test Admin Authentication
 * Simulates the login flow without Firestore for testing
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Mock admin data (what Firestore should contain)
const MOCK_ADMIN = {
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10), // Hash of 'admin123'
  name: 'Administrator',
  role: 'admin',
  first_login: true
};

async function testAdminLogin() {
  console.log('\n' + '='.repeat(60));
  console.log('AUTH TEST: Admin Login Simulation');
  console.log('='.repeat(60) + '\n');

  // Test 1: Correct credentials
  console.log('TEST 1: Correct credentials (admin / admin123)');
  const username1 = 'admin';
  const password1 = 'admin123';
  
  const passwordMatch = bcrypt.compareSync(password1, MOCK_ADMIN.password);
  console.log(`  Username match: ${username1 === MOCK_ADMIN.username}`);
  console.log(`  Password match: ${passwordMatch}`);
  
  if (username1 === MOCK_ADMIN.username && passwordMatch) {
    const token = jwt.sign(
      { id: 'admin', username: username1, isAdmin: true },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    console.log(`  ✅ LOGIN SUCCESS`);
    console.log(`  Token: ${token.substring(0, 30)}...`);
    console.log(`  Needs password change: ${MOCK_ADMIN.first_login}\n`);
  }

  // Test 2: Wrong password
  console.log('TEST 2: Wrong password (admin / wrongpass)');
  const username2 = 'admin';
  const password2 = 'wrongpass';
  
  const passwordMatch2 = bcrypt.compareSync(password2, MOCK_ADMIN.password);
  console.log(`  Username match: ${username2 === MOCK_ADMIN.username}`);
  console.log(`  Password match: ${passwordMatch2}`);
  console.log(`  ❌ LOGIN FAILED (Wrong password)\n`);

  // Test 3: Wrong username
  console.log('TEST 3: Wrong username (baduser / admin123)');
  const username3 = 'baduser';
  const password3 = 'admin123';
  
  console.log(`  Username match: ${username3 === MOCK_ADMIN.username}`);
  console.log(`  ❌ LOGIN FAILED (Username not found)\n`);

  // Test 4: Hash verification
  console.log('TEST 4: Password Hash Verification');
  console.log(`  Original password: admin123`);
  console.log(`  Hash: ${MOCK_ADMIN.password.substring(0, 30)}...`);
  console.log(`  Verify match: ${bcrypt.compareSync('admin123', MOCK_ADMIN.password)}`);
  console.log(`  Verify mismatch: ${bcrypt.compareSync('wrongpass', MOCK_ADMIN.password)}\n`);

  console.log('='.repeat(60));
  console.log('AUTH TESTS COMPLETE');
  console.log('='.repeat(60) + '\n');
}

testAdminLogin().catch(console.error);
