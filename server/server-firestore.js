#!/usr/bin/env node
/**
 * Sales Companion Server - Firestore Edition
 * Development mode with Firestore as primary database
 * PostgreSQL connection is optional
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const firebaseHelpers = require('./firestore-helpers');

const app = express();
const PORT = process.env.PORT || 3311;
const JWT_SECRET = process.env.JWT_SECRET || 'sc-secret-2025';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// ────────────────────────────────────────────────────────────
// FIRESTORE SETUP
// ────────────────────────────────────────────────────────────

async function initializeFirestore() {
  try {
    const admin = require('firebase-admin');
    const path = require('path');
    const fs = require('fs');
    
    // Load service account key from multiple possible locations
    let serviceAccountPath;
    const possiblePaths = [
      // Check GOOGLE_APPLICATION_CREDENTIALS env var first
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      // Local development (running from server/)
      path.join(__dirname, '..', 'serviceAccountKey.json'),
      // Docker container (running from /app/server)
      path.join(__dirname, '..', 'serviceAccountKey.json'),
      // Alternative Docker path (/app)
      path.join(__dirname, '../../serviceAccountKey.json'),
      // Current directory
      path.join(process.cwd(), 'serviceAccountKey.json')
    ].filter(Boolean); // Remove undefined/null values
    
    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        serviceAccountPath = tryPath;
        console.log(`✅ Found service account at: ${tryPath}`);
        break;
      }
    }
    
    if (!serviceAccountPath) {
      throw new Error(`Cannot find serviceAccountKey.json. Tried paths:\n${possiblePaths.join('\n')}`);
    }
    
    const serviceAccount = require(serviceAccountPath);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    
    const db = admin.firestore();
    console.log('✅ Firestore initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Firestore initialization failed:', error.message);
    throw error;
  }
}

let db = null;

// ────────────────────────────────────────────────────────────
// HEALTH CHECK
// ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Sales Companion Server v2.0',
    database: 'Firestore',
    timestamp: new Date().toISOString()
  });
});

// ────────────────────────────────────────────────────────────
// ADMIN LOGIN (FIRESTORE)
// ────────────────────────────────────────────────────────────

app.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get admin from Firestore
    const adminSnapshot = await db.collection('admin_users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (adminSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = adminSnapshot.docs[0].data();
    admin.id = adminSnapshot.docs[0].id;

    // Check password
    const passwordValid = await bcrypt.compare(password, admin.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role || 'admin'
      },
      needs_password_change: admin.first_login || false
    });
  } catch (error) {
    console.error('[POST /admin/login] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// ADMIN REGISTER (FIRESTORE)
// ────────────────────────────────────────────────────────────

app.post('/admin/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if email exists
    const existing = await db.collection('admin_users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const adminData = {
      email,
      password_hash: passwordHash,
      name: name || email,
      role: 'admin',
      first_login: true,
      created_at: new Date(),
      last_login: null
    };

    // Save to Firestore
    const docRef = await db.collection('admin_users').add(adminData);

    // Generate token
    const token = jwt.sign(
      { id: docRef.id, email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      token,
      admin: {
        id: docRef.id,
        email,
        name
      },
      message: 'Admin registered successfully'
    });
  } catch (error) {
    console.error('[POST /admin/register] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// ADMIN CHANGE PASSWORD
// ────────────────────────────────────────────────────────────

app.post('/admin/change-password', async (req, res) => {
  try {
    const { admin_id, old_password, new_password } = req.body;

    if (!admin_id || !old_password || !new_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get admin
    const adminRef = db.collection('admin_users').doc(admin_id);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = adminDoc.data();

    // Verify old password
    const passwordValid = await bcrypt.compare(old_password, admin.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(new_password, 10);

    // Update in Firestore
    await adminRef.update({
      password_hash: newHash,
      first_login: false,
      last_password_change: new Date()
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[POST /admin/change-password] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// MIDDLEWARE: VERIFY TOKEN
// ────────────────────────────────────────────────────────────

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ────────────────────────────────────────────────────────────
// ADMIN STATS (Firestore)
// ────────────────────────────────────────────────────────────

app.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    // Get from Firestore
    const statsSnapshot = await db.collection('admin_stats').doc('current').get();

    if (!statsSnapshot.exists) {
      return res.json({
        total_users: 0,
        total_companies: 0,
        total_searches: 0,
        active_users_today: 0
      });
    }

    res.json(statsSnapshot.data());
  } catch (error) {
    console.error('[GET /admin/stats] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// API SEARCH (Firestore)
// ────────────────────────────────────────────────────────────

app.post('/api/search', verifyToken, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    // Log search to Firestore
    const logEntry = {
      user_id: req.user.id,
      search_query: query,
      results_count: 0,
      timestamp: new Date()
    };

    await db.collection('usage_logs').add(logEntry);

    // Return mock results
    res.json({
      query,
      results: [],
      count: 0
    });
  } catch (error) {
    console.error('[POST /api/search] Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────────────────────

async function start() {
  try {
    // Initialize Firestore
    db = await initializeFirestore();
    
    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Sales Companion Server v2.0 (Firestore)`);
      console.log(`📍 Running on http://localhost:${PORT}`);
      console.log(`🔥 Database: Firestore`);
      console.log(`✅ Ready to accept requests`);
      console.log(`${'='.repeat(60)}\n`);
      console.log('Test endpoints:');
      console.log(`  POST http://localhost:${PORT}/admin/login`);
      console.log(`    Body: { "email": "admin", "password": "admin123" }\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
