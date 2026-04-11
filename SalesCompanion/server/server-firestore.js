#!/usr/bin/env node

console.log("🚀 App starting...");

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sc-secret-2025';

let db = null;
let dbInitError = null;

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 📁 SERVE STATIC FILES FIRST (Before DB guard)
const adminPath = path.join(__dirname, '..', 'admin');
const clientPath = path.join(__dirname, '..', 'client');
const mobilePath = path.join(__dirname, '..', 'mobile');

console.log(`📁 Checking static paths...`);
console.log(`   Admin: ${fs.existsSync(adminPath) ? '✅' : '❌'} ${adminPath}`);
console.log(`   Client: ${fs.existsSync(clientPath) ? '✅' : '❌'} ${clientPath}`);
console.log(`   Mobile: ${fs.existsSync(mobilePath) ? '✅' : '❌'} ${mobilePath}`);

app.use('/admin', express.static(adminPath));
app.use('/client', express.static(clientPath));
app.use('/mobile', express.static(mobilePath));
app.use(express.static(path.join(__dirname, '..')));

// 🔥 DB GUARD - ONLY FOR API ENDPOINTS (After static files)
app.use((req, res, next) => {
  // Allow health check and static file requests
  if (req.path === '/health' || req.path.match(/\.(html|css|js|json|png|jpg|svg|ico|webp|woff2?)$/)) {
    return next();
  }
  
  // Block API requests if DB not ready
  if (!db && (req.path.startsWith('/api') || req.path.startsWith('/admin/login') || req.path.startsWith('/admin/register'))) {
    return res.status(503).json({
      error: 'Database not ready',
      status: 'initializing'
    });
  }
  next();
});

// ─────────────────────────────────────────────
// ENSURE DEFAULT ADMIN EXISTS
// ─────────────────────────────────────────────
async function ensureAdminExists() {
  if (!db) return;
  
  try {
    const adminSnap = await db.collection('admin_users')
      .where('email', '==', 'admin')
      .limit(1)
      .get();
    
    if (!adminSnap.empty) {
      console.log('✅ Default admin already exists');
      // Ensure role field is set
      const admin = adminSnap.docs[0];
      if (!admin.data().role) {
        console.log('📝 Updating admin with role field');
        await db.collection('admin_users').doc(admin.id).update({
          role: 'admin'
        });
      }
      return;
    }
    
    // Create default admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.collection('admin_users').add({
      email: 'admin',
      password_hash: hashedPassword,
      role: 'admin',
      first_login: false,
      created_at: new Date().toISOString()
    });
    
    console.log('✅ Default admin created (admin/admin123)');
  } catch (error) {
    console.error('❌ Error ensuring admin exists:', error.message);
  }
}

// ─────────────────────────────────────────────
// FIRESTORE INIT (SAFE)
// ─────────────────────────────────────────────
async function initializeFirestore() {
  const admin = require('firebase-admin');

  console.log("🔥 Initializing Firestore...");

  let credential;

  // Priority 1: FIREBASE_SERVICE_ACCOUNT environment variable (full JSON object)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("📦 Using FIREBASE_SERVICE_ACCOUNT env variable (Railway)");
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      // Handle \n escaping in private key
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      credential = admin.credential.cert(serviceAccount);
      console.log("✅ Firebase credentials loaded from env var");
    } catch (e) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", e.message);
      throw e;
    }
  }
  // Priority 2: Individual environment variables
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log("📦 Using individual Firebase env credentials");
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }
  // Priority 3: Local file fallback
  else {
    console.log("📁 Looking for local serviceAccountKey.json file...");
    const possiblePaths = [
      path.join(__dirname, 'salescompanion-firebase-adminsdk.json'),
      path.join(__dirname, 'serviceAccountKey.json'),
      path.join(process.cwd(), 'SalesCompanion/server/salescompanion-firebase-adminsdk.json')
    ];

    let filePath = null;

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        console.log(`   ✅ Found: ${p}`);
        break;
      }
    }

    if (!filePath) {
      throw new Error("❌ No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT env var or provide salescompanion-firebase-adminsdk.json");
    }

    try {
      credential = admin.credential.cert(require(filePath));
    } catch (err) {
      throw new Error(`❌ Failed to load Firebase credentials from ${filePath}: ${err.message}`);
    }
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential });
  }

  const firestore = admin.firestore();

  console.log("✅ Firestore initialized successfully");

  return firestore;
}

