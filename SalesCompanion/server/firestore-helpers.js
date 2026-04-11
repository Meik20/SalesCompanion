// ── FIRESTORE HELPERS FOR ADMIN DATA ──
const { getFirestore, ADMIN_COLLECTIONS } = require('./firestore-config');

/**
 * Save config to Firestore
 */
async function saveAdminConfig(configData) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const configRef = db.collection(ADMIN_COLLECTIONS.CONFIG).doc('settings');
    await configRef.set(
      {
        ...configData,
        updated_at: new Date(),
      },
      { merge: true }
    );
    console.log('✅ Admin config saved to Firestore');
    return true;
  } catch (error) {
    console.error('❌ Error saving admin config:', error.message);
    throw error;
  }
}

/**
 * Get config from Firestore
 */
async function getAdminConfig() {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const configRef = db.collection(ADMIN_COLLECTIONS.CONFIG).doc('settings');
    const doc = await configRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('❌ Error getting admin config:', error.message);
    throw error;
  }
}

/**
 * Save user to admin collection
 */
async function saveAdminUser(userId, userData) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const userRef = db.collection(ADMIN_COLLECTIONS.USERS).doc(userId);
    await userRef.set(
      {
        ...userData,
        updated_at: new Date(),
      },
      { merge: true }
    );
    console.log(`✅ Admin user ${userId} saved to Firestore`);
    return true;
  } catch (error) {
    console.error('❌ Error saving admin user:', error.message);
    throw error;
  }
}

/**
 * Get all users from admin collection
 */
async function getAdminUsers(filters = {}) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    let query = db.collection(ADMIN_COLLECTIONS.USERS);

    // Apply filters if provided
    if (filters.plan) {
      query = query.where('plan', '==', filters.plan);
    }
    if (filters.active !== undefined) {
      query = query.where('active', '==', filters.active);
    }

    const snapshot = await query.get();
    const users = [];
    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return users;
  } catch (error) {
    console.error('❌ Error getting admin users:', error.message);
    throw error;
  }
}

/**
 * Save import log to Firestore
 */
