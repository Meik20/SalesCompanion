/**
 * Firestore Integration pour Sales Companion Mobile
 * Persist user registration, activity tracking, and offline queue
 */

class MobileFirestoreManager {
  constructor() {
    this.db = null;
    this.userId = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.syncQueue = [];
    this.maxRetries = 3;
    this.retryDelays = [1000, 3000, 10000]; // ms
  }

  /**
   * Initialize Firestore with config from server
   */
  async initialize(firebaseConfig) {
    // Return existing promise if already initializing
    if (this.initPromise) {
      console.log('[MobileFirestore] Initialization already in progress, waiting...');
      return this.initPromise;
    }

    // Create initialization promise
    this.initPromise = (async () => {
      try {
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
          console.log('[MobileFirestore] Firebase not initialized globally, skipping Firestore');
          return false;
        }

        // Get Firestore reference
        this.db = firebase.firestore();
        
        // Enable offline persistence for mobile resilience
        await this.db.enablePersistence().catch(err => {
          if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
            console.warn('[MobileFirestore] Offline persistence error:', err);
          }
        });

        this.isInitialized = true;
        console.log('[MobileFirestore] ✅ Firestore initialized with offline support');
        
        // Start background sync worker
        this.startSyncWorker();
        
        return true;
      } catch (error) {
        console.error('[MobileFirestore] Initialization error:', error);
        return false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Wait for Firestore to be initialized (blocking call)
   */
  async ensureInitialized() {
    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.isInitialized;
    }

    // If not initialized and no promise, wait a bit and retry
    console.log('[MobileFirestore] Waiting for initialization...');
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (this.isInitialized) {
        return true;
      }
    }

    console.error('[MobileFirestore] Initialization timeout');
    return false;
  }

  /**
   * Register user in Firestore
   */
  async registerUser(userData) {
    try {
      // Ensure Firestore is initialized before proceeding
      const initialized = await this.ensureInitialized();
      if (!initialized || !this.db) {
        console.error('[MobileFirestore] Firestore initialization failed');
        throw new Error('Firestore not initialized');
      }

      const userId = userData.email.toLowerCase().replace(/[.@]/g, '_');
      this.userId = userId;

      const userDoc = {
        email: userData.email,
        name: userData.name || userData.email.split('@')[0],
        plan: userData.plan || 'free',
        device_type: /iPad/.test(navigator.userAgent) ? 'tablet' : 'mobile',
        os: this.getOS(),
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        activity_count: 0,
        search_count: 0,
        last_activity: new Date().toISOString(),
        metadata: {
          app_version: '1.0.0',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language
        }
      };

      // Save to users collection
      await this.db.collection('users').doc(userId).set(userDoc, { merge: true });

      // Create user activity log
      await this.db.collection('user_activity_logs').doc(userId).set({
        user_id: userId,
        email: userData.email,
        registrations: [{
          timestamp: new Date().toISOString(),
          device_type: userDoc.device_type,
          os: userDoc.os
        }],
        created_at: new Date().toISOString()
      }, { merge: true });

      console.log('[MobileFirestore] ✅ User registered:', userId);
      return true;
    } catch (error) {
      this.queueAction('registerUser', userData, error);
      console.error('[MobileFirestore] Registration error:', error);
      return false;
    }
  }

  /**
   * Log user activity (search, view, etc.)
   */
  async logActivity(action, details = {}) {
    try {
      if (!this.userId) {
        console.log('[MobileFirestore] Cannot log activity - not authenticated');
        return false;
      }

      // Ensure initialized before proceeding
      const initialized = await this.ensureInitialized();
      if (!initialized || !this.db) {
        console.log('[MobileFirestore] Queueing activity - Firestore not ready');
        this.queueAction('logActivity', { action, details }, new Error('Not initialized'));
        return false;
      }

      const timestamp = new Date().toISOString();
      const activity = {
        action,
        timestamp,
        details,
        device_info: {
          device_type: /iPad/.test(navigator.userAgent) ? 'tablet' : 'mobile',
          os: this.getOS(),
          screen_size: window.innerWidth + 'x' + window.innerHeight
        }
      };

      // Add to user_activity_logs collection
      await this.db
        .collection('user_activity_logs')
        .doc(this.userId)
        .update({
          activities: firebase.firestore.FieldValue.arrayUnion(activity),
          last_activity: timestamp,
          activity_count: firebase.firestore.FieldValue.increment(1)
        });

      // Update user's activity timestamp
      await this.db.collection('users').doc(this.userId).update({
        last_activity: timestamp
      });

      console.log(`[MobileFirestore] Activity logged: ${action}`);
      return true;
    } catch (error) {
      this.queueAction('logActivity', { action, details }, error);
      console.error('[MobileFirestore] Activity log error:', error);
      return false;
    }
  }

  /**
   * Log search activity specifically
   */
  async logSearch(query, filters = {}, resultCount = 0) {
    return this.logActivity('search', {
      query,
      filters,
      result_count: resultCount
    });
  }

  /**
   * Log company view
   */
  async logCompanyView(companyId, companyName = '') {
    return this.logActivity('company_view', {
      company_id: companyId,
      company_name: companyName
    });
  }

