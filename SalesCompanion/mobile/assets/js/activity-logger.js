/**
 * Mobile Activity Logging Integration
 * Hooks into search and interaction events to log user activity to Firestore
 */

class MobileActivityLogger {
  /**
   * Log a search activity
   */
  static async logSearch(query, filters = {}, resultCount = 0) {
    if (typeof mobileFirestore === 'undefined' || !mobileFirestore.isInitialized) {
      return;
    }

    try {
      await mobileFirestore.logSearch(query, filters, resultCount);
      console.log('[ActivityLog] Search logged:', query);
    } catch (error) {
      console.warn('[ActivityLog] Failed to log search:', error.message);
    }
  }

  /**
   * Log a company view
   */
  static async logCompanyView(companyId, companyName = '') {
    if (typeof mobileFirestore === 'undefined' || !mobileFirestore.isInitialized) {
      return;
    }

    try {
      await mobileFirestore.logCompanyView(companyId, companyName);
      console.log('[ActivityLog] Company view logged:', companyName || companyId);
    } catch (error) {
      console.warn('[ActivityLog] Failed to log company view:', error.message);
    }
  }

  /**
   * Log a generic activity
   */
  static async log(action, details = {}) {
    if (typeof mobileFirestore === 'undefined' || !mobileFirestore.isInitialized) {
      return;
    }

    try {
      await mobileFirestore.logActivity(action, details);
      console.log('[ActivityLog] Activity logged:', action);
    } catch (error) {
      console.warn('[ActivityLog] Failed to log activity:', error.message);
    }
  }

  /**
   * Log pipeline action
   */
  static async logPipelineAction(companyId, action, details = {}) {
    return this.log('pipeline_action', {
      company_id: companyId,
      action,
      ...details
    });
  }

  /**
   * Log message send
   */
  static async logMessageSent(recipient, messageType = 'email') {
    return this.log('message_sent', {
      recipient,
      type: messageType
    });
  }

  /**
   * Log filter applied
   */
  static async logFilterApplied(filterKey, filterValue) {
    return this.log('filter_applied', {
      key: filterKey,
      value: filterValue
    });
  }

  /**
   * Log external link opened
   */
  static async logExternalLink(url, linkType = 'website') {
    return this.log('external_link_opened', {
      url,
      type: linkType
    });
  }

  /**
   * Save a search for later
   */
  static async saveSearch(searchData) {
    if (typeof mobileFirestore === 'undefined' || !mobileFirestore.isInitialized) {
      return;
    }

    try {
      await mobileFirestore.saveSearch(searchData);
      console.log('[ActivityLog] Search saved');
    } catch (error) {
      console.warn('[ActivityLog] Failed to save search:', error.message);
    }
  }
}

// Global instance
const activityLogger = MobileActivityLogger;
