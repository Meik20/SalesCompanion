# 🔐 Authentication Architecture - Sales Companion Mobile

## Overview

**Authentication is validated by FIREBASE as the primary and mandatory source of truth.**  
**User profiles are registered in FIRESTORE for persistent activity tracking.**

This document explains the authentication flow for the Sales Companion mobile application.

---

## Core Principles

### 1. **Firebase Authentication (REQUIRED)**
- **All new user registrations** must go through Firebase Authentication
- Firebase provides secure credential validation and account management
- No fallback authentication for registration (Firebase is mandatory)
- Firebase credentials are the single source of truth for user identity

### 2. **Firestore Profile Storage (MANDATORY)**
- **All user profiles** must be registered in Firestore
- Firestore collections store user metadata, activity logs, and search history
- Profiles are created automatically after Firebase authentication succeeds
- Firestore ensures activity tracking and offline resilience

### 3. **Backend (Optional)**
- Backend database provides additional storage layer
- Supports backward compatibility with legacy API users
- Only used if Firestore or Firebase are temporarily unavailable

---

## Registration Flow

### Step 1: Initialize Firebase
```
User opens app → Firebase CDN loads → SDK initializes
```

### Step 2: User submits registration form
```
User enters: Name, Email, Password
```

### Step 3: Firebase Authentication (MANDATORY)
```
1. Validate credentials in Firebase Auth
2. Create user account
3. Generate ID token
✗ If Firebase fails → REJECT (no fallback)
✓ If Firebase succeeds → CONTINUE to Step 4
```

### Step 4: Firestore Profile Registration (MANDATORY) 
```
1. Create 'users' collection document
2. Create 'user_activity_logs' document
3. Initialize activity tracking
✗ If Firestore fails → QUEUE for offline retry
✓ If Firestore succeeds → CONTINUE
```

### Step 5: Backend Registration (Optional)
```
1. Optional: Register in backend database
✗ If Backend fails → CONTINUE (not critical)
✓ If Backend succeeds → COMPLETE
```

### Registration Success Criteria
```javascript
✓ Firebase Auth:      User account created
✓ Firestore Profile:  documents/{userId} exists
✓ Activity Logs:      Tracking initialized
```

---

## Login Flow

### Priority Order
```
PRIORITY 1: Firebase Authentication (REQUIRED for new users)
            ↓
PRIORITY 2: API Fallback (backward compatibility only)
            ↓
FIRESTORE:  Profile sync (MANDATORY after successful login)
```

### Step 1-2: Firebase Login (Priority 1)
```
1. Attempt Firebase.auth().signInWithEmailAndPassword()
2. If successful → User authenticated via Firebase
3. If fails → Try API fallback
```

### Step 3: API Fallback (Priority 2)
```
1. If Firebase unavailable/failed
2. Attempt /auth/login endpoint
3. If successful → User authenticated via API
4. Create Firestore profile for API users
```

### Step 4: Firestore Sync (MANDATORY)
```
1. After any successful login
2. Call syncSession() to update user profile
3. Initialize activity tracking
4. Queue any offline actions for sync
```

---

## Code Implementation

### Registration Code Structure

```javascript
async function doRegister() {
  // ✓ Firebase Authentication (MANDATORY)
  const userCredential = await firebase.auth()
    .createUserWithEmailAndPassword(email, password);
  
  // ✓ Firestore Profile (MANDATORY)
  await mobileFirestore.registerUser(user);
  
  // ○ Backend (Optional)
  await fetch('/auth/register', ...).catch(...);
}
```

### Login Code Structure

```javascript
async function doLogin() {
  try {
    // PRIORITY 1: Firebase
    const userCredential = await firebase.auth()
      .signInWithEmailAndPassword(email, password);
    
    // MANDATORY: Firestore
    await mobileFirestore.syncSession();
    
  } catch (error) {
    // PRIORITY 2: API Fallback
    const data = await fetch('/auth/login', ...);
    
    // MANDATORY: Create Firestore profile for API users
    await mobileFirestore.registerUser(user);
  }
}
```

---

## Data Flow Diagram

```
REGISTRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User enters credentials
        ↓
  Firebase Auth (MANDATORY)
  ├─ ✓ Success → Create account
  └─ ✗ Error → REJECT (no fallback)
        ↓
  Firestore Profile (MANDATORY)
  ├─ ✓ Success → Store profile
  └─ ✗ Error → QUEUE for retry
        ↓
  Backend (Optional)
  ├─ ✓ Success → Additional storage
  └─ ✗ Error → Continue anyway
        ↓
  User authenticated + Profile stored


LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User enters credentials
        ↓
  Firebase Auth (Priority 1)
  ├─ ✓ Success → Proceed to Firestore
  └─ ✗ Error → Try API Fallback
        ↓
  API Fallback (Priority 2)
  ├─ ✓ Success → Proceed to Firestore
  └─ ✗ Error → REJECT
        ↓
  Firestore Sync (MANDATORY)
  ├─ ✓ Update session
  ├─ ✓ Initialize tracking
  └─ ✗ Error → QUEUE for retry
        ↓
  User authenticated + Firestore synced
```

