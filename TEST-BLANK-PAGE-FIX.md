# Test Plan: /admin/ Blank Page Fix

## Quick Test (1 minute)
1. Open browser and go to: `https://salescompanion-production-a34d.up.railway.app/admin/`
2. **Expected Result:** Login form displays with three identical fields:
   ✓ Server URL (read-only, hardcoded value)
   ✓ Username (empty, required field)
   ✓ Password (empty, required field)

3. **Verify:** 
   - Form is NOT blank ✓
   - Fields are visible ✓
   - No browser console errors ✓

---

## Full Verification Test (5 minutes)

### Phase 1: Form Display
- [ ] Access `/admin/` → login form displays immediately (not blank)
- [ ] Server URL field shows deployment URL (read-only)
- [ ] Username field is empty (never pre-filled)
- [ ] Password field is empty (never pre-filled)
- [ ] All form labels visible and correctly styled
- [ ] "Login" button is present and clickable
- [ ] "Help" button is present (if showing support)

### Phase 2: Console Check (Developer Tools)
Open browser DevTools (F12) → Console tab:
- [ ] No red error messages
- [ ] No Firestore initialization errors
- [ ] No Firebase SDK loading errors
- [ ] Should see: "Firestore initialized" or similar success message
- [ ] Should NOT see: "Redirect loop" or "Cannot read properties" errors

### Phase 3: Authentication Flow
- [ ] Input admin credentials:
  - Username: `admin`
  - Password: `admin123`
- [ ] Click "Login" button
- [ ] **Expected:** Redirect to dashboard (`/admin/index.html#dashboard`)
- [ ] Dashboard loads with authenticated content
- [ ] User name displayed in dashboard

### Phase 4: Firestore Session Validation
After successful login:
- [ ] Firebase Console → Firestore Database → admin_sessions collection
- [ ] Should see new session document with:
  - `sessionId`: unique identifier
  - `username`: "admin"
  - `isActive`: true
  - `expiresAt`: timestamp (~8 hours from now)
  - `lastSeen`: current time

### Phase 5: Refresh & Session Persistence
- [ ] Refresh page at `/admin/index.html`
- [ ] Dashboard still shows (session is persistent)
- [ ] Browser console shows session validated from Firestore
- [ ] Try accessing `/admin/` directly → redirects to dashboard (already authenticated)

### Phase 6: Expired Session Handling
- [ ] Log out (if logout button available)
- [ ] Try accessing `/admin/index.html` without token
- [ ] **Expected:** Redirect back to `/admin/` login page
- [ ] Form displays again (not blank)

### Phase 7: Asset Loading (Static Files)
- [ ] Open DevTools → Network tab
- [ ] Check that CSS files load:
  - [ ] `/admin/assets/...` responds with 200
  - [ ] Style applies correctly to form
- [ ] Check that JS files load (if separate):
  - [ ] `/admin/main.js` or similar responds with 200

---

## Success Criteria
✅ **PASS** if:
1. Login form displays (NOT blank) when accessing `/admin/`
2. No JavaScript errors in console
3. Login with valid credentials succeeds
4. Dashboard displays after successful authentication
5. Session stored in Firestore with correct structure
6. Session persists on page refresh
7. Logging out returns to login page

❌ **FAIL** if:
1. Blank white page still displays
2. Form shows but JavaScript errors appear
3. Login fails or redirects incorrectly
4. Session not stored in Firestore
5. Dashboard blank or inaccessible
6. CSS/JS assets not loading (404 errors)

---

## Browser Console Expected Logs
```
✓ Firebase SDK loaded successfully
✓ Firestore initialized - admin_sessions collection ready
✓ Session validation complete - user authenticated
✓ Redirecting to dashboard...
```

---

## Rollback Plan (if issues found)
1. Previous working commit: `86aab84` (Firebase auth validation)
2. If deploying this fix causes new issues:
   - Revert commit: `git revert b02fa4a`
   - Push: `git push origin main`
   - Railway will auto-deploy previous version

---

## Issues to Report
If you find issues, note:
- URL accessed
- Expected vs actual behavior
- Browser console error messages (paste full errors)
- Screenshot of blank/incorrect page
- Time when issue occurred
- Device/browser used

---

## Technical Details (For Reference)
**Fix Applied:**
- Express.static now uses `{ index: false }` option
- Prevents auto-serving index.html for directory requests
- Explicit routes handle routing priority
- CSS/JS still served correctly

**Routes Configured:**
- `/admin/` → login.html (explicit GET)
- `/admin/index.html` → index.html (explicit GET with auth)
- `/admin/login.html` → login.html (explicit GET)
- `/admin/*.js`, `/admin/*.css` → static files (express.static)
- `/admin/*` (undefined) → login.html (fallback)
