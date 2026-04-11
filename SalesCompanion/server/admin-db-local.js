/**
 * Admin Database - Firestore EXCLUSIVE
 * Uses Google Cloud Firestore for all admin data
 * Local JSON backup kept ONLY for emergency offline scenarios
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ADMIN_DB_PATH = path.join(__dirname, '.admin-firestore-backup.json');

// Default admin data - used ONLY if Firestore is completely unreachable
const DEFAULT_ADMIN = {
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10),
  name: 'Administrator',
  role: 'admin',
  first_login: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Ensure backup admin database exists (EMERGENCY FALLBACK ONLY)
function initializeLocalAdminDB() {
  if (!fs.existsSync(ADMIN_DB_PATH)) {
    const adminData = {
      admins: {
        [DEFAULT_ADMIN.username]: DEFAULT_ADMIN
      },
      note: '⚠️ This is an EMERGENCY BACKUP file. Primary data source is Firestore.'
    };
    fs.writeFileSync(ADMIN_DB_PATH, JSON.stringify(adminData, null, 2));
    console.log('[AdminBackup] Emergency backup admin database created');
  }
}

// Get admin from backup storage (EMERGENCY ONLY - Firestore is primary)
function getAdminLocally(username) {
  console.warn('[⚠️] Using admin backup (emergency fallback) - Firestore should be the primary source');
  try {
    if (!fs.existsSync(ADMIN_DB_PATH)) {
      initializeLocalAdminDB();
    }
    const data = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8'));
    return data.admins[username] || null;
  } catch (error) {
    console.error('[AdminBackup] Error reading admin data:', error.message);
    return null;
  }
}

// Update admin in backup storage (EMERGENCY ONLY - Firestore is primary)
function updateAdminLocally(username, updates) {
  console.warn('[⚠️] Updating admin backup (emergency fallback) - Firestore should be the primary source');
  try {
    if (!fs.existsSync(ADMIN_DB_PATH)) {
      initializeLocalAdminDB();
    }
    const data = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8'));
    
    if (data.admins[username]) {
      data.admins[username] = {
        ...data.admins[username],
        ...updates,
        updated_at: new Date().toISOString()
      };
      fs.writeFileSync(ADMIN_DB_PATH, JSON.stringify(data, null, 2));
      console.log(`[AdminBackup] Admin '${username}' updated in backup (emergency fallback)`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[AdminBackup] Error updating admin data:', error.message);
    return false;
  }
}

// Initialize on module load
initializeLocalAdminDB();

module.exports = {
  getAdminLocally,
  updateAdminLocally,
  initializeLocalAdminDB
};

