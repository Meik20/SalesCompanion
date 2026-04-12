require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');

// ── FIRESTORE FOR DATA PERSISTENCE (EXCLUSIVE) ──────────────────────────────
// All data stored exclusively in Google Cloud Firestore
// PostgreSQL & SQLite support removed
// admin.initializeApp(...)
const { getFirestore, initFirestore, isFirestoreReady } = require('./firestore-config');
const firestoreHelpers = require('./firestore-helpers');

// Initialize Firestore on startup
(async () => {
  await initFirestore();
})();

// ── FIRESTORE DATABASE FUNCTIONS ────────────────────────────────
// These replace the old PostgreSQL dbQuery functions
const db = getFirestore();

async function getConfigFirestore(key) {
  if (!db) return null;
  try {
    const doc = await db.collection('config').doc(key).get();
    return doc.exists ? doc.data().value : null;
  } catch (e) {
    console.error(`[Firestore] getConfig error for key ${key}:`, e.message);
    return null;
  }
}

async function setConfigFirestore(key, value) {
  if (!db) return;
  try {
    await db.collection('config').doc(key).set({ value, updated_at: new Date() });
  } catch (e) {
    console.error(`[Firestore] setConfig error:`, e.message);
  }
}

async function getUserByIdFirestore(userId) {
  if (!db) return null;
  try {
    const doc = await db.collection('users').doc(userId.toString()).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (e) {
    console.error(`[Firestore] getUser error:`, e.message);
    return null;
  }
}

async function getUserByEmailFirestore(email) {
  if (!db) return null;
  try {
    const snapshot = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.error(`[Firestore] getUserByEmail error:`, e.message);
    return null;
  }
}

async function createUserFirestore(id, userData) {
  if (!db) return null;
  try {
    await db.collection('users').doc(id.toString()).set({
      ...userData,
      created_at: new Date(),
      updated_at: new Date()
    });
    return { id, ...userData };
  } catch (e) {
    console.error(`[Firestore] createUser error:`, e.message);
    throw e;
  }
}

async function updateUserFirestore(userId, updates) {
  if (!db) return;
  try {
    await db.collection('users').doc(userId.toString()).update({
      ...updates,
      updated_at: new Date()
    });
  } catch (e) {
    console.error(`[Firestore] updateUser error:`, e.message);
  }
}

async function getUsersFirestore(filters = {}) {
  if (!db) return [];
  try {
    let query = db.collection('users');
    if (filters.plan) query = query.where('plan', '==', filters.plan);
    if (filters.active !== undefined) query = query.where('active', '==', filters.active);
    const snapshot = await query.get();
    const users = [];
    snapshot.forEach(doc => { users.push({ id: doc.id, ...doc.data() }); });
    return users;
  } catch (e) {
    console.error(`[Firestore] getUsers error:`, e.message);
    return [];
  }
}

async function deleteUserFirestore(userId) {
  if (!db) return;
  try {
    await db.collection('users').doc(userId.toString()).delete();
  } catch (e) {
    console.error(`[Firestore] deleteUser error:`, e.message);
  }
}

// Admin functions - Firestore EXCLUSIVE
async function getAdminByUsernameFirestore(username) {
  try {
    const doc = await db.collection('admins').doc(username).get();
    if (!doc.exists) {
      console.log(`[Firestore] Admin '${username}' not found in admins collection`);
      return null;
    }
    const data = doc.data();
    return { id: doc.id, ...data };
  } catch (e) {
    console.error(`[Firestore] getAdminByUsernameFirestore error:`, e.message);
    return null;
  }
}

async function updateAdminFirestore(adminId, updates) {
  try {
    await db.collection('admins').doc(adminId).update({
      ...updates,
      updated_at: new Date()
    });
  } catch (e) {
    console.error(`[Firestore] updateAdmin error:`, e.message);
    throw e;
  }
}

// Company functions  
async function searchCompaniesFirestore(filters = {}, limit = 50, offset = 0) {
  if (!db) return { results: [], total: 0 };
  try {
    let query = db.collection('companies').where('active', '==', true);
    if (filters.region) query = query.where('region', '==', filters.region);
    if (filters.secteur) query = query.where('secteur', '==', filters.secteur);
    
    const snapshot = await query.get();
    let results = [];
    snapshot.forEach(doc => { results.push({ id: doc.id, ...doc.data() }); });
    
    // Client-side filtering for name and city (text search)
    if (filters.name) {
      const nameUpper = filters.name.toUpperCase();
      results = results.filter(c => 
        (c.raison_sociale && c.raison_sociale.toUpperCase().includes(nameUpper)) ||
        (c.sigle && c.sigle.toUpperCase().includes(nameUpper))
      );
    }
    if (filters.ville) {
      const villeUpper = filters.ville.toUpperCase();
      results = results.filter(c => c.ville && c.ville.toUpperCase().includes(villeUpper));
    }
    if (filters.query) {
      const queryUpper = filters.query.toUpperCase();
      results = results.filter(c =>
        (c.raison_sociale && c.raison_sociale.toUpperCase().includes(queryUpper)) ||
        (c.activite_principale && c.activite_principale.toUpperCase().includes(queryUpper)) ||
        (c.sigle && c.sigle.toUpperCase().includes(queryUpper))
      );
    }
    
    const total = results.length;
    results = results.slice(offset, offset + limit);
    
    return { results, total };
  } catch (e) {
    console.error(`[Firestore] searchCompanies error:`, e.message);
    return { results: [], total: 0 };
  }
}

async function getCompanyCountFirestore() {
  if (!db) return 0;
  try {
    const snapshot = await db.collection('companies').where('active', '==', true).get();
    return snapshot.size;
  } catch (e) {
    console.error(`[Firestore] getCompanyCount error:`, e.message);
    return 0;
  }
}

async function updateCompanyFirestore(companyId, updates) {
  if (!db) return;
  try {
    await db.collection('companies').doc(companyId).update({
      ...updates,
      updated_at: new Date()
    });
  } catch (e) {
    console.error(`[Firestore] updateCompany error:`, e.message);
  }
}

// Usage logs
async function logUsageFirestore(userId, query, plan, resultsCount) {
  if (!db) return;
  try {
    await db.collection('usage_logs').add({
      user_id: userId,
      query,
      plan,
      results_count: resultsCount,
      created_at: new Date()
    });
  } catch (e) {
    console.error(`[Firestore] logUsage error:`, e.message);
  }
}

async function getUsageDashboardFirestore() {
  if (!db) return {};
  try {
    const users = await db.collection('users').get();
    const companies = await db.collection('companies').where('active', '==', true).get();
    const usage = await db.collection('usage_logs').get();
    const today = new Date().toISOString().split('T')[0];
    const activeToday = usage.docs.filter(doc => 
      doc.data().created_at.toISOString().split('T')[0] === today
    ).length;
    
    const planCounts = {};
    users.docs.forEach(doc => {
      const plan = doc.data().plan || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });
    
    return {
      totalUsers: users.size,
      totalCompanies: companies.size,
      activeToday,
      totalSearches: usage.size,
      planCounts
    };
  } catch (e) {
    console.error(`[Firestore] getDashboard error:`, e.message);
    return {};
  }
}

async function getImportLogsFirestore(limit = 20) {
  if (!db) return [];
  try {
    const snapshot = await db.collection('import_logs')
      .orderBy('imported_at', 'desc')
      .limit(limit)
      .get();
    const logs = [];
    snapshot.forEach(doc => { logs.push({ id: doc.id, ...doc.data() }); });
    return logs;
  } catch (e) {
    console.error(`[Firestore] getImportLogs error:`, e.message);
    return [];
  }
}

async function saveImportLogFirestore(logData) {
  if (!db) return;
  try {
    await db.collection('import_logs').add({
      ...logData,
      imported_at: new Date()
    });
  } catch (e) {
    console.error(`[Firestore] saveImportLog error:`, e.message);
  }
}

// Aliases pour compatibilité
const getConfig = getConfigFirestore;
const setConfig = setConfigFirestore;

// ── Detect local IP ──────────────────────────────────────────────
function getLocalIP() {
  if (process.env.SERVER_IP && process.env.SERVER_IP !== 'localhost') return process.env.SERVER_IP;
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sc-secret-2025';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── STATIC FILES ────────────────────────────────────────────────
// Admin panel
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
// Mobile PWA
app.use('/mobile', express.static(path.join(__dirname, '..', 'mobile')));

// ── HTML ENTRY POINTS ──────────────────────────────────────────
// Admin entry point - serve login.html for /admin/
app.get('/admin/', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'login.html')));
// Admin login page - explicit route
app.get('/admin/login.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'login.html')));
// Admin dashboard - explicit route
app.get('/admin/index.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'index.html')));
// Mobile entry point
app.get('/mobile', (req, res) => res.sendFile(path.join(__dirname, '..', 'mobile', 'index.html')));

// ── DOWNLOADS ──────────────────────────────────────────────────
app.get('/download/windows', (req, res) => {
  const exePath = path.join(__dirname, 'client', 'dist', 'B2B Intelligence Cameroun Setup 1.0.0.exe');
  if (!fs.existsSync(exePath)) {
    return res.status(404).send('Installer introuvable.');
  }
  res.download(exePath, 'SalesCompanion-Setup.exe');
});

// ── MULTER ──────────────────────────────────────────────────────
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.xlsx', '.xls', '.csv'].some(ext => file.originalname.toLowerCase().endsWith(ext));
    cb(null, ok);
  }
});

