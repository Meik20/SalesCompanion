/**
 * Admin Dashboard - Firestore Integration Hooks
 * Ensures all critical admin data is persisted to Firestore
 */

/**
 * Hook after admin login - sync admin profile
 */
async function onAdminLoginSuccess(admin) {
  if (!window.firestoreAdminStorage || !window.firestoreAdminStorage.initialized) {
    console.warn('[Admin] Firestore not ready, skipping login sync');
    return;
  }

  try {
    // Save admin session to Firestore
    await window.firestoreAdminStorage.save('admin_sessions', admin.id, {
      email: admin.email,
      loginTime: new Date(),
      lastActive: new Date(),
      ip: 'web_dashboard',
      userAgent: navigator.userAgent.substring(0, 100)
    });

    console.log('[Admin] Session synced to Firestore');
  } catch (error) {
    console.error('[Admin] Session sync error:', error);
  }
}

/**
 * Hook after users loaded - sync to Firestore
 */
async function onUsersLoaded(users) {
  if (!window.firestoreAdminStorage || !window.firestoreAdminStorage.initialized) {
    return;
  }

  try {
    // Batch save users
    const docsToSave = users.map(user => ({
      id: `user_${user.id}`,
      ...user,
      syncedFrom: 'admin_dashboard'
    }));

    await window.firestoreAdminStorage.batchSave('admin_users', docsToSave);
    console.log(`[Admin] Synced ${users.length} users to Firestore`);
  } catch (error) {
    console.error('[Admin] User sync error:', error);
  }
}

/**
 * Hook after companies loaded - sync to Firestore
 */
async function onCompaniesLoaded(companies) {
  if (!window.firestoreAdminStorage || !window.firestoreAdminStorage.initialized) {
    return;
  }

  try {
    // Batch save companies  
    const docsToSave = companies.map(company => ({
      id: `company_${company.id}`,
      ...company,
      syncedFrom: 'admin_dashboard'
    }));

    await window.firestoreAdminStorage.batchSave('admin_companies', docsToSave);
    console.log(`[Admin] Synced ${companies.length} companies to Firestore`);
  } catch (error) {
    console.error('[Admin] Company sync error:', error);
  }
}

/**
 * Hook after stats loaded - sync to Firestore
 */
async function onStatsLoaded(stats) {
  if (!window.firestoreAdminStorage || !window.firestoreAdminStorage.initialized) {
    return;
  }

  try {
    await window.firestoreAdminStorage.save('admin_stats', 'dashboard_snapshot', {
      totalUsers: stats.users || 0,
      totalCompanies: stats.companies || 0,
      totalSearches: stats.searches || 0,
      activeToday: stats.activeToday || 0,
      timestamp: new Date(),
      snapshotFrom: 'admin_dashboard'
    });

    console.log('[Admin] Stats synced to Firestore');
  } catch (error) {
    console.error('[Admin] Stats sync error:', error);
  }
}

/**
 * Hook after import completed - sync import log
 */
async function onImportCompleted(importLog) {
  if (!window.firestoreAdminStorage || !window.firestoreAdminStorage.initialized) {
    return;
  }

  try {
    await window.firestoreAdminStorage.save('admin_import_logs', `import_${Date.now()}`, {
      filename: importLog.filename,
      totalRows: importLog.totalRows,
      imported: importLog.imported,
      skipped: importLog.skipped,
      errors: importLog.errors,
      importedAt: new Date(),
      status: importLog.status || 'completed'
    });

    console.log('[Admin] Import log synced to Firestore');
  } catch (error) {
    console.error('[Admin] Import log sync error:', error);
  }
}

/**
 * Hook after config changed - sync configuration
 */
async function onConfigChanged(config) {
  if (!window.firestoreAdminStorage || !window.firestoreAdminStorage.initialized) {
    return;
  }

  try {
    await window.firestoreAdminStorage.save('admin_config', 'dashboard_config', {
      ...config,
      lastModified: new Date(),
      modifiedBy: 'admin_dashboard'
    });

    console.log('[Admin] Config synced to Firestore');
  } catch (error) {
    console.error('[Admin] Config sync error:', error);
  }
}

/**
 * Initialize Firestore admin storage on app load
 */
async function initFirestoreAdminSync() {
  if (!window.firebase) {
    console.warn('[Admin] Firebase not loaded');
    return false;
  }

  // Get Firebase config from page (should be set in HTML or from server)
  const firebaseConfig = window.FIREBASE_CONFIG || {
    apiKey: 'AIzaSyDxxx', // Will be injected by server
    authDomain: 'sales-companion-9cf56.firebaseapp.com',
    projectId: 'sales-companion-9cf56',
    storageBucket: 'sales-companion-9cf56.appspot.com',
    messagingSenderId: 'xxx',
    appId: 'xxx'
  };

  const success = await window.firestoreAdminStorage.init(firebaseConfig);
  
  if (success) {
    console.log('[Admin] ✅ Firestore admin sync ready');
    return true;
  } else {
    console.warn('[Admin] Firestore init failed, continuing without persistence');
    return false;
  }
}

/**
 * Backup critical admin state to Firestore periodically
 */
function startPeriodicAdminBackup() {
  setInterval(async () => {
    if (!window.firestoreAdminStorage || !window.firestoreAdminStorage.initialized) {
      return;
    }

    // Backup admin state snapshot
    const adminState = {
      currentPage: document.querySelector('.page:not([style*="display:none"])'),
      timestamp: new Date(),
      syncBackup: window.firestoreAdminStorage.getStatus()
    };

    try {
      await window.firestoreAdminStorage.save('admin_backups', `backup_${Date.now()}`, adminState);
    } catch (error) {
      console.error('[Admin] Backup error:', error);
    }
  }, 300000); // Every 5 minutes
}

// Auto-initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.initFirebaseWhenReady) {
    const originalInit = window.initFirebaseWhenReady;
    window.initFirebaseWhenReady = async function() {
      await originalInit.call(this);
      await initFirestoreAdminSync();
      startPeriodicAdminBackup();
    };
  }
});