// ─────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: !!db,
    dbError: dbInitError,
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// AUTH LOGIN (with auto-tracking)
// ─────────────────────────────────────────────
app.post('/admin/login', async (req, res) => {
  try {
    // Support both 'email' and 'username' fields from frontend
    const { email, username, password } = req.body;
    const loginId = email || username;

    console.log('[POST /admin/login] Login attempt for:', loginId);

    if (!loginId || !password) {
      console.log('[POST /admin/login] Missing fields');
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!db) {
      console.log('[POST /admin/login] Database not initialized');
      return res.status(503).json({ error: 'Database not ready', details: dbInitError });
    }

    const snap = await db.collection('admin_users')
      .where('email', '==', loginId)
      .limit(1)
      .get();

    console.log('[POST /admin/login] Query result:', snap.empty ? 'Not found' : 'Found');

    if (snap.empty) {
      console.log('[POST /admin/login] Admin not found:', loginId);
      // Log failed attempt
      await logActivity('admin_login_failed', 'unknown', { email: loginId, reason: 'not_found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = snap.docs[0].data();
    const id = snap.docs[0].id;

    console.log('[POST /admin/login] Verifying password...');

    const ok = await bcrypt.compare(password, admin.password_hash);

    if (!ok) {
      console.log('[POST /admin/login] Invalid password');
      // Log failed attempt
      await logActivity('admin_login_failed', 'unknown', { email: loginId, reason: 'wrong_password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[POST /admin/login] Authentication successful');

    // Update last login
    await db.collection('admin_users').doc(id).update({
      last_login: new Date().toISOString()
    });

    const token = jwt.sign(
      { id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log successful login
    await logActivity('admin_login_success', id, { email: admin.email });

    res.json({
      token,
      admin: { 
        id, 
        email: admin.email,
        role: admin.role || 'admin',
        name: admin.name || admin.email.split('@')[0]
      },
      needs_password_change: admin.first_login || false
    });

  } catch (e) {
    console.error('[POST /admin/login] Error:', e.message);
    console.error(e.stack);
    await logActivity('admin_login_error', 'unknown', { error: e.message });
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
app.post('/admin/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existing = await db.collection('admin_users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'Email exists' });
    }

    const hash = await bcrypt.hash(password, 10);

    const ref = await db.collection('admin_users').add({
      email,
      password_hash: hash,
      name: name || email,
      first_login: true,
      created_at: new Date()
    });

    res.json({
      id: ref.id,
      message: 'Created'
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// VERIFY TOKEN
// ─────────────────────────────────────────────
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─────────────────────────────────────────────
// AUTO-LOG HELPER
// ─────────────────────────────────────────────
async function logActivity(type, userId, details = {}) {
  if (!db) return;
  try {
    await db.collection('activity_logs').add({
      type,
      user_id: userId || 'anonymous',
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || 'unknown'
    });
  } catch (err) {
    console.error('❌ Failed to log activity:', err.message);
  }
}

// ─────────────────────────────────────────────
// CREATE USER (Auto-register)
// ─────────────────────────────────────────────
app.post('/api/users/create', async (req, res) => {
  try {
    const { email, name, password, company, plan = 'free' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!db) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    // Check if user exists
    const existingSnap = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const userRef = await db.collection('users').add({
      email,
      name: name || email.split('@')[0],
      company: company || 'N/A',
      password_hash: hashedPassword,
      plan,
      status: 'active',
      created_at: new Date().toISOString(),
      last_login: null,
      search_count: 0
    });

    const userId = userRef.id;

    console.log(`[POST /api/users/create] User created: ${email} (${userId})`);

    // Auto-log activity
    await logActivity('user_created', userId, { email, name, company, plan });

    // Generate welcome token
    const token = jwt.sign(
      { id: userId, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      id: userId,
      email,
      name,
      token,
      message: 'User created successfully'
    });

  } catch (e) {
    console.error('[POST /api/users/create] Error:', e.message);
    await logActivity('user_create_error', 'unknown', { error: e.message });
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// CREATE COMPANY (Auto-register)
// ─────────────────────────────────────────────
app.post('/api/companies/create', verifyToken, async (req, res) => {
  try {
    const { name, industry, location, contact_name, contact_email, phone, website } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Company name required' });
    }

    if (!db) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    // Create new company
    const companyRef = await db.collection('companies').add({
      name,
      industry: industry || 'Unknown',
      location: location || 'N/A',
      contact_name: contact_name || 'N/A',
      contact_email: contact_email || 'N/A',
      phone: phone || 'N/A',
      website: website || 'N/A',
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    });

    const companyId = companyRef.id;

    console.log(`[POST /api/companies/create] Company created: ${name} (${companyId})`);

    // Auto-log activity
    await logActivity('company_created', req.user.id, { company_id: companyId, name, industry, location });

    res.json({
      id: companyId,
      name,
      industry,
      location,
      message: 'Company created successfully'
    });

  } catch (e) {
    console.error('[POST /api/companies/create] Error:', e.message);
    await logActivity('company_create_error', req.user.id, { error: e.message });
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// SEARCH + AUTO-LOG
// ─────────────────────────────────────────────
app.post('/api/search', verifyToken, async (req, res) => {
  try {
    const { query, filters = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    if (!db) {
      return res.status(503).json({ error: 'Database not ready' });
    }

    // Log the search
    const logRef = await db.collection('search_logs').add({
      user_id: req.user.id,
      query,
      filters,
      timestamp: new Date().toISOString(),
      results_count: 0
    });

    console.log(`[POST /api/search] Search logged: "${query}" by ${req.user.email}`);

    // Auto-log activity
    await logActivity('search_performed', req.user.id, { query, filters });

    // Return mock results for now
    res.json({
      log_id: logRef.id,
      query,
      results: [],
      message: 'Search logged successfully'
    });

  } catch (e) {
    console.error('[POST /api/search] Error:', e.message);
    await logActivity('search_error', req.user.id, { error: e.message });
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// GET ACTIVITY LOGS (Admin only)
// ─────────────────────────────────────────────
app.get('/api/activity-logs', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const logsSnap = await db.collection('activity_logs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const logs = logsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ count: logs.length, logs });

  } catch (e) {
    console.error('[GET /api/activity-logs] Error:', e.message);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// GET USER PROFILE
// ─────────────────────────────────────────────
app.get('/api/users/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own profile, admins can view any
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    delete userData.password_hash; // Never send password

    res.json({ id: userId, ...userData });

  } catch (e) {
    console.error('[GET /api/users/:userId] Error:', e.message);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// UPDATE USER PROFILE
// ─────────────────────────────────────────────
app.put('/api/users/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, company, phone, website } = req.body;

    // Users can only update their own profile, admins can update any
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (company) updateData.company = company;
    if (phone) updateData.phone = phone;
    if (website) updateData.website = website;
    updateData.updated_at = new Date().toISOString();

    await db.collection('users').doc(userId).update(updateData);

    console.log(`[PUT /api/users/:userId] User updated: ${userId}`);

    // Auto-log activity
    await logActivity('user_updated', req.user.id, { updated_user: userId, fields: Object.keys(updateData) });

    res.json({ id: userId, ...updateData, message: 'Profile updated' });

  } catch (e) {
    console.error('[PUT /api/users/:userId] Error:', e.message);
    await logActivity('user_update_error', req.user.id, { error: e.message });
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

// ─────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─────────────────────────────────────────────
// START SERVER (SAFE)
// ─────────────────────────────────────────────
async function start() {
  console.log("🚀 Starting server...");

  try {
    db = await initializeFirestore();
    console.log('✅ Firestore initialized');
    
    // Ensure default admin exists
    await ensureAdminExists();
    console.log('✅ Admin verification complete');
  } catch (e) {
    dbInitError = e.message;
    console.error("WARNING: Initialization failed:", e.message);
    console.error("   Server will start anyway but API endpoints won't work until configured");
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    const adminStatus = db ? 'READY' : 'NOT INITIALIZED';
    const msg = `
╔════════════════════════════════════╗
║   SALES COMPANION v2.0 - SERVER    ║
╠════════════════════════════════════╣
║ Server running on 0.0.0.0          ║
║ Port: ${PORT}                           ║
║ Firestore: ${adminStatus}${' '.repeat(25 - adminStatus.length)}║
║ Admin: http://localhost:${PORT}/admin${' '.repeat(22 - PORT.toString().length)}║
║ Health: http://localhost:${PORT}/health${' '.repeat(20 - PORT.toString().length)}║
╠════════════════════════════════════╣
║ DEFAULT LOGIN: admin / admin123    ║
╚════════════════════════════════════╝
    `;
    console.log(msg);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

start();