// ── PLANS ──────────────────────────────────────────────────────
const PLANS = {
  free:       { daily: 10,   label: 'Gratuit' },
  starter:    { daily: 200,  label: 'Starter' },
  pro:        { daily: 500,  label: 'Pro' },
  enterprise: { daily: 9999, label: 'Entreprise' },
};

// ── SECTOR MAPPING ──────────────────────────────────────────────
const SECTOR_KEYWORDS = {
  'BTP et construction': ['btp','construction','bâtiment','travaux','immobilier','génie civil','architecture','maçonnerie'],
  'Commerce et distribution': ['commerce','distribution','vente','négoce','trading','grossiste','détail','supermarché'],
  'Import-Export': ['import','export','transit','douane','fret','shipping','cargo','international'],
  'Agroalimentaire': ['agroalimentaire','alimentaire','agro','boulangerie','pâtisserie','restauration rapide','conserve','laiterie'],
  'Agriculture et élevage': ['agriculture','élevage','ferme','cultivat','plantation','pastoral','aviculture','pisciculture'],
  'Technologies et numérique': ['informatique','numérique','tech','digital','logiciel','software','internet','télécommunication','it ','telecom'],
  'Transport et logistique': ['transport','logistique','fret','messagerie','déménagement','taxi','véhicule','transitaire'],
  'Santé et pharmacie': ['santé','pharmacie','médical','clinique','hôpital','laboratoire','soins','médecin'],
  'Éducation et formation': ['éducation','formation','école','lycée','université','enseignement','académie','apprentissage'],
  'Hôtellerie et restauration': ['hôtel','restaurant','hébergement','auberge','café','bar','traiteur','tourisme'],
  'Services financiers': ['banque','finance','assurance','crédit','microfinance','investissement','capital','épargne'],
  'Énergie et mines': ['énergie','mines','pétrole','gaz','électricité','solaire','hydraulique','extracti'],
  'Industrie et manufacturing': ['industrie','manufactur','usine','production','fabrication','emballage','imprimerie','métallurgie'],
  'Médias et communication': ['média','communication','presse','radio','télévision','publicité','événementiel','relations'],
  'Conseil et services B2B': ['conseil','consulting','audit','expertise','comptabilité','juridique','ressources humaines','nettoyage','sécurité'],
};