  /**
   * Save search result to user saved searches
   */
  async saveSearch(searchData) {
    try {
      if (!this.userId) {
        console.log('[MobileFirestore] Cannot save search - not authenticated');
        return false;
      }

      // Ensure initialized before proceeding
      const initialized = await this.ensureInitialized();
      if (!initialized || !this.db) {
        console.log('[MobileFirestore] Queueing search save - Firestore not ready');
        this.queueAction('saveSearch', searchData, new Error('Not initialized'));
        return false;
      }

      const searchId = `${this.userId}_${Date.now()}`;
      const saveData = {
        user_id: this.userId,
        query: searchData.query || '',
        filters: searchData.filters || {},
        results_count: searchData.results_count || 0,
        timestamp: new Date().toISOString(),
        device_type: /iPad/.test(navigator.userAgent) ? 'tablet' : 'mobile'
      };

      await this.db.collection('saved_searches').doc(searchId).set(saveData);

      // Also add to user searches for quick access
      await this.db
        .collection('users')
        .doc(this.userId)
        .update({
          saved_searches: firebase.firestore.FieldValue.arrayUnion(searchId),
          search_count: firebase.firestore.FieldValue.increment(1)
        });

      console.log('[MobileFirestore] ✅ Search saved:', searchId);
      return true;
    } catch (error) {
      this.queueAction('saveSearch', searchData, error);
      console.error('[MobileFirestore] Save search error:', error);
      return false;
    }
  }

  /**
   * Get user's saved searches (from cache first, then Firestore)
   */
  async getSavedSearches() {
    if (!this.userId || !this.isInitialized || !this.db) {
      return [];
    }

    try {
      const snapshot = await this.db
        .collection('saved_searches')
        .where('user_id', '==', this.userId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[MobileFirestore] Get saved searches error:', error);
      return [];
    }
  }

  /**
  /**
   * Sync user session data
   */
  async syncSession() {
    try {
      if (!this.userId) {
        console.log('[MobileFirestore] No userId to sync session');
        return false;
      }

      // Ensure initialized before proceeding
      const initialized = await this.ensureInitialized();
      if (!initialized || !this.db) {
        console.warn('[MobileFirestore] Queueing session sync - Firestore not ready');
        this.queueAction('syncSession', {}, new Error('Not initialized'));
        return false;
      }

      await this.db.collection('users').doc(this.userId).update({
        last_login: new Date().toISOString(),
        last_sync: new Date().toISOString()
      });

      console.log('[MobileFirestore] Session synced');
      return true;
    } catch (error) {
      this.queueAction('syncSession', {}, error);
      console.warn('[MobileFirestore] Session sync queued:', error.message);
      return false;
    }
  }

  /**
   * Queue action for offline resilience
   */
  queueAction(action, data, error) {
    this.syncQueue.push({
      action,
      data,
      timestamp: Date.now(),
      retries: 0
    });

    // Persist queue to localStorage as backup
    try {
      localStorage.setItem('firestore_sync_queue', JSON.stringify(this.syncQueue));
      console.log('[MobileFirestore] ℹ️ Action queued for offline sync');
    } catch (e) {
      console.error('[MobileFirestore] Queue storage error:', e);
    }
  }

  /**
   * Start background sync worker
   */
  startSyncWorker() {
    setInterval(() => this.processSyncQueue(), 30000); // Every 30 seconds
    
    // Also process on connection restored
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[MobileFirestore] Online - processing queue');
        this.processSyncQueue();
      });
    }
  }

  /**
   * Process offline action queue
   */
  async processSyncQueue() {
    if (!this.db || this.syncQueue.length === 0) {
      return;
    }

    console.log(`[MobileFirestore] Processing ${this.syncQueue.length} queued actions`);

    for (let i = 0; i < Math.min(this.syncQueue.length, 5); i++) {
      const item = this.syncQueue[i];

      try {
        switch (item.action) {
          case 'logActivity':
            await this.logActivity(item.data.action, item.data.details);
            break;
          case 'saveSearch':
            await this.saveSearch(item.data);
            break;
          case 'syncSession':
            await this.syncSession();
            break;
          default:
            console.log('[MobileFirestore] Unknown queued action:', item.action);
        }

        // Remove from queue on success
        this.syncQueue.splice(i, 1);
        i--;
      } catch (error) {
        item.retries++;
        if (item.retries >= this.maxRetries) {
          console.error('[MobileFirestore] Max retries reached for:', item.action);
          this.syncQueue.splice(i, 1);
          i--;
        }
      }
    }

    // Update localStorage
    try {
      localStorage.setItem('firestore_sync_queue', JSON.stringify(this.syncQueue));
    } catch (e) {
      console.error('[MobileFirestore] Queue update error:', e);
    }
  }

  /**
   * Set user ID after authentication
   */
  setUserId(email) {
    this.userId = email.toLowerCase().replace(/[.@]/g, '_');
    console.log('[MobileFirestore] User ID set:', this.userId);
  }

  /**
   * Get device OS
   */
  getOS() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    return 'Unknown';
  }

  /**
   * Clear user data on logout
   */
  clearUser() {
    this.userId = null;
    this.syncQueue = [];
    try {
      localStorage.removeItem('firestore_sync_queue');
    } catch (e) {
      console.error('[MobileFirestore] Clear error:', e);
    }
  }
}

// Global instance
const mobileFirestore = new MobileFirestoreManager();
