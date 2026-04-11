# Firebase + Firestore Quick Setup (5 minutes) - PowerShell
# Run: .\firebase-setup.ps1

# Define colors
$Success = "Green"
$Warning = "Yellow"
$ErrorColor = "Red"
$Info = "Cyan"

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host ""
    Write-Host "[$Step]" -ForegroundColor $Info -NoNewline
    Write-Host " $Message" -ForegroundColor White
    Write-Host ("-" * 60)
}

function Write-Check {
    param([string]$Message, [bool]$Passed = $true)
    $symbol = if ($Passed) { "[OK]" } else { "[FAIL]" }
    $color = if ($Passed) { $Success } else { $ErrorColor }
    Write-Host "$symbol $Message" -ForegroundColor $color
}

# ────────────────────────────────────────────────────────────────────────────
# STEP 1: Firebase Project (2 minutes)
# ────────────────────────────────────────────────────────────────────────────

Write-Step "1/4" "Create Firebase Project (2 minutes)"
Write-Host ""
Write-Host "Instructions:" -ForegroundColor $Info

$steps = @(
    "1. Open Browser: https://console.firebase.google.com",
    "2. Click 'Create Project' or 'Add Project'",
    "3. Project name: sales-companion",
    "4. Google Analytics: OFF (not needed)",
    "5. Click 'Create Project'",
    "6. Wait for completion"
)

foreach ($step in $steps) {
    Write-Host "   $step"
}

Write-Host ""
Write-Host "Copy your PROJECT_ID from the URL:" -ForegroundColor $Info
Write-Host "   firebase.google.com/project/<PROJECT_ID>"
Write-Host ""

$ProjectID = Read-Host "Enter PROJECT_ID"

if ([string]::IsNullOrWhiteSpace($ProjectID)) {
    Write-Check "PROJECT_ID is required" $false
    exit 1
}

Write-Check "Project ID: $ProjectID" $true

# ────────────────────────────────────────────────────────────────────────────
# STEP 2: Download Service Account Key (1 minute)
# ────────────────────────────────────────────────────────────────────────────

Write-Step "2/4" "Download Service Account Key (1 minute)"
Write-Host ""
Write-Host "Instructions:" -ForegroundColor $Info

$steps = @(
    "1. In Firebase Console > Settings (top-left gear icon)",
    "2. Go to 'Service Accounts' tab",
    "3. Click 'Generate New Private Key'",
    "4. A JSON file will download: " + "${ProjectID}-key.json"
)

foreach ($step in $steps) {
    Write-Host "   $step"
}

Write-Host ""
Read-Host "Press ENTER when downloaded"

Write-Host ""
Write-Host "Now copy the downloaded file:" -ForegroundColor $Info
Write-Host "   FROM: %USERPROFILE%\Downloads\${ProjectID}-key.json"
Write-Host "   TO:   $(Get-Location)\SalesCompanion\serviceAccountKey.json"
Write-Host ""
Write-Host "How to copy (Windows):" -ForegroundColor $Warning
Write-Host "   1. Open File Explorer (Win+E)"
Write-Host "   2. Navigate to Downloads"
Write-Host "   3. Find: ${ProjectID}-key.json"
Write-Host "   4. Right-click > Copy"
Write-Host "   5. Navigate to: SalesCompanion\SalesCompanion\"
Write-Host "   6. Right-click > Paste"
Write-Host ""

Read-Host "Press ENTER when copied"

# Verify file exists
$keyPath = ".\SalesCompanion\serviceAccountKey.json"

if (Test-Path $keyPath) {
    Write-Check "serviceAccountKey.json found" $true
    $fileSize = (Get-Item $keyPath).Length
    Write-Host "   File size: $($fileSize / 1KB)KB"
} else {
    Write-Check "serviceAccountKey.json NOT found in current directory" $false
    Write-Host "   Expected location: $keyPath"
    Write-Host "   Please copy the file manually"
    exit 1
}

# ────────────────────────────────────────────────────────────────────────────
# STEP 3: Enable Firestore (1 minute)
# ────────────────────────────────────────────────────────────────────────────

Write-Step "3/4" "Enable Firestore Database (1 minute)"
Write-Host ""
Write-Host "Instructions:" -ForegroundColor $Info

$steps = @(
    "1. In Firebase Console > Firestore Database (left menu)",
    "2. Click 'Create Database'",
    "3. Mode: Start in PRODUCTION",
    "4. Location: us-central1 (or closest region)",
    "5. Click 'Create'"
)

foreach ($step in $steps) {
    Write-Host "   $step"
}

Write-Host ""
Read-Host "Press ENTER when created"

# ────────────────────────────────────────────────────────────────────────────
# STEP 4: Set Security Rules (1 minute)
# ────────────────────────────────────────────────────────────────────────────

Write-Step "4/4" "Set Security Rules (1 minute)"
Write-Host ""
Write-Host "Instructions:" -ForegroundColor $Info

