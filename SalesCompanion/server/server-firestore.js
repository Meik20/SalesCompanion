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
// AUTH LOGIN
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = snap.docs[0].data();
    const id = snap.docs[0].id;

    console.log('[POST /admin/login] Verifying password...');

    const ok = await bcrypt.compare(password, admin.password_hash);

    if (!ok) {
      console.log('[POST /admin/login] Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[POST /admin/login] Authentication successful');

    const token = jwt.sign(
      { id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      admin: { id, email: admin.email },
      needs_password_change: admin.first_login || false
    });

  } catch (e) {
    console.error('[POST /admin/login] Error:', e.message);
    console.error(e.stack);
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
// SEARCH LOG
// ─────────────────────────────────────────────
app.post('/api/search', verifyToken, async (req, res) => {
  try {
    const { query } = req.body;

    await db.collection('usage_logs').add({
      user_id: req.user.id,
      query,
      created_at: new Date()
    });

    res.json({ results: [], query });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
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