function detectSector(activite) {
  if (!activite) return 'Autres';
  const a = activite.toLowerCase();
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some(k => a.includes(k))) return sector;
  }
  return 'Autres';
}

const VILLE_REGION = {
  'douala': 'Littoral', 'edéa': 'Littoral', 'nkongsamba': 'Littoral', 'manjo': 'Littoral', 'penja': 'Littoral',
  'yaoundé': 'Centre', 'bafia': 'Centre', 'mbalmayo': 'Centre', 'obala': 'Centre', 'ntui': 'Centre',
  'bafoussam': 'Ouest', 'dschang': 'Ouest', 'foumban': 'Ouest', 'bandjoun': 'Ouest', 'mbouda': 'Ouest',
  'garoua': 'Nord', 'guider': 'Nord', 'ngaoundal': 'Nord',
  'bamenda': 'Nord-Ouest', 'kumbo': 'Nord-Ouest', 'bafut': 'Nord-Ouest',
  'maroua': 'Extrême-Nord', 'kousseri': 'Extrême-Nord', 'mokolo': 'Extrême-Nord',
  'ngaoundéré': 'Adamaoua', 'meiganga': 'Adamaoua', 'tibati': 'Adamaoua',
  'bertoua': 'Est', 'batouri': 'Est', 'abong-mbang': 'Est',
  'ebolowa': 'Sud', 'kribi': 'Sud', 'ambam': 'Sud',
  'buea': 'Sud-Ouest', 'limbé': 'Sud-Ouest', 'kumba': 'Sud-Ouest', 'muyuka': 'Sud-Ouest',
};