async function saveAdminImportLog(logData) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const logsRef = db.collection(ADMIN_COLLECTIONS.IMPORT_LOGS);
    const docRef = await logsRef.add({
      ...logData,
      created_at: new Date(),
    });
    console.log(`✅ Import log saved to Firestore: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error saving import log:', error.message);
    throw error;
  }
}

/**
 * Get import logs from Firestore
 */
async function getAdminImportLogs(limit = 50) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const snapshot = await db
      .collection(ADMIN_COLLECTIONS.IMPORT_LOGS)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    const logs = [];
    snapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return logs;
  } catch (error) {
    console.error('❌ Error getting import logs:', error.message);
    throw error;
  }
}

/**
 * Save company data to admin collection
 */
async function saveAdminCompany(companyId, companyData) {
  const db = getFirestore();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    const companyRef = db.collection(ADMIN_COLLECTIONS.COMPANIES).doc(companyId);
    await companyRef.set(
      {
        ...companyData,
        updated_at: new Date(),
      },
      { merge: true }
    );
    console.log(`✅ Admin company ${companyId} saved to Firestore`);
    return true;
  } catch (error) {
    console.error('❌ Error saving admin company:', error.message);
    throw error;
  }
}

module.exports = {
  saveAdminConfig,
  getAdminConfig,
  saveAdminUser,
  getAdminUsers,
  saveAdminImportLog,
  getAdminImportLogs,
  saveAdminCompany,
  
  // ── BIDIRECTIONAL SYNC FUNCTIONS ──────────────────────────────────
  
  /**
   * Sync user from PostgreSQL to Firestore
   */
  syncUserToFirestore: async function(userData) {
    const db = getFirestore();
    if (!db) return false;
    
    try {
      const userRef = db.collection(ADMIN_COLLECTIONS.USERS).doc(userData.id.toString());
      await userRef.set({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        plan: userData.plan,
        daily_limit: userData.daily_limit,
        daily_used: userData.daily_used,
        active: userData.active,
        created_at: new Date(userData.created_at),
        updated_at: new Date(),
        source: 'postgresql'
      }, { merge: true });
      
      console.log(`✅ User ${userData.id} synced to Firestore`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to sync user ${userData.id}:`, error.message);
      return false;
    }
  },
  
  /**
   * Sync usage log from PostgreSQL to Firestore
   */
  syncUsageLogToFirestore: async function(logData) {
    const db = getFirestore();
    if (!db) return false;
    
    try {
      const logsRef = db.collection(ADMIN_COLLECTIONS.USAGE_LOGS);
      await logsRef.add({
        user_id: logData.user_id,
        query: logData.query,
        results_count: logData.results_count,
        plan: logData.plan,
        created_at: new Date(logData.created_at),
        source: 'postgresql'
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to sync usage log:', error.message);
      return false;
    }
  },
  
  /**
   * Sync company from PostgreSQL to Firestore
   */
  syncCompanyToFirestore: async function(companyData) {
    const db = getFirestore();
    if (!db) return false;
    
    try {
      const companyRef = db.collection(ADMIN_COLLECTIONS.COMPANIES).doc(companyData.id.toString());
      await companyRef.set({
        id: companyData.id,
        raison_sociale: companyData.raison_sociale,
        sigle: companyData.sigle,
        niu: companyData.niu,
        secteur: companyData.secteur,
        region: companyData.region,
        ville: companyData.ville,
        telephone: companyData.telephone,
        email: companyData.email,
        dirigeant: companyData.dirigeant,
        rccm: companyData.rccm,
        active: companyData.active,
        created_at: new Date(companyData.created_at),
        updated_at: new Date(),
        source: 'postgresql'
      }, { merge: true });
      
      console.log(`✅ Company ${companyData.id} synced to Firestore`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to sync company ${companyData.id}:`, error.message);
      return false;
    }
  },
  
  /**
   * Get user from Firestore as backup
   */
  getUserFromFirestore: async function(userId) {
    const db = getFirestore();
    if (!db) return null;
    
    try {
      const doc = await db.collection(ADMIN_COLLECTIONS.USERS).doc(userId.toString()).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error(`❌ Failed to get user from Firestore:`, error.message);
      return null;
    }
  },
  
  /**
   * Sync stats to Firestore
   */
  syncStatsToFirestore: async function(statsData) {
    const db = getFirestore();
    if (!db) return false;
    
    try {
      const statsRef = db.collection(ADMIN_COLLECTIONS.STATS).doc('daily-summary');
      await statsRef.set({
        totalUsers: statsData.totalUsers,
        totalCompanies: statsData.totalCompanies,
        activeToday: statsData.activeToday,
        totalSearches: statsData.totalSearches,
        planCounts: statsData.planCounts,
        companiesByRegion: statsData.companiesByRegion,
        companiesBySecteur: statsData.companiesBySecteur,
        updated_at: new Date()
      }, { merge: true });
      
      console.log('✅ Stats synced to Firestore');
      return true;
    } catch (error) {
      console.error('❌ Failed to sync stats:', error.message);
      return false;
    }
  },
  
  /**
   * Delete from Firestore (sync with PostgreSQL deletion)
   */
  deleteFromFirestore: async function(collection, docId) {
    const db = getFirestore();
    if (!db) return false;
    
    try {
      await db.collection(collection).doc(docId.toString()).delete();
      console.log(`✅ Document ${docId} deleted from Firestore collection ${collection}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete from Firestore:`, error.message);
      return false;
    }
  },
  
  /**
   * Make user backup copy to Firestore before update
   */
  backupUserToFirestore: async function(userId, userData) {
    const db = getFirestore();
    if (!db) return false;
    
    try {
      const backupRef = db.collection('user_backups').doc(`${userId}_${Date.now()}`);
      await backupRef.set({
        user_id: userId,
        backup_data: userData,
        backed_up_at: new Date()
      });
      
      // Keep only last 10 backups
      const snapshot = await db.collection('user_backups')
        .where('user_id', '==', userId)
        .orderBy('backed_up_at', 'desc')
        .limit(100)
        .get();
      
      const docsToDelete = [];
      let count = 0;
      snapshot.forEach(doc => {
        if (count >= 10) {
          docsToDelete.push(doc.ref);
        }
        count++;
      });
      
      for (const docRef of docsToDelete) {
        await docRef.delete();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to backup user:', error.message);
      return false;
    }
  }
};