$steps = @(
    "1. In Firestore > Click 'Rules' tab",
    "2. Select ALL content (Ctrl+A)",
    "3. Delete it",
    "4. Open file: firestore-rules.txt (in current folder)",
    "5. Copy all content (Ctrl+A > Ctrl+C)",
    "6. Paste in Firestore Rules editor (Ctrl+V)",
    "7. Click 'Publish'"
)

foreach ($step in $steps) {
    Write-Host "   $step"
}

Write-Host ""
Write-Host "Quick reference:" -ForegroundColor $Info
$rulesFile = "./firestore-rules.txt"
if (Test-Path $rulesFile) {
    Write-Host "   File: $rulesFile"
} else {
    Write-Host "   File: $rulesFile (not found)"
}

Write-Host ""
Read-Host "Press ENTER when rules published"

# ────────────────────────────────────────────────────────────────────────────
# SETUP ENVIRONMENT
# ────────────────────────────────────────────────────────────────────────────

Write-Step "5/4" "Configure Environment Variables"
Write-Host ""

$currentDir = Get-Location
$keyPath = "$currentDir\SalesCompanion\serviceAccountKey.json"

# Set environment variable for current session
$env:GOOGLE_APPLICATION_CREDENTIALS = $keyPath
$env:FIRESTORE_SYNC_ENABLED = "true"

Write-Check "Environment variables set for current session" $true
Write-Host "   GOOGLE_APPLICATION_CREDENTIALS=$keyPath"
Write-Host "   FIRESTORE_SYNC_ENABLED=true"

# Method 2: Create/Update .env file
$envPath = ".\SalesCompanion\.env"

if (Test-Path $envPath) {
    Write-Check ".env file found - updating" $true
    
    # Remove Firestore lines if they exist
    $content = (Get-Content $envPath) | Where-Object { $_ -notmatch "^GOOGLE_APPLICATION_CREDENTIALS" } | Where-Object { $_ -notmatch "^FIRESTORE_SYNC_ENABLED" }
    
    # Add new lines
    $content += ""
    $content += "# Firestore Configuration"
    $content += "GOOGLE_APPLICATION_CREDENTIALS=$keyPath"
    $content += "FIRESTORE_SYNC_ENABLED=true"
    
    Set-Content $envPath $content
} else {
    Write-Check ".env file created" $true
    
    $envContent = @"
# PostgreSQL Configuration
# ⚠️  NOT USED - Firestore is the primary database
# DATABASE_URL=postgresql://postgres:password@localhost:5432/sales_companion

# Firestore Configuration
GOOGLE_APPLICATION_CREDENTIALS=$keyPath
FIRESTORE_SYNC_ENABLED=true

# Application Settings
PORT=3000
JWT_SECRET=sc-secret-2025-change-me-in-production
NODE_ENV=development
"@

    Set-Content $envPath $envContent
}

Write-Host "   File: $envPath"

# ────────────────────────────────────────────────────────────────────────────
# VERIFICATION
# ────────────────────────────────────────────────────────────────────────────

Write-Step "VERIFICATION" "Checking setup"
Write-Host ""

# Check serviceAccountKey.json
if (Test-Path $keyPath) {
    Write-Check "serviceAccountKey.json exists" $true
} else {
    Write-Check "serviceAccountKey.json exists" $false
}

# Check .env
if (Test-Path $envPath) {
    Write-Check ".env configured" $true
} else {
    Write-Check ".env configured" $false
}

# Check env variable
if ($env:GOOGLE_APPLICATION_CREDENTIALS) {
    Write-Check "GOOGLE_APPLICATION_CREDENTIALS set" $true
} else {
    Write-Check "GOOGLE_APPLICATION_CREDENTIALS set" $false
}

# ────────────────────────────────────────────────────────────────────────────
# NEXT STEPS
# ────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Step "SUCCESS" "Follow these steps"
Write-Host ""

$nextSteps = @(
    "",
    "1. Navigate to server directory:",
    "   cd SalesCompanion\SalesCompanion\server",
    "",
    "2. Install dependencies:",
    "   npm install",
    "",
    "3. Start the server:",
    "   npm start",
    "",
    "Expected output (wait for this):",
    "   [OK] Firestore initialized with GOOGLE_APPLICATION_CREDENTIALS",
    "   Sales Companion Server v2.0 (Firestore)",
    "",
    "4. Test synchronization:",
    "   - Open: http://localhost:3000/admin",
    "   - Login: admin / admin123",
    "   - Create a test user",
    "   - Check Firebase Console > Firestore > admin_users",
    "   - You should see the new user!",
    "",
    "Full documentation:",
    "   - FIRESTORE-CHECKLIST.md (step-by-step)",
    "   - FIRESTORE-QUICKSTART.md (quick reference)",
    "   - server/FIRESTORE-SETUP.md (detailed guide)",
    ""
)

foreach ($step in $nextSteps) {
    Write-Host $step
}

Write-Host ""
Write-Host ("=" * 60)
Write-Host "Firebase + Firestore setup complete!" -ForegroundColor $Success
Write-Host ("=" * 60)
Write-Host ""

Read-Host "Press ENTER to exit"
