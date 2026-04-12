# Firestore Session Management - Complete Implementation

## Overview
The SalesCompanion application has been fully migrated to use **Firestore as the source of truth** for all session and data storage. Both admin and mobile authentication systems now store sessions in Firestore with localStorage fallback.

## Architecture

### 1. Admin Authentication System (`admin/login.html` + `admin/index.html`)

#### Session Storage Structure
```javascript
// Collection: admin_sessions
// Document ID: session_[timestamp]_[random]
{
  username: string,           // Admin username
  token: string,              // JWT auth token
  host: string,               // Server URL
  createdAt: timestamp,       // Session creation time
  lastSeen: timestamp,        // Last activity timestamp (updated on each action)
  expiresAt: timestamp,       // Token expiration (8 hours from creation)
  isActive: boolean,          // Session active status
  loggedOutAt: timestamp      // (Optional) When manually logged out
}
```

#### Login Flow (Admin)

**Login Page (`admin/login.html`)**
1. User enters: Server URL, Username, Password
2. Form validates URL format and required fields
3. `handleLogin()` calls `/admin/login` API endpoint
4. On success:
   - Generates unique `sessionId`
   - Creates session object with all above fields
   - **Stores in Firestore** `admin_sessions` collection
   - Saves `sessionId` to localStorage as fallback cache
   - Stores token in localStorage
5. Redirects to admin dashboard

**Session Validation on Load**
- `DOMContentLoaded` checks `localStorage['sc_admin_session_id']`
- Calls `validateAndRedirectFromFirestore(sessionId)`
- If valid (not expired, active): Updates `lastSeen`, redirects to dashboard
- If invalid (expired, inactive, not found): Clears storage, shows login page

#### Dashboard Flow (`admin/index.html`)

**Initial Load**
1. Checks localStorage for token (fast, synchronous)
2. Shows admin dashboard if token exists
3. Asynchronously validates with Firestore (500ms delay)
4. If Firestore validation fails, logs out user

**Login via Dashboard**
- `handleLoginSubmit()` performs same authentication + session creation
- Stores in both Firestore and localStorage
- Supports Firebase `needs_password_change` flow

**Logout**
1. `logout()` function:
   - Marks session as `isActive: false` in Firestore
   - Sets `loggedOutAt` timestamp
   - Clears all localStorage keys (`sc_admin_*`, `sc_cache_*`)
   - Clears Firebase auth state
   - Returns to login page

### 2. Mobile Authentication System (`mobile/index.html`)

#### Session Storage Structure
Mobile uses Firebase Auth directly + Firestore for user profiles:

```javascript
// Firebase Authentication provides:
// - Email/Password authentication
// - ID tokens (auto-refreshed)
// - User UID

// Firestore Collections:
// users/{email}/profile
// - Email, name, plan, registration date
// - Activity tracking
// - Profile settings
```

#### Login Flow (Mobile)
1. **Priority 1**: Firebase Authentication (required for new users)
   - Calls `firebase.auth().signInWithEmailAndPassword(email, password)`
   - Gets ID token
   - Syncs user profile with Firestore
2. **Fallback**: API Authentication (backward compatibility)
   - Calls `/auth/login` endpoint
   - Registers user profile in Firestore if not exists

#### Logout (Mobile)
- Firebase `auth().signOut()`
- Clears tokens
- Removes cached data

### 3. Storage Strategy

| Storage Type | Purpose | When Used |
|---|---|---|
| **Firestore** | Source of Truth | Primary storage for sessions, audit trail, activity logging |
| **localStorage** | Fallback Cache | Fast access when offline, reduced Firestore reads |
| **Firebase Auth** | Authentication | User credentials, ID tokens, session management |
| **sessionStorage** | Temporary | Not used in current implementation |

## Security Considerations

### Token Management
- **8-hour expiration** for admin sessions
- **Automatic invalidation** on logout
- **Firestore-validated** before each critical operation
- **Bearer token scheme** in API calls

### Session Validation
1. Check token existence and validity
2. Verify session document exists in Firestore
3. Check expiration timestamp
4. Verify `isActive` flag
5. Update `lastSeen` on successful validation

### Data Protection
- Firestore Rules restrict access to own sessions
- Admin sessions have service account access only
- Mobile users can only access own profile/activity
- API calls include Bearer token authentication

## API Endpoints

### Admin Authentication
```
POST /admin/login
Body: { username: string, password: string }
Returns: { token: string }
```

### Mobile Authentication
```
POST /auth/login
Body: { email: string, password: string }
Returns: { token: string, user: {...} }
```

