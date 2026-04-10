/**
 * Admin Database - Fallback Storage
 * Uses local file instead of Firestore if needed
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ADMIN_DB_PATH = path.join(__dirname, '.admin-local.json');

// Default admin data
const DEFAULT_ADMIN = {
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10),
  name: 'Administrator',
  role: 'admin',
  first_login: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Ensure local admin database exists
function initializeLocalAdminDB() {
  if (!fs.existsSync(ADMIN_DB_PATH)) {
    const adminData = {
      admins: {
        [DEFAULT_ADMIN.username]: DEFAULT_ADMIN
      }
    };
    fs.writeFileSync(ADMIN_DB_PATH, JSON.stringify(adminData, null, 2));
    console.log('[AdminDB] Local admin database created');
  }
}

// Get admin by username from local storage
function getAdminLocally(username) {
  try {
    if (!fs.existsSync(ADMIN_DB_PATH)) {
      initializeLocalAdminDB();
    }
    const data = JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8'));
    return data.admins[username] || null;
  } catch (error) {
    console.error('[AdminDB] Error reading admin data:', error.message);
    return null;
  }
}

// Update admin in local storage
function updateAdminLocally(username, updates) {
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
      console.log(`[AdminDB] Admin '${username}' updated locally`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[AdminDB] Error updating admin data:', error.message);
    return false;
  }
}

// Initialize on load
initializeLocalAdminDB();

module.exports = {
  getAdminLocally,
  updateAdminLocally,
  initializeLocalAdminDB
};
