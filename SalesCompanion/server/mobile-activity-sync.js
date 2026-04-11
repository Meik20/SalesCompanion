/**
 * Mobile Activity Sync - Server-side logging
 * Handles Firestore persistence for mobile user activities from API calls
 * 
 * Integrates with: /api/search, /auth/login, /auth/register, /api/chat
 */

const admin = require('firebase-admin');

class MobileActivitySync {
  constructor(db) {
    this.db = db;
  }

  /**
   * Log mobile user activity from server-side API calls
   * Called when user performs actions through mobile API
   */
  async logUserActivity(userId, email, action, details = {}) {
    if (!this.db) {
      console.log('[MobileActivitySync] Firestore not initialized');
      return false;
    }

    try {
      const userIdNorm = email.toLowerCase().replace(/[.@]/g, '_');
      const timestamp = new Date().toISOString();

      const activity = {
        action,
        timestamp,
        details,
        server_logged: true
      };

      // Add to user_activity_logs
      await this.db
        .collection('user_activity_logs')
        .doc(userIdNorm)
        .update({
          activities: admin.firestore.FieldValue.arrayUnion(activity),
          last_activity: timestamp,
          activity_count: admin.firestore.FieldValue.increment(1)
        }).catch(async (err) => {
          // Create if doesn't exist
          if (err.code === 'not-found') {
            await this.db
              .collection('user_activity_logs')
              .doc(userIdNorm)
              .set({
                user_id: userIdNorm,
                email: email,
                activities: [activity],
                activity_count: 1,
                last_activity: timestamp,
                created_at: timestamp
              });
          }
        });

      // Update user document
      await this.db.collection('users').doc(userIdNorm).update({
        last_activity: timestamp
      }).catch(() => {
        // User doc might not exist yet
      });

      console.log(`[MobileActivitySync] Activity logged: ${action}`);
      return true;
    } catch (error) {
      console.error('[MobileActivitySync] Error logging activity:', error);
      return false;
    }
  }

  /**
   * Log mobile search activity
   */
  async logMobileSearch(userId, email, query, filters = {}, resultCount = 0) {
    return this.logUserActivity(userId, email, 'search', {
      query,
      filters,
      result_count: resultCount,
      platform: 'mobile'
    });
  }

  /**
   * Log mobile user registration
   */
  async logMobileRegistration(email, name, deviceInfo = {}) {
    try {
      const userIdNorm = email.toLowerCase().replace(/[.@]/g, '_');
      const timestamp = new Date().toISOString();

      // Create user document if not exists
      await this.db.collection('users').doc(userIdNorm).set({
        email: email,
        name: name || email.split('@')[0],
        plan: 'free',
        device_type: deviceInfo.device_type || 'mobile',
        os: deviceInfo.os || 'Unknown',
        user_agent: deviceInfo.user_agent || '',
        created_at: timestamp,
        last_login: timestamp,
        activity_count: 0,
        search_count: 0,
        last_activity: timestamp,
        metadata: {
          app_version: deviceInfo.app_version || '1.0.0',
          timezone: deviceInfo.timezone || 'UTC',
          language: deviceInfo.language || 'fr'
        }
      }, { merge: true });

      // Create activity log
      await this.db.collection('user_activity_logs').doc(userIdNorm).set({
        user_id: userIdNorm,
        email: email,
        registrations: [{
          timestamp,
          device_type: deviceInfo.device_type || 'mobile',
          os: deviceInfo.os || 'Unknown'
        }],
        created_at: timestamp,
        activities: [],
        activity_count: 0
      }, { merge: true });

      console.log(`[MobileActivitySync] Mobile registration logged: ${email}`);
      return true;
    } catch (error) {
      console.error('[MobileActivitySync] Error logging registration:', error);
      return false;
    }
  }

  /**
   * Log mobile chat interaction
   */
  async logMobileChatInteraction(userId, email, messageCount = 0) {
    return this.logUserActivity(userId, email, 'chat_interaction', {
      message_count: messageCount,
      platform: 'mobile'
    });
  }

  /**
   * Sync mobile user stats
   */
  async syncUserStats(email) {
    if (!this.db) {
      return null;
    }

    try {
      const userIdNorm = email.toLowerCase().replace(/[.@]/g, '_');

      const userDoc = await this.db.collection('users').doc(userIdNorm).get();
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      return {
        activity_count: userData.activity_count || 0,
        search_count: userData.search_count || 0,
        last_activity: userData.last_activity,
        plan: userData.plan,
        created_at: userData.created_at
      };
    } catch (error) {
      console.error('[MobileActivitySync] Error syncing stats:', error);
      return null;
    }
  }

  /**
   * Get user's recent activities (last X entries)
   */
  async getUserRecentActivities(email, limit = 20) {
    if (!this.db) {
      return [];
    }

    try {
      const userIdNorm = email.toLowerCase().replace(/[.@]/g, '_');

      const doc = await this.db.collection('user_activity_logs').doc(userIdNorm).get();
      if (!doc.exists) {
        return [];
      }

      const activities = doc.data().activities || [];
      return activities.slice(-limit).reverse();
    } catch (error) {
      console.error('[MobileActivitySync] Error getting activities:', error);
      return [];
    }
  }
}

module.exports = MobileActivitySync;