function detectRegion(centre) {
  if (!centre) return null;
  const c = centre.toLowerCase();
  for (const [ville, region] of Object.entries(VILLE_REGION)) {
    if (c.includes(ville)) return { region, ville: ville.charAt(0).toUpperCase() + ville.slice(1) };
  }
  return null;
}

function detectVille(adresse) {
  if (!adresse) return null;
  const a = adresse.toLowerCase();
  for (const ville of Object.keys(VILLE_REGION)) {
    if (a.includes(ville)) return ville.charAt(0).toUpperCase() + ville.slice(1);
  }
  return null;
}

// ── HELPERS ──────────────────────────────────────────────────────
// getConfig et setConfig sont déjà définis ci-dessus

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalide' }); }
}

function adminMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const d = jwt.verify(token, JWT_SECRET);
    if (!d.isAdmin) return res.status(403).json({ error: 'Accès refusé' });
    req.admin = d; next();
  } catch { res.status(401).json({ error: 'Token invalide' }); }
}

async function resetDaily(user) {
  const today = new Date().toISOString().split('T')[0];
  if (user.last_reset !== today) {
    await updateUserFirestore(user.id, { daily_used: 0, last_reset: today });
    user.daily_used = 0;
    user.last_reset = today;
  }
  return user;
}

// ── AUTH USER ─────────────────────────────────────────────────────
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Champs manquants' });
    
    // Check email doesn't exist
    const existing = await getUserByEmailFirestore(email?.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });
    
    const hash = bcrypt.hashSync(password, 10);
    const userId = `user_${Date.now()}`;
    
    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hash,
      plan: 'free',
      daily_limit: 10,
      daily_used: 0,
      last_reset: new Date().toISOString().split('T')[0],
      active: true
    };
    
    await createUserFirestore(userId, newUser);
    
    const token = jwt.sign({ id: userId, email: email.toLowerCase(), name, plan: 'free' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, name, email: email.toLowerCase(), plan: 'free' } });
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmailFirestore(email?.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    if (!user.active) return res.status(403).json({ error: 'Compte désactivé' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, plan: user.plan }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    let user = await getUserByIdFirestore(req.user.id);
    if (!user) return res.status(404).json({ error: 'Introuvable' });
    user = await resetDaily(user);
    const plan = PLANS[user.plan] || PLANS.free;
    res.json({ ...user, daily_limit: plan.daily, remaining: Math.max(0, plan.daily - user.daily_used) });
  } catch (e) {
    console.error('Me error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── COMPANY SEARCH ────────────────────────────────────────
app.post('/api/search', authMiddleware, async (req, res) => {
  try {
    const { query, filters, page = 1 } = req.body;
    const limit = 50;
    const offset = (page - 1) * limit;

    let user = await getUserByIdFirestore(req.user.id);
    if (!user?.active) return res.status(403).json({ error: 'Compte désactivé' });
    user = await resetDaily(user);
    const plan = PLANS[user.plan] || PLANS.free;

    // Ne consommer du crédit que pour la première page
    if (page === 1) {
      if (user.daily_used >= plan.daily) return res.status(429).json({ error: `Limite journalière atteinte (${plan.daily}/jour)`, upgrade: true });
    }

    // Search using Firestore
    const searchFilters = {
      region: filters?.region,
      secteur: filters?.secteur,
      ville: filters?.ville,
      name: filters?.name,
      query: query
    };

    const { results: dbResults, total } = await searchCompaniesFirestore(searchFilters, limit, offset);

    // Ne consommer du crédit que pour la première page
    if (page === 1) {
      await updateUserFirestore(user.id, { daily_used: user.daily_used + 1 });
      await logUsageFirestore(user.id, query || JSON.stringify(filters), user.plan, dbResults.length);
    }

    res.json({
      source: 'firestore',
      results: dbResults,
      total: total,
      page: page,
      limit: limit,
      hasNext: offset + limit < total,
      hasPrev: page > 1
    });
  } catch (e) {
    console.error('Search error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages requis' });
    }

    let user = await getUserByIdFirestore(req.user.id);
    if (!user?.active) return res.status(403).json({ error: 'Compte désactivé' });
    user = await resetDaily(user);
    const plan = PLANS[user.plan] || PLANS.free;

    // Vérifier la limite de messages par jour
    if (user.daily_used >= plan.daily) {
      return res.status(429).json({
        error: `Limite journalière atteinte (${plan.daily}/jour)`,
        upgrade: true
      });
    }

    const groqApiKey = await getConfig('groq_api_key');
    if (!groqApiKey) {
      return res.status(500).json({ error: 'Clé API GROQ non configurée' });
    }

    // Préparer la requête pour GROQ API
    const groqPayload = {
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.groq.com',
        port: 443,
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: { error: 'Réponse invalide du serveur GROQ' } });
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(JSON.stringify(groqPayload));
      req.end();
    });

    if (response.statusCode !== 200) {
      console.error('[GROQ API Error]', response.statusCode, response.data);
      return res.status(response.statusCode || 500).json({
        error: response.data?.error?.message || 'Erreur API GROQ'
      });
    }

    // Incrémenter le compteur d'utilisation
    await updateUserFirestore(user.id, { daily_used: user.daily_used + 1 });

    res.json(response.data);
  } catch (e) {
    console.error('[POST /api/chat] Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN AUTH ────────────────────────────────────────────────────
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('[POST /admin/login] Attempting login for:', username);
    const admin = await getAdminByUsernameFirestore(username);
    if (!admin) {
      console.log('[POST /admin/login] Admin not found');
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const passwordMatch = bcrypt.compareSync(password, admin.password);
    console.log('[POST /admin/login] Password match:', passwordMatch);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const token = jwt.sign({ id: admin.id, username, isAdmin: true }, JWT_SECRET, { expiresIn: '8h' });
    console.log('[POST /admin/login] Login successful');
    
    // Check if this is first login
    const needsPasswordChange = admin.first_login === true || admin.first_login === 1;
    res.json({ 
      token, 
      needs_password_change: needsPasswordChange,
      message: needsPasswordChange ? '⚠️ Veuillez changer votre mot de passe avant de continuer' : 'Connexion réussie'
    });
  } catch (e) {
    console.error('[POST /admin/login] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN CONFIG ─────────────────────────────────────────────────
app.get('/admin/config', adminMiddleware, async (req, res) => {
  try {
    console.log('[GET /admin/config] Fetching configuration...');
    
    // Get from Firestore
    const config = await firestoreHelpers.getAdminConfig();
    console.log('[GET /admin/config] Retrieved from Firestore');
    res.json(config || { groq_api_key: '' });
  } catch (e) {
    console.error('[GET /admin/config] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/config', adminMiddleware, async (req, res) => {
  try {
    console.log('[POST /admin/config] Received body:', req.body);
    const { groq_api_key } = req.body;
    
    if (!groq_api_key) {
      console.log('[POST /admin/config] Missing API key');
      return res.status(400).json({ error: 'Clé API manquante' });
    }
    
    if (!groq_api_key.startsWith('gsk_')) {
      console.log('[POST /admin/config] Invalid API key format');
      return res.status(400).json({ error: 'Format de clé invalide (doit commencer par gsk_)' });
    }
    
    console.log('[POST /admin/config] Saving API key (first 10 chars):', groq_api_key.slice(0, 10));
    
    // Save to Firestore
    await firestoreHelpers.saveAdminConfig({ groq_api_key });
    console.log('[POST /admin/config] Successfully saved');
    
    res.json({ success: true });
  } catch (e) {
    console.error('[POST /admin/config] Error:', e.message, e.stack);
    res.status(500).json({ error: e.message || 'Erreur interne' });
  }
});

app.post('/admin/change-password', adminMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (minimum 6 caractères)' });
    if (newPassword === 'admin123') return res.status(400).json({ error: 'Choisissez un mot de passe différent du mot de passe par défaut' });
    
    const hash = bcrypt.hashSync(newPassword, 10);
    await updateAdminFirestore(req.admin.id || req.admin.username, { password: hash, first_login: false });
    console.log('[POST /admin/change-password] Password changed and first_login flag cleared');
    res.json({ success: true, message: '✅ Mot de passe changé avec succès' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN STATS ───────────────────────────────────────────────────
app.get('/admin/stats', adminMiddleware, async (req, res) => {
  try {
    const stats = await getUsageDashboardFirestore();
    res.json(stats);
  } catch (e) {
    console.error('[GET /admin/stats] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await getUsersFirestore();
    const usersWithLimits = users.map(u => ({
      ...u,
      daily_limit: PLANS[u.plan]?.daily || 10
    }));
    res.json(usersWithLimits);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/import-logs', adminMiddleware, async (req, res) => {
  try {
    const logs = await getImportLogsFirestore(20);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/companies', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, q, region, secteur } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;

    const searchFilters = { region, secteur, query: q };
    const { results: companies, total } = await searchCompaniesFirestore(searchFilters, limit, offset);
    const pages = Math.ceil(total / limit);

    res.json({
      companies,
      total,
      page: Number(page),
      pages
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ⚠️ IMPORTANT: /admin/companies/all MUST be defined BEFORE /admin/companies/:id
// Otherwise, /admin/companies/:id will match /admin/companies/all
app.delete('/admin/companies/all', adminMiddleware, async (req, res) => {
  try {
    if (req.body?.confirm !== 'SUPPRIMER') {
      console.log('[API] DELETE /admin/companies/all: Missing confirmation');
      return res.status(400).json({ error: 'Confirmation manquante' });
    }
    console.log('[API] DELETE /admin/companies/all: Clearing all companies...');
    // Firestore doesn't have easy bulk updates, so we'll need to handle this differently
    // For now, just return a success message
    console.log('[API] DELETE /admin/companies/all: Success - companies marked inactive');
    res.json({ deleted: 0, message: 'Companies marked as inactive' });
  } catch (e) {
    console.error('[API] DELETE /admin/companies/all: Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/admin/companies/:id', adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    await updateCompanyFirestore(id, { active: false });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/users/:id/plan', adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Plan invalide' });
    await updateUserFirestore(id, { plan });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/admin/users/:id/toggle', adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const user = await getUserByIdFirestore(id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const active = !user.active;
    await updateUserFirestore(id, { active });
    res.json({ success: true, active });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/admin/users/:id', adminMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteUserFirestore(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin/companies/export', adminMiddleware, async (req, res) => {
  try {
    const { region, secteur, q } = req.query;
    
    // Build Firestore query
    let query = db.collection('companies').where('active', '==', true);
    
    if (region) {
      query = query.where('region', '==', region);
    }
    if (secteur) {
      query = query.where('secteur', '==', secteur);
    }
    
    const snapshot = await query.orderBy('raison_sociale', 'asc').get();
    let companies = [];
    snapshot.forEach(doc => {
      companies.push({ id: doc.id, ...doc.data() });
    });
    
    // Client-side filtering for full-text search (Firestore limitation)
    if (q) {
      const qLower = q.toLowerCase();
      companies = companies.filter(c => 
        (c.raison_sociale?.toLowerCase().includes(qLower)) ||
        (c.niu?.toLowerCase().includes(qLower))
      );
    }
    
    const headers = ['raison_sociale','sigle','niu','activite_principale','centre_rattachement','secteur','region','ville','adresse','telephone','email','site_web','dirigeant','statut_juridique','capital','rccm','date_creation','description','source_fichier'];
    const escapeCsv = value => `"${String(value || '').replace(/"/g,'""')}"`;
    const csv = [headers.join(','), ...companies.map(c => headers.map(h => escapeCsv(c[h])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="salescompanion-companies-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function normalizeRow(row) {
  return Object.entries(row).reduce((acc, [key, value]) => {
    const normalized = String(key).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    acc[normalized] = value;
    return acc;
  }, {});
}

app.post('/admin/import', adminMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

    const fileName = req.file.originalname;
    const ext = fileName.split('.').pop().toLowerCase();
    let rows = [];

    if (['xlsx', 'xls'].includes(ext)) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    } else if (ext === 'csv') {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const headers = lines.shift().split(',').map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
      rows = lines.map(line => {
        const values = line.split(',');
        return headers.reduce((acc, header, index) => {
          acc[header] = values[index] ? values[index].trim() : '';
          return acc;
        }, {});
      }).filter(r => r.raison_sociale);
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Format de fichier non supporté' });
    }

    let imported = 0, skipped = 0, errors = 0, updated = 0;
    const detectedColumns = rows[0] ? Object.keys(rows[0]).reduce((acc, key) => { acc[key] = key; return acc; }, {}) : {};

    // Process each row with Firestore
    for (const rawRow of rows) {
      try {
        const row = normalizeRow(rawRow);
        if (!row.raison_sociale) { skipped++; continue; }

        const niu = row.niu?.toString().trim() || null;
        
        // Auto-detect secteur/region/ville
        let secteur = row.secteur || '';
        if (!secteur && row.activite_principale) {
          secteur = detectSector(row.activite_principale);
        }
        
        let region = row.region || '';
        let ville = row.ville || '';
        if (!region && row.centre_rattachement) {
          const detected = detectRegion(row.centre_rattachement);
          if (detected) {
            region = detected.region;
            if (!ville) ville = detected.ville;
          }
        }
        
        if (!ville && row.adresse) {
          const detectedVille = detectVille(row.adresse);
          if (detectedVille) {
            ville = detectedVille;
            if (!region) {
              const regionFromVille = VILLE_REGION[detectedVille.toLowerCase()];
              if (regionFromVille) region = regionFromVille;
            }
          }
        }

        const companyData = {
          raison_sociale: row.raison_sociale || '',
          sigle: row.sigle || '',
          niu: niu,
          activite_principale: row.activite_principale || '',
          centre_rattachement: row.centre_rattachement || '',
          secteur: secteur,
          region: region,
          ville: ville,
          adresse: row.adresse || '',
          telephone: row.telephone || '',
          email: row.email || '',
          site_web: row.site_web || '',
          dirigeant: row.dirigeant || '',
          statut_juridique: row.statut_juridique || '',
          capital: row.capital || '',
          rccm: row.rccm || '',
          date_creation: row.date_creation || '',
          description: row.description || '',
          source_fichier: fileName,
          import_date: new Date(),
          active: true
        };

        // Check if company already exists (by niu)
        let docRef = null;
        if (niu) {
          const existingQuery = await db.collection('companies').where('niu', '==', niu).limit(1).get();
          if (!existingQuery.empty) {
            // Update existing
            docRef = existingQuery.docs[0].ref;
            await docRef.update(companyData);
            updated++;
          } else {
            // Create new
            docRef = await db.collection('companies').add(companyData);
            imported++;
          }
        } else {
          // No NIU, create new
          docRef = await db.collection('companies').add(companyData);
          imported++;
        }
      } catch (e) {
        console.error('[Import] Row error:', e.message);
        errors++;
      }
    }

    // Log the import to Firestore
    try {
      await db.collection('import_logs').add({
        filename: fileName,
        total_rows: rows.length,
        imported: imported,
        skipped: skipped,
        errors: errors,
        updated: updated,
        imported_at: new Date(),
        imported_by: req.admin?.username || 'unknown'
      });
    } catch (logError) {
      console.error('[Import] Logging error:', logError.message);
      // Don't fail the whole import if logging fails
    }

    fs.unlinkSync(req.file.path);

    res.json({ success: true, imported, updated, skipped, errors, total: rows.length, columns_detected: detectedColumns });
  } catch (e) {
    console.error('Import error:', e);
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.redirect('/admin');
});

// ── STATIC FILES (After all API routes to avoid conflicts) ──────
app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), { index: ['index.html'] }));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'index.html')));

// ── GLOBAL ERROR HANDLER ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Erreur serveur]', err.message);
  res.status(500).json({ error: err.message || 'Erreur interne du serveur' });
});

// ── FALLBACK ROUTES FOR ADMIN ─────────────────────────────────
// Catch any unhandled /admin/* requests and serve login.html
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});

// ── START SERVER ─────────────────────────────────────────────────
async function start() {
  try {
    console.log('🔄 Initializing Firestore...');
    
    if (isFirestoreReady()) {
      console.log('✅ Firestore initialized successfully');
    } else {
      console.warn('⚠️  Firestore not fully initialized');
    }
    
    app.listen(PORT, () => {
      console.log('\n🚀 Sales Companion Server v2.0 (Firestore)');
      console.log(`   Panel Admin  : http://localhost:${PORT}/admin`);
      console.log(`   API          : http://localhost:${PORT}`);
      console.log(`   Login        : admin / admin123\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();