---

## Firestore Collections

### 1. **users**
```javascript
{
  /* Document ID: user_email */
  name: "Jean Dupont",
  email: "jean@example.com",
  plan: "free",
  device_type: "mobile",
  os: "android",
  created_at: Timestamp,
  updated_at: Timestamp,
  activity_count: 42,
  search_count: 15
}
```

### 2. **user_activity_logs**
```javascript
{
  /* Document ID: user_email */
  registrations: [{
    timestamp: Timestamp,
    device: "mobile",
    method: "firebase"
  }],
  activities: [{
    action: "SEARCH",
    details: {...},
    timestamp: Timestamp
  }],
  last_sync: Timestamp
}
```

### 3. **saved_searches**
```javascript
{
  /* Document ID: auto-generated */
  userId: "user@example.com",
  query: "BTP Douala",
  filters: {...},
  resultCount: 12,
  saved_at: Timestamp
}
```

---

## Error Handling

### Registration Errors

| Error | Cause | Action |
|-------|-------|--------|
| `auth/email-already-in-use` | Email exists in Firebase | Show error, suggest login |
| `auth/weak-password` | Password < 6 characters | Request stronger password |
| `auth/invalid-email` | Invalid email format | Request valid email |
| `auth/operation-not-allowed` | Firebase disabled | Contact support |

### Login Errors

| Error | Cause | Action |
|-------|-------|--------|
| `auth/user-not-found` | User not in Firebase | Suggest registration |
| `auth/wrong-password` | Incorrect password | Allow retry |
| `Firebase unavailable` | Network/Firebase down | Try API fallback |
| `API unavailable` | Backend unreachable | Show offline message |

### Firestore Errors

| Error | Cause | Action |
|-------|-------|--------|
| `permission-denied` | Firebase rules blocked | Check rules |
| `network-error` | No internet | Queue for retry |
| `not-found` | Collection missing | Create collection |

---

## Offline Support

### How It Works
1. **Authentication**: Firebase required (must have internet)
2. **Profile Registration**: Queued if offline, synced when online
3. **Activity Logging**: Always queued, synced in background

### Queue Mechanism
```javascript
// If Firestore unavailable
localStorage['sync_queue'] = [
  { action: 'registerUser', userData: {...} },
  { action: 'logActivity', data: {...} }
]

// When online, automatically retry with:
// - Retry delays: 1s → 3s → 10s
// - Max retries: 3 attempts
// - Exponential backoff
```

---

## Testing Checklist

### Registration
- [ ] New user registers via Firebase
- [ ] Check /users collection in Firestore
- [ ] Check /user_activity_logs document
- [ ] Verify activity_count initialized
- [ ] Test with invalid email (should reject)
- [ ] Test with weak password (should reject)
- [ ] Test with existing email (should reject)

### Login
- [ ] User logs in via Firebase (should succeed)
- [ ] User logs in with wrong password (should fail)
- [ ] Check Firestore session synced
- [ ] Test login when Firebase unavailable (API fallback)
- [ ] Verify Firestore profile created for API users

### Offline
- [ ] Disable internet before registration
- [ ] Enable internet after
- [ ] Check that profile created in Firestore
- [ ] Verify queue mechanisms working

### Integration
- [ ] Password reset flow
- [ ] Email verification
- [ ] Profile update synchronization
- [ ] Activity logging to Firestore
- [ ] Session persistence across app restarts

---

## Configuration

### Firebase Console
```
Project: sales-companion-9cf56
Auth Methods: Email/Password ✓
Firestore: Enabled ✓
Collections: users, user_activity_logs, saved_searches ✓
```

### Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    match /user_activity_logs/{userId} {
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

## Summary

| Aspect | Source | Status |
|--------|--------|--------|
| **Authentication** | Firebase | ✅ Mandatory |
| **User Profiles** | Firestore | ✅ Mandatory |
| **Activity Tracking** | Firestore | ✅ Automatic |
| **Backend Storage** | Database | ○ Optional |
| **Offline Support** | LocalStorage Queue | ✅ Built-in |

---

## References

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Mobile Firestore Integration](./FIRESTORE-MOBILE-INTEGRATION.md)
- [Activity Logger API](./assets/js/activity-logger.js)
