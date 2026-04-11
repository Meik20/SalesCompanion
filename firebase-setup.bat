@echo off
REM Firebase + Firestore Quick Setup (5 minutes) - Windows
REM Run this from: SalesCompanion\

color 0A
echo.
echo ========================================
echo Firebase + Firestore Setup (5 minutes)
echo ========================================
echo.

REM ── STEP 1: Firebase Project (2 minutes) ──────────────────────────────────
echo [1/4] Create Firebase Project (2 minutes)
echo ─────────────────────────────────────
echo.
echo Step 1: Open in browser: https://console.firebase.google.com
echo Step 2: Click 'Create Project' or 'Add Project'
echo Step 3: Project name: sales-companion
echo Step 4: Accept all options (default OK)
echo Step 5: Click 'Create' and wait for completion
echo.
echo Copy your PROJECT_ID from the URL:
echo   firebase.google.com/project/^<PROJECT_ID^>
echo.
set /p PROJECT_ID="Enter PROJECT_ID: "

if "%PROJECT_ID%"=="" (
  echo ERROR: PROJECT_ID required
  exit /b 1
)

echo PROJECT_ID: %PROJECT_ID%
echo.

REM ── STEP 2: Service Account Key (1 minute) ────────────────────────────────
echo [2/4] Download Service Account Key (1 minute)
echo ─────────────────────────────────────────────
echo.
echo Step 1: In Firebase Console ^> Settings ^> (gear icon top-left)
echo Step 2: Go to "Service Accounts" tab
echo Step 3: Click "Generate New Private Key"
echo Step 4: A file "%PROJECT_ID%-KEY.json" will download
echo.
pause

echo.
echo Step 5: Copy the downloaded file to this folder:
echo   FROM: Downloads\%PROJECT_ID%-KEY.json
echo   TO:   SalesCompanion\SalesCompanion\serviceAccountKey.json
echo.
echo How to copy (Windows):
echo   - Open File Explorer
echo   - Navigate to Downloads
echo   - Find the JSON file
echo   - Copy it
echo   - Paste in SalesCompanion\SalesCompanion\
echo.
pause

if not exist "serviceAccountKey.json" (
  echo ERROR: serviceAccountKey.json not found in current directory
  echo Please copy the file manually
  exit /b 1
)

echo SUCCESS: serviceAccountKey.json found!
echo.

REM ── STEP 3: Enable Firestore (1 minute) ───────────────────────────────────
echo [3/4] Enable Firestore Database (1 minute)
echo ──────────────────────────────────────────
echo.
echo Step 1: In Firebase Console ^> Firestore Database (left menu)
echo Step 2: Click "Create Database"
echo Step 3: Mode: Start in PRODUCTION
echo Step 4: Location: us-central1 (or closest region)
echo Step 5: Click "Create"
echo.
pause

REM ── STEP 4: Set Security Rules (1 minute) ────────────────────────────────
echo [4/4] Set Security Rules (1 minute)
echo ──────────────────────────────────
echo.
echo Step 1: In Firestore ^> Click "Rules" tab
echo Step 2: Copy the rules from: FIRESTORE-SETUP.md
echo Step 3: Paste them in the Rules editor
echo Step 4: Click "Publish"
echo.
echo Quick rules (paste in Rules tab):
echo.
(
  echo rules_version = '2'^;
  echo service cloud.firestore {
  echo   match /databases/{database}/documents {
  echo     match /{document=**} { allow read, write if request.auth != null; }
  echo   }
  echo }
) > firestore-rules.txt

echo Rules saved to: firestore-rules.txt
echo It's at the root of the SalesCompanion folder
echo.
pause

REM ── Setup Environment ─────────────────────────────────────────────────────
echo.
echo Configuring environment variables...
echo.

if exist ".env" (
  echo Found existing .env - adding Firestore config...
  
  REM Backup old .env
  copy .env .env.backup >nul 2>&1
  
  REM Remove old GOOGLE_APPLICATION_CREDENTIALS line
  for /f "delims=" %%a in (.env) do (
    if not "%%a"=="" (
      echo %%a | findstr /v "GOOGLE_APPLICATION_CREDENTIALS" >>.env.tmp 2>nul
    )
  )
  
  if exist ".env.tmp" move /y .env.tmp .env >nul 2>&1
) else (
  echo Creating new .env file...
)

REM Get current directory (cd returns current path)
for /f %%a in ('cd') do set CURRENT_DIR=%%a

REM Add Firestore configuration
echo. >> .env
echo. >> .env
echo # Firestore Configuration >> .env
echo GOOGLE_APPLICATION_CREDENTIALS=%CURRENT_DIR%\SalesCompanion\serviceAccountKey.json >> .env
echo FIRESTORE_SYNC_ENABLED=true >> .env

echo SUCCESS: .env updated with Firestore config!
echo.

REM ── Final Verification ────────────────────────────────────────────────────
echo.
echo ==========VERIFICATION==========
echo.

if exist "serviceAccountKey.json" (
  echo [OK] serviceAccountKey.json present
) else (
  echo [NO] serviceAccountKey.json NOT FOUND
)

findstr /m "GOOGLE_APPLICATION_CREDENTIALS" .env >nul 2>&1
if %errorlevel%==0 (
  echo [OK] GOOGLE_APPLICATION_CREDENTIALS in .env
) else (
  echo [NO] GOOGLE_APPLICATION_CREDENTIALS NOT in .env
)

findstr /m "FIRESTORE_SYNC_ENABLED" .env >nul 2>&1
if %errorlevel%==0 (
  echo [OK] FIRESTORE_SYNC_ENABLED in .env
) else (
  echo [NO] FIRESTORE_SYNC_ENABLED NOT in .env
)

echo.
echo ==================================
echo NEXT STEPS (Copy and paste these)
echo ==================================
echo.
echo 1. Open PowerShell and run:
echo    cd SalesCompanion\SalesCompanion\server
echo.
echo 2. Install dependencies:
echo    npm install
echo.
echo 3. Start server:
echo    npm start
echo.
echo Expected to see:
echo    ✅ Firestore initialized with GOOGLE_APPLICATION_CREDENTIALS
echo    🚀 Sales Companion Server v2.0 (Firestore)
echo.
echo 4. Test by creating an admin user at:
echo    http://localhost:3311/admin
echo.
echo ==================================
echo ✨ Setup complete! Press any key...
echo ==================================
echo.

pause