### Session Validation
- **Admin**: Validated directly via Firestore queries
- **Mobile**: Validated via Firebase Auth ID tokens

## Firestore Collections

### Collection: `admin_sessions`
- **Purpose**: Track admin user sessions
- **Access**: Service account + authenticated admins
- **TTL**: Documents auto-delete after expiration (can be configured)
- **Indexes**: `isActive`, `expiresAt` for queries

### Collection: `users`
- **Purpose**: Store user profiles (mobile app)
- **Structure**: `users/{email}/profile`
- **Sync**: Mobile app syncs activity to Firestore

### Collection: `activity_logs`
- **Purpose**: Audit trail of admin actions
- **Logging**: Each admin action creates a log entry
- **Info**: User, action, timestamp, affected resources

## Fallback Behavior

### When Firestore is Unavailable
1. **Admin Login**: Stores session in localStorage only
2. **Admin Dashboard**: Uses cached token if Firestore unavailable
3. **Logout**: Still clears data from localStorage
4. **Session Validation**: Accepted if localStorage token valid (degraded mode)

### Recovery When Firestore Comes Online
- Automatic retry on next admin action
- Session data synced to Firestore if still valid
- Expired tokens cleared automatically

## Configuration

### Firebase Configuration
```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "sales-companion-9cf56.firebaseapp.com",
  databaseURL: "...",
  projectId: "sales-companion-9cf56",
  storageBucket: "sales-companion-9cf56.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

### Environment Variables
- `FIRESTORE_PROJECT_ID`: Firestore project
- `FIREBASE_API_KEY`: Client API key
- `DEFAULT_HOST`: Default server URL for admin

## Testing & Verification

### Login Page Tests
✅ Generate unique session ID each login
✅ Store session in Firestore with correct structure
✅ Validate session on page reload
✅ Redirect to dashboard if valid session found
✅ Show login page if session expired/invalid
✅ Fallback to localStorage if Firestore unavailable

### Dashboard Tests
✅ Show app if local token valid
✅ Validate with Firestore asynchronously
✅ Logout marks session inactive
✅ Clear all storage on logout
✅ Generate activity logs on admin actions

### Mobile App Tests
✅ Firebase authentication works
✅ User profile synced to Firestore
✅ API fallback for existing users
✅ Session tokens refreshed automatically

## Monitoring & Maintenance

### Activity Logs
- Admin dashboard can query `activity_logs` collection
- Track: user, action, timestamp, resource affected
- Filter by: date, admin user, action type

### Session Monitoring
```firestore
// Find active admin sessions
db.collection('admin_sessions')
  .where('isActive', '==', true)
  .where('expiresAt', '>', new Date())
  .get()

// Find sessions by user
db.collection('admin_sessions')
  .where('username', '==', 'admin_username')
  .orderBy('createdAt', 'desc')
  .get()
```

### Cleanup & TTL
- Set Firestore TTL policy on `admin_sessions` collection
- Auto-delete documents after `expiresAt` timestamp
- Or manual cleanup via admin dashboard

## Future Enhancements

1. **Session Analytics**
   - Login/logout audit trail
   - Session duration tracking
   - Concurrent session limits

2. **Enhanced Security**
   - IP address tracking in sessions
   - Device fingerprinting
   - Suspicious activity alerts

3. **Multi-Factor Authentication**
   - TOTP/2FA support
   - Biometric authentication
   - Recovery codes

4. **Session Management UI**
   - View active sessions dashboard
   - Revoke specific sessions remotely
   - Change password everywhere

## Troubleshooting

### Issue: Session not persisting after refresh
- **Check**: Firestore rules allow read/write
- **Check**: Session document ID in localStorage matches Firestore
- **Check**: Token hasn't expired
- **Solution**: Clear cache, re-login

### Issue: Logout not working
- **Check**: Firestore `isActive` field set to false
- **Check**: localStorage correctly cleared
- **Solution**: Manual clear of browser storage

### Issue: Firestore unavailable, can't login
- **Expected**: Use localStorage fallback (degraded mode)
- **Check**: Backend `/admin/login` endpoint accessible
- **Solution**: Restore Firestore or use API-only mode

## Documentation Files
- [Firebase Setup](FIREBASE-SETUP-QUICK.md)
- [Firestore Schema](FIRESTORE-SCHEMA.md)
- [Admin Integration](SalesCompanion/admin/FIRESTORE-ADMIN-INTEGRATION.md)
- [Mobile Integration](SalesCompanion/mobile/FIRESTORE-MOBILE-INTEGRATION.md)
