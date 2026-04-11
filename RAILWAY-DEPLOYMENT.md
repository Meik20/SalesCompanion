# 🚂 Railway Deployment Guide - SalesCompanion v2.0

**Status**: ✅ Production Ready (Port 3000, Firestore EXCLUSIVE)

---

## 🚀 Quick Deploy (5 minutes)

### Step 1: Prepare Firebase Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firestore project
3. Navigate to **Service Accounts** (left menu → APIs & Services → Credentials)
4. Click **Create Service Account**
5. Download the JSON key file
6. Convert to single-line JSON:
   ```bash
   node -e "console.log(JSON.stringify(require('./SalesCompanion/server/salescompanion-firebase-adminsdk.json')))"
   ```

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### Step 3: Deploy on Railway

1. Go to [Railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repository**
3. Select your repo
4. Wait for build confirmation
5. Go to **Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | `{...full JSON...}` | Paste the JSON from Step 1 |
| `NODE_ENV` | `production` | Required for runtime |
| `JWT_SECRET` | `your-random-string` | Use `openssl rand -base64 32` |
| `PORT` | `3000` | Auto-set by Railway (optional) |

6. Railway automatically deploys on push to `main`

---

## 🔍 Troubleshooting

### ❌ Health Check Failed

**Problem**: "1/1 replicas never became healthy!"  
**Solution**:
1. Check Railway logs: `Railway Dashboard → Logs`
2. Verify `FIREBASE_SERVICE_ACCOUNT` is set correctly
3. Check that the JSON is single-line (no line breaks)
4. Verify healthcheck path is `/health` in `railway.json`

### ❌ Firebase Connection Error

**Problem**: "Firestore initialization error"  
**Solution**:
1. Verify the service account JSON has the right permissions
2. Check Firebase Console → Firestore Database is created
3. Verify Firestore Security Rules allow the service account

### ❌ Port Already in Use

**Problem**: "Could not bind to port 3000"  
**Solution**: Railway sets `PORT` automatically. Do NOT change the port number.

---

## 📊 Monitoring

### View Real-time Logs

```bash
# In Railway Dashboard:
→ Select your service
→ Click "Logs" tab
→ Filter by "Error" or "Failed"
```

### Health Endpoint

```bash
curl https://your-railway-domain.up.railway.app/health
# Expected response:
# {"status":"ok","db":true,"time":"2026-04-11T..."}
```

### Admin Panel

```
https://your-railway-domain.up.railway.app/admin
Login: admin / admin123
⚠️ CHANGE PASSWORD ON FIRST LOGIN
```

---

## 🔐 Security Checklist

- ✅ FIREBASE_SERVICE_ACCOUNT set as environment variable (NOT in code)
- ✅ salescompanion-firebase-adminsdk.json in `.gitignore`
- ✅ JWT_SECRET is a strong random string
- ✅ Firestore Security Rules are configured
- ✅ Admin default password changed immediately
- ✅ HTTPS enabled (automatic on Railway)

---

## 🌐 Custom Domain

1. In Railway: **Settings** → **Custom Domain**
2. Add your domain (e.g., `sales.example.com`)
3. Update DNS records (Railway provides CNAME)
4. Wait 10-30 minutes for propagation

---

## 📈 Architecture

```
┌─────────────────────┐
│   GitHub (main)     │
└──────────┬──────────┘
           │ (push trigger)
           ▼
┌─────────────────────┐
│ Railway Build       │
│ (Dockerfile parsing)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Node.js Runtime     │
│ (Port 3000)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Google Cloud        │
│ Firestore Database  │
└─────────────────────┘
```

---

## 📝 Environment-Specific Notes

### Development
- Use local `.env` file
- Load Firebase from `salescompanion-firebase-adminsdk.json`
- Port: 3000 (or any available)
- Database: Firestore (same production instance for testing)

### Production (Railway)
- Use Railway Variables interface
- FIREBASE_SERVICE_ACCOUNT via environment variable
- Port: Auto-set to 3000
- Database: Google Cloud Firestore (required)
- Healthcheck: `/health` endpoint

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `railway.json` | Railway build config (healthcheck, startup) |
| `Procfile` | Process commands (web dyno setup) |
| `Dockerfile` | Docker build instructions |
| `.env.example` | Documentation of env vars |
| `.gitignore` | Exclude Firebase credentials |

---

## 🆘 Getting Help

1. Check Railway logs first
2. Verify environment variables are set
3. Test locally: `cd SalesCompanion/server && npm start`
4. Enable DEBUG mode in Railway Variables: `DEBUG=true`

---

**Deployed with ❤️ on Railway**
