# Firestore Implementation Quick Reference

## What's Been Implemented

### 1. ✅ Admin Session Management
- **File**: `SalesCompanion/admin/login.html` & `SalesCompanion/admin/index.html`
- **Collection**: `admin_sessions`
- **Features**:
  - Sessions stored in Firestore with 8-hour expiration
  - Unique session IDs generated on each login
  - Session validation on page load/refresh
  - Automatic activity tracking (lastSeen timestamps)
  - Graceful fallback to localStorage if Firestore unavailable

### 2. ✅ Activity Audit Trail
- **File**: `SalesCompanion/admin/index.html`
- **Collection**: `activity_logs`
- **Tracked Actions**:
  - Import files (companies batch upload)
  - Export CSV (filtered company data)
  - Export to Railway (database sync)
  - Delete all companies (destructive action)
  - Error tracking (failed operations)
- **Log Details**: Username, timestamp, action type, detailed parameters, user agent

### 3. ✅ Mobile Authentication
- **File**: `SalesCompanion/mobile/index.html`
- **Collections**: `users` (profiles), `activity_logs`
- **Features**:
  - Firebase Auth (primary) + API fallback
  - User profiles synced to Firestore
  - Activity logging for compliance

## Firestore Collections Schema

### Collection: `admin_sessions`
```javascript
{
  username: "admin_name",          // string
  token: "jwt_token_string",       // string (8-hour expiration)
  host: "https://server-url",      // string
  createdAt: Timestamp,            // When session started
  lastSeen: Timestamp,             // Last activity (updated regularly)
  expiresAt: Timestamp,            // 8 hours from creation
  isActive: boolean,               // false when logged out
  loggedOutAt: Timestamp           // (optional) When manually logged out
}
```

### Collection: `activity_logs`
```javascript
{
  action: "import_companies",      // string - action identifier
  username: "admin_name",          // string - who performed action
  sessionId: "session_xxx",        // string - which session
  timestamp: Timestamp,            // When action occurred
  details: {                       // object - action-specific data
    filename: "companies.xlsx",
    fileSize: 12345,
    imported: 50,
    updated: 10,
    skipped: 5,
    errors: 0,
    columnsDetected: 5,
    userAgent: "Mozilla/5.0..."    // Browser info
  },
  status: "completed"              // "completed" or "error"
}
```

### Collection: `users` (Mobile)
```javascript
{
  email: "user@example.com",
  name: "John Doe",
  plan: "free|starter|pro|enterprise",
  registeredAt: Timestamp,
  lastActivity: Timestamp,
  profile: {
    company: "Company Name",
    role: "sales_rep",
    region: "IDF"
  }
}
```

## Environment Configuration

### Required Firebase Config
Add to your `.env` or Firebase initialization:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "sales-companion-9cf56.firebaseapp.com",
  databaseURL: "https://sales-companion-9cf56.firebaseio.com",
  projectId: "sales-companion-9cf56",
  storageBucket: "sales-companion-9cf56.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};
```

## Firestore Security Rules

### Recommended Rules for Admin Sessions
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin sessions - only accessed by authenticated admins and service account
    match /admin_sessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Activity logs - only admins can read, service account logs events
    match /activity_logs/{logId} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow create: if request.auth != null;
    }
    
    // User profiles - users can read/write own, admins can read all
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## Testing Session Management

### Test 1: Admin Login Flow
```bash
1. Navigate to admin/login.html
2. Enter: URL, Username, Password
3. Click "Se connecter"
4. ✅ Check: New document in admin_sessions collection
5. ✅ Check: sessionId stored in localStorage
6. ✅ Check: Redirect to admin dashboard
```

### Test 2: Session Persistence
```bash
1. After login, refresh the page
2. ✅ Check: Page loads admin dashboard (no re-login)
3. ✅ Check: Firestore validation logs show successful validation
4. ✅ Check: lastSeen timestamp updated in admin_sessions
```

### Test 3: Session Expiration
```bash
1. Manually change expiresAt to past date in Firestore
2. Refresh page or wait for next validation
3. ✅ Check: Session marked as invalid
4. ✅ Check: Redirected to login page
5. ✅ Check: localStorage cleared
```

### Test 4: Logout & Activity Log
```bash
1. While logged in, perform an action (import, export)
2. Check activity_logs collection
3. ✅ Check: New log entry with action details
4. Click logout button
5. ✅ Check: admin_sessions.isActive = false
6. ✅ Check: redirected to login page
```

## Monitoring & Analytics Queries

### Find All Active Admin Sessions
```javascript
const activeSession = await db.collection('admin_sessions')
  .where('isActive', '==', true)
  .where('expiresAt', '>', new Date())
  .get();
console.log(`Active sessions: ${activeSession.docs.length}`);
```

### Find Sessions by Admin
```javascript
const adminSessions = await db.collection('admin_sessions')
  .where('username', '==', 'admin_name')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();
```

### Find Recent Admin Actions
```javascript
const recentActions = await db.collection('activity_logs')
  .where('username', '==', 'admin_name')
  .orderBy('timestamp', 'desc')
  .limit(50)
  .get();
```

### Find All Imports This Month
```javascript
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const imports = await db.collection('activity_logs')
  .where('action', '==', 'import_companies')
  .where('timestamp', '>=', startOfMonth)
  .orderBy('timestamp', 'desc')
  .get();
```

## Troubleshooting

### Issue: Session not saving to Firestore
**Symptoms**: Session stored in localStorage but not in Firestore
**Solutions**:
- Check Firebase initialization is complete
- Verify Firestore rules allow writes
- Check browser console for errors
- Use localStorage fallback (should work)

### Issue: Activity logs not appearing
**Symptoms**: Actions complete but no logs in activity_logs
**Solutions**:
- Verify `logAdminActivity()` called before Firebase init
- Check Firestore write permissions
- Activity logging is non-blocking (errors ignored)
- Monitor browser console for warnings

### Issue: Session expires immediately
**Symptoms**: Login works but next action redirects to login
**Solutions**:
- Check server time vs Firestore servers (clock skew)
- Verify `expiresAt` timestamp is 8 hours in future
- Check admin_sessions document exists

## Next Steps

### Recommended Enhancements
1. **Dashboard Activity Report**
   - Create admin page showing recent activities
   - Filter by action, date range, admin user

2. **Session Management UI**
   - Show active sessions per admin
   - Option to revoke sessions remotely

3. **Alert System**
   - Notify on suspicious activities (failed logins, mass deletes)
   - IP geolocation tracking

4. **Data Retention Policy**
   - Set TTL on activity_logs (keep 90 days)
   - Archive old sessions

5. **Multi-Factor Authentication**
   - Add TOTP/2FA to admin login
   - Required for sensitive operations

## Related Documentation
- [FIRESTORE-SESSION-MANAGEMENT.md](./FIRESTORE-SESSION-MANAGEMENT.md) - Common Implementation details
- [FIRESTORE-SCHEMA.md](./FIRESTORE-SCHEMA.md) - Full database schema
- [Admin Integration Guide](./SalesCompanion/admin/FIRESTORE-ADMIN-INTEGRATION.md)
- [Mobile Integration Guide](./SalesCompanion/mobile/FIRESTORE-MOBILE-INTEGRATION.md)
