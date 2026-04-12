# ADMIN INITIALIZATION GUIDE

## Problem
The app shows "❌ Invalid credentials" because no admin user exists in Firestore.

## Solution: Initialize Admin

You have 2 options:

### Option 1: Auto-Initialize via HTTP Endpoint (Easiest)

Make a POST request (once, for first-time setup):

```bash
# Using curl
curl -X POST http://localhost:3000/admin/init

# Or from browser console:
fetch('http://localhost:3000/admin/init', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d))
```

**Response:**
```json
{
  "success": true,
  "message": "Admin par défaut créé avec succès",
  "credentials": {
    "username": "admin",
    "password": "admin123",
    "role": "admin"
  }
}
```

Then login with:
- **Username:** `admin`
- **Password:** `admin123`

---

### Option 2: Run Initialization Script

```bash
cd SalesCompanion/server
node init-firestore-admin.js
```

Same result:
- **Username:** `admin`
- **Password:** `admin123`

---

## Verify Admin Created

Check Firebase Console:
1. Go to Firebase Console → Firestore Database
2. Navigate to `admins` collection
3. Should see document `admin` with:
   - `username`: "admin"
   - `password`: (hashed)
   - `role`: "admin"
   - `name`: "Administrator"

---

## After First Login

The admin will be asked to change password:

```
⚠️ Veuillez changer votre mot de passe avant de continuer
```

---

## Add More Admins

To add new admin users, go to Dashboard → Settings and add them there, or manually:

```javascript
// In Firestore Firebase Console:
db.collection('admins').doc('username2').set({
  username: 'username2',
  password: bcrypt.hashSync('password', 10),  // Must be hashed!
  email: 'admin2@example.com',
  name: 'Admin Name',
  role: 'admin',  // or 'moderator', 'manager'
  first_login: true,
  created_at: new Date(),
  active: true
});
```

---

## Valid Roles

Only these roles can login:
- `admin` - Full access
- `moderator` - Moderation features
- `manager` - Management features

Any other role will get:
```
❌ Accès refusé - rôle non autorisé
```

---

## Firestore Structure

```
/admins
  /admin
    - username: "admin"
    - password: "$2a$10$..." (bcrypt hash)
    - email: "admin@salescompanion.local"
    - role: "admin"  ← Must be 'admin', 'moderator', or 'manager'
    - name: "Administrator"
    - first_login: true
    - active: true
    - created_at: 2026-04-12T...
    - updated_at: 2026-04-12T...
    - last_login: null

  /username2
    - ...same structure...
```

---

## Troubleshooting

**Q: Still getting "Invalid credentials" after init?**
- Wait 2-3 seconds for Railway redeploy
- Hard-refresh browser (Ctrl+Shift+R)
- Check browser console for errors (F12)

**Q: How do I know which endpoint is being used?**
- Check server logs for `[POST /admin/init]` message
- Check Firestore Console → admins collection

**Q: Can I change the default password?**
- Not yet - use the "first_login" flow to change it after login
- Or manually update the Firestore document

**Q: What if admin already exists?**
- Endpoint returns: `"Admin déjà initialisé. Impossible de réinitialiser."`
- You must delete the admin document in Firestore to reset

---

## Security Notes

✅ **Good:**
- Passwords are bcrypt hashed
- Roles validated server-side
- JWT tokens expire in 8 hours
- Sessions stored in Firestore (source of truth)

⚠️ **Remember:**
- Never share username/password
- First login requires password change
- Test in production after initialization

---

## Next Steps

1. Initialize admin with Option 1 or 2 above
2. Login with `admin` / `admin123`
3. Change password when prompted
4. Access dashboard
5. Add more users as needed
