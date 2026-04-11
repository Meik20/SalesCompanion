#!/usr/bin/env node

console.log("🚀 App starting...");

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

const PORT = process.env.PORT || 3311;
const JWT_SECRET = process.env.JWT_SECRET || 'sc-secret-2025';

let db = null;

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🔥 DB GUARD (IMPORTANT POUR RAILWAY)
app.use((req, res, next) => {
  if (!db && req.path !== '/health') {
    return res.status(503).json({
      error: 'Database not ready'
    });
  }
  next();
});

// 📁 SERVE STATIC FILES (Admin, Client, Mobile)
const path = require('path');
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/client', express.static(path.join(__dirname, '..', 'client')));
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));
app.use(express.static(path.join(__dirname, '..')));

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
      console.log("✅ Firebase initialized");
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
    console.log("📁 Using local serviceAccountKey.json file");
    const path = require('path');
    const fs = require('fs');

    const possiblePaths = [
      path.join(__dirname, '../serviceAccountKey.json'),
      path.join(process.cwd(), 'serviceAccountKey.json')
    ];

    let filePath = null;

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        console.log(`  Found: ${p}`);
        break;
      }
    }

    if (!filePath) {
      throw new Error("❌ No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT or individual FIREBASE_* env variables, or provide serviceAccountKey.json");
    }

    credential = admin.credential.cert(require(filePath));
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential });
  }

  const firestore = admin.firestore();

  console.log("✅ Firestore initialized");

  return firestore;
}

// ─────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: !!db,
    time: new Date().toISOString()
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

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const snap = await db.collection('admin_users')
      .where('email', '==', loginId)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = snap.docs[0].data();
    const id = snap.docs[0].id;

    const ok = await bcrypt.compare(password, admin.password_hash);

    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
    console.error('[POST /admin/login] Error:', e);
    res.status(500).json({ error: 'Server error' });
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
// START SERVER (SAFE)
// ─────────────────────────────────────────────
async function start() {
  console.log("🚀 Starting server...");

  try {
    db = await initializeFirestore();
    
    // Ensure default admin exists
    await ensureAdminExists();
  } catch (e) {
    console.error("❌ Firestore init failed:", e.message);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
================================
🚀 Server running
📍 Port: ${PORT}
🔥 Firestore: ${!!db}
================================
    `);
  });
}

start();