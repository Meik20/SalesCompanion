#!/usr/bin/env node

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

// ─────────────────────────────────────────────
// FIRESTORE INIT (SAFE)
// ─────────────────────────────────────────────
async function initializeFirestore() {
  const admin = require('firebase-admin');

  console.log("🔥 Initializing Firestore...");

  let credential;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // 🔥 ENV MODE (Railway)
  if (projectId && clientEmail && privateKey) {
    console.log("📦 Using Railway env credentials");

    credential = admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  } else {
    // 🔥 LOCAL MODE fallback
    console.log("📁 Using local serviceAccount file");

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
        break;
      }
    }

    if (!filePath) {
      throw new Error("No Firebase credentials found");
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
    const { email, password } = req.body;

    const snap = await db.collection('admin_users')
      .where('email', '==', email)
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
      { id, email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      admin: { id, email },
      needs_password_change: admin.first_login || false
    });

  } catch (e) {
    console.error(e);
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