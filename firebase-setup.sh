#!/bin/bash
# Firebase + Firestore Quick Setup (5 minutes)
# Run: chmod +x firebase-setup.sh && ./firebase-setup.sh

echo "🔥 Firebase + Firestore Setup (5 minutes)"
echo "=========================================="
echo ""

# ── STEP 1: Firebase Project (2 minutes) ──────────────────────────────────
echo "⏱️  STEP 1/4: Create Firebase Project (2 minutes)"
echo "───────────────────────────────────────────────"
echo ""
echo "1️⃣  Open in browser: https://console.firebase.google.com"
echo "2️⃣  Click 'Create Project' or 'Add Project'"
echo "3️⃣  Project name: sales-companion"
echo "4️⃣  Accept all options (default OK)"
echo "5️⃣  Click 'Create' → Wait for completion"
echo ""
echo "⏳ PRESS ENTER when done, then copy your PROJECT_ID"
echo "   (You can see it in URL: firebase.google.com/project/<PROJECT_ID>)"
read -p "Enter PROJECT_ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
  echo "❌ PROJECT_ID required"
  exit 1
fi

echo "✅ Project ID: $PROJECT_ID"
echo ""

# ── STEP 2: Service Account Key (1 minute) ────────────────────────────────
echo "⏱️  STEP 2/4: Download Service Account Key (1 minute)"
echo "─────────────────────────────────────────────────────"
echo ""
echo "1️⃣  In Firebase Console → Settings ⚙️ (top-left gear icon)"
echo "2️⃣  Go to 'Service Accounts' tab"
echo "3️⃣  Click 'Generate New Private Key'"
echo "4️⃣  A file 'PROJECT_ID-KEY.json' will download"
echo ""
read -p "⏳ PRESS ENTER when downloaded"
echo ""

# ── STEP 3: Copy Key File ─────────────────────────────────────────────────
echo "Now, copy the downloaded file to project:"
echo ""
echo "📁 FROM: ~/Downloads/[PROJECT_ID-KEY.json]"
echo "📁 TO:   SalesCompanion/SalesCompanion/serviceAccountKey.json"
echo ""
echo "How to copy:"
echo "  Windows: Right-click file → Copy → Paste in SalesCompanion/"
echo "  Mac/Linux: cp ~/Downloads/*-key.json ./serviceAccountKey.json"
echo ""
read -p "⏳ PRESS ENTER when copied"
echo ""

# Verify file exists
if [ -f "serviceAccountKey.json" ]; then
  echo "✅ serviceAccountKey.json found!"
else
  echo "❌ serviceAccountKey.json not found in current directory"
  echo "Please copy the file manually to: $(pwd)/serviceAccountKey.json"
  exit 1
fi

# ── STEP 4: Enable Firestore (1 minute) ───────────────────────────────────
echo "⏱️  STEP 3/4: Enable Firestore Database (1 minute)"
echo "──────────────────────────────────────────────────"
echo ""
echo "1️⃣  In Firebase Console → Firestore Database (left menu)"
echo "2️⃣  Click 'Create Database'"
echo "3️⃣  Mode: Start in PRODUCTION"
echo "4️⃣  Location: us-central1 (or closest to you)"
echo "5️⃣  Click 'Create'"
echo ""
read -p "⏳ PRESS ENTER when created"
echo ""

# ── STEP 5: Set Security Rules ────────────────────────────────────────────
echo "⏱️  STEP 4/4: Set Security Rules (1 minute)"
echo "───────────────────────────────────────────"
echo ""
echo "1️⃣  In Firestore → Click 'Rules' tab"
echo "2️⃣  Replace ALL content with:"
echo ""
cat << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin data - Protected
    match /admin_config/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /admin_users/{userId} {
      allow read, write: if request.auth == null || request.auth.uid == userId;
    }
    match /admin_companies/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /admin_import_logs/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /admin_stats/{document=**} {
      allow read, write: if request.auth != null;
    }
    // User data
    match /users/{userId} {
      allow read, write: if request.auth == null || request.auth.uid == userId;
    }
    match /usage_logs/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /saved_searches/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /pipeline/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /companies/{companyId} {
      allow read: if request.auth != null;
    }
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
EOF
echo ""
echo "3️⃣  Click 'Publish'"
echo ""
read -p "⏳ PRESS ENTER when rules published"
echo ""

# ── SETUP ENVIRONMENT ──────────────────────────────────────────────────────
echo "✅ Firebase Setup Complete!"
echo ""
echo "Now configuring environment variables..."
echo ""

# Create/Update .env file
if [ -f ".env" ]; then
  echo "Found existing .env - adding Firestore config..."
  
  # Remove old GOOGLE_APPLICATION_CREDENTIALS if exists
  sed -i.bak '/GOOGLE_APPLICATION_CREDENTIALS/d' .env
  
  echo "GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/serviceAccountKey.json" >> .env
  echo "FIRESTORE_SYNC_ENABLED=true" >> .env
else
  echo "Creating .env file..."
  cat > .env << ENVFILE
# PostgreSQL Configuration
# ⚠️  NOT USED - Firestore is the primary database
# DATABASE_URL=postgresql://postgres:password@localhost:5432/sales_companion

# Firestore
GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/serviceAccountKey.json
FIRESTORE_SYNC_ENABLED=true

# Application
PORT=3000
JWT_SECRET=sc-secret-2025-change-me
NODE_ENV=development
ENVFILE
fi

echo "✅ .env updated with Firestore config"
echo ""

# ── FINAL VERIFICATION ─────────────────────────────────────────────────────
echo "🧪 VERIFICATION"
echo "───────────────"
echo ""

if [ -f "serviceAccountKey.json" ]; then
  echo "✅ serviceAccountKey.json present"
else
  echo "❌ serviceAccountKey.json NOT FOUND"
fi

if grep -q "GOOGLE_APPLICATION_CREDENTIALS" .env; then
  echo "✅ GOOGLE_APPLICATION_CREDENTIALS configured in .env"
else
  echo "⚠️  GOOGLE_APPLICATION_CREDENTIALS not in .env"
fi

echo ""
echo ""
echo "🚀 NEXT STEPS:"
echo "─────────────"
echo ""
echo "1️⃣  Navigate to server directory:"
echo "   cd server"
echo ""
echo "2️⃣  Install dependencies:"
echo "   npm install"
echo ""
echo "3️⃣  Start the server:"
echo "   npm start"
echo ""
echo "Expected output:"
echo "  ✅ Firestore initialized with GOOGLE_APPLICATION_CREDENTIALS"
echo "  🚀 Sales Companion Server v2.0 (Firestore)"
echo ""
echo "4️⃣  Test synchronization by creating an admin user"
echo ""
echo "=========================================="
echo "✨ Firebase + Firestore setup complete!"
echo "=========================================="
