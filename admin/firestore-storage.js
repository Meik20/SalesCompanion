/**
 * Firestore Admin Storage Manager
 * Persistent data storage for admin dashboard using Firestore
 * Guarantees data persistence across sessions
 */

class FirestoreAdminStorage {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.syncQueue = [];
    this.isSyncing = false;
  }

  /**
   * Initialize Firestore connection
   */
  async init(firebaseConfig) {
    try {
      // Wait for Firebase to be initialized
      while (!window.firebase || !window.firebase.app) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.db = firebase.firestore();
      this.initialized = true;
      console.log('[Firestore] Storage initialized');
      
      // Start sync worker
      this.startSyncWorker();
      
      return true;
    } catch (error) {
      console.error('[Firestore] Initialization failed:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Save any data to Firestore
   */
  async save(collection, docId, data) {
    if (!this.initialized) {
      console.warn('[Firestore] Not initialized, queuing for later');
      this.syncQueue.push({ type: 'save', collection, docId, data, timestamp: Date.now() });
      return false;
    }

    try {
      const sanitized = this.sanitizeData(data);
      await this.db.collection(collection).doc(docId).set({
        ...sanitized,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'admin_dashboard'
      }, { merge: true });

      console.log(`[Firestore] Saved: ${collection}/${docId}`);
      return true;
    } catch (error) {
      console.error(`[Firestore] Save error (${collection}/${docId}):`, error);
      this.syncQueue.push({ type: 'save', collection, docId, data, timestamp: Date.now() });
      return false;
    }
  }

  /**
   * Retrieve data from Firestore
   */
  async get(collection, docId) {
    if (!this.initialized) return null;

    try {
      const doc = await this.db.collection(collection).doc(docId).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error(`[Firestore] Get error (${collection}/${docId}):`, error);
      return null;
    }
  }

  /**
   * Query collection with filters
   */
  async query(collection, filters = []) {
    if (!this.initialized) return [];

    try {
      let query = this.db.collection(collection);
      
      for (const { field, operator, value } of filters) {
        query = query.where(field, operator, value);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`[Firestore] Query error (${collection}):`, error);
      return [];
    }
  }

  /**
   * Batch save multiple documents
   */
  async batchSave(collection, documents) {
    if (!this.initialized) {
      console.warn('[Firestore] Not initialized, queuing batch for later');
      document.forEach(doc => {
        this.syncQueue.push({ type: 'save', collection, docId: doc.id, data: doc, timestamp: Date.now() });
      });
      return false;
    }

    try {
      const batch = this.db.batch();
      
      for (const doc of documents) {
        const ref = this.db.collection(collection).doc(doc.id);
        batch.set(ref, {
          ...this.sanitizeData(doc),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'admin_dashboard'
        }, { merge: true });
      }
      
      await batch.commit();
      console.log(`[Firestore] Batch saved: ${documents.length} documents to ${collection}`);
      return true;
    } catch (error) {
      console.error(`[Firestore] Batch save error:`, error);
      return false;
    }
  }

  /**
   * Delete document
   */
  async delete(collection, docId) {
    if (!this.initialized) return false;

    try {
      await this.db.collection(collection).doc(docId).delete();
      console.log(`[Firestore] Deleted: ${collection}/${docId}`);
      return true;
    } catch (error) {
      console.error(`[Firestore] Delete error:`, error);
      return false;
    }
  }

  /**
   * Real-time listener
   */
  onSnapshot(collection, docId, callback) {
    if (!this.initialized) return null;

    return this.db.collection(collection).doc(docId).onSnapshot(
      (doc) => {
        if (doc.exists) {
          callback(doc.data());
        }
      },
      (error) => {
        console.error('[Firestore] Snapshot error:', error);
      }
    );
  }

  /**
   * Sanitize data for Firestore (remove undefined, handle special types)
   */
  sanitizeData(data) {
    if (!data) return {};
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (value === null) {
        sanitized[key] = null;
      } else if (value instanceof Date) {
        sanitized[key] = firebase.firestore.Timestamp.fromDate(value);
      } else if (typeof value === 'object' && !(value instanceof Array)) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Sync worker for queued operations
   */
  startSyncWorker() {
    setInterval(() => {
      if (this.syncQueue.length > 0 && !this.isSyncing && this.initialized) {
        this.processSyncQueue();
      }
    }, 5000); // Try every 5 seconds
  }

  /**
   * Process queued sync operations
   */
  async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    const operations = this.syncQueue.splice(0, 10); // Process 10 at a time

    for (const op of operations) {
      try {
        if (op.type === 'save') {
          await this.save(op.collection, op.docId, op.data);
        }
      } catch (error) {
        console.error('[Firestore] Sync error:', error);
        // Re-queue if failed
        this.syncQueue.push(op);
      }
    }

    this.isSyncing = false;

    if (this.syncQueue.length > 0) {
      console.log(`[Firestore] ${this.syncQueue.length} operations remaining in queue`);
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      queueLength: this.syncQueue.length,
      isSyncing: this.isSyncing
    };
  }

  /**
   * Clear all queued operations
   */
  clearQueue() {
    console.log(`[Firestore] Clearing ${this.syncQueue.length} queued operations`);
    this.syncQueue = [];
  }
}

// Global instance
window.firestoreAdminStorage = new FirestoreAdminStorage();
