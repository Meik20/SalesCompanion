#!/usr/bin/env node
// ── MOCK SERVER for Admin Panel Login Testing ──

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sc-secret-2025';

// Mock admin user
const MOCK_ADMIN = {
  id: 1,
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10) // Pre-hashed password
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));
app.get('/mobile', (req, res) => res.sendFile(path.join(__dirname, '..', 'mobile', 'index.html')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'index.html')));

// ── AUTH ENDPOINTS ──

// Admin Login
app.post('/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('[POST /admin/login] Attempting login for:', username);
    
    if (username !== MOCK_ADMIN.username) {
      console.log('[POST /admin/login] Admin not found');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const passwordMatch = bcrypt.compareSync(password, MOCK_ADMIN.password);
    console.log('[POST /admin/login] Password match:', passwordMatch);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const token = jwt.sign(
      { id: MOCK_ADMIN.id, username: MOCK_ADMIN.username, isAdmin: true },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    console.log('[POST /admin/login] ✅ Login successful');
    res.json({ token });
  } catch (e) {
    console.error('[POST /admin/login] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// User Login (Mock)
app.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[POST /auth/login] Login attempt for:', email);
    
    // Mock: all passwords "password" work for demo
    if (!email || !password) {
      return res.status(401).json({ error: 'Missing credentials' });
    }
    
    const token = jwt.sign({ email, isUser: true }, JWT_SECRET, { expiresIn: '24h' });
    console.log('[POST /auth/login] ✅ Mock login successful');
    res.json({ token });
  } catch (e) {
    console.error('[POST /auth/login] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// User Register (Mock)
app.post('/auth/register', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[POST /auth/register] Register attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    
    const token = jwt.sign({ email, isUser: true }, JWT_SECRET, { expiresIn: '24h' });
    console.log('[POST /auth/register] ✅ Mock registration successful');
    res.json({ token });
  } catch (e) {
    console.error('[POST /auth/register] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock server running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sales Companion Server (Mock Mode)',
    endpoints: {
      admin: 'http://localhost:' + PORT + '/admin',
      mobile: 'http://localhost:' + PORT + '/mobile',
      health: 'http://localhost:' + PORT + '/health',
      'POST /admin/login': 'Admin authentication',
      'POST /auth/login': 'User login',
      'POST /auth/register': 'User registration'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
✅ Sales Companion Mock Server Started
🔗 Admin Panel: http://localhost:${PORT}/admin
🔗 Mobile App: http://localhost:${PORT}/mobile
⚙️  Port: ${PORT}
🔐 JWT_SECRET: ${JWT_SECRET}
📝 Default Admin: admin / admin123

Ready to accept requests! 🚀
  `);
});
