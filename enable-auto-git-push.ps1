# Auto-Git Push Setup Script (Windows PowerShell)
# Usage: .\enable-auto-git-push.ps1

$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptPath

Write-Host "`n🔧 Auto-Git Push Configuration" -ForegroundColor Cyan
Write-Host "=" * 70

# Check if in git repository
if (-not (Test-Path "$RepoRoot\.git")) {
    Write-Host "❌ Not a git repository!" -ForegroundColor Red
    Write-Host "   Run this script from the project root" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Git repository found`n" -ForegroundColor Green

# 1. Enable AUTO_PUSH environment variable (current session)
Write-Host "[1] Setting AUTO_PUSH environment variable..." -ForegroundColor Cyan
$env:AUTO_PUSH = "true"
Write-Host "✅ AUTO_PUSH = true (current session)" -ForegroundColor Green

# 2. Persist AUTO_PUSH for future sessions
Write-Host "`n[2] Saving AUTO_PUSH for future sessions..." -ForegroundColor Cyan
try {
    [Environment]::SetEnvironmentVariable("AUTO_PUSH", "true", "User")
    Write-Host "✅ AUTO_PUSH saved to User environment variables" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not save to User environment (requires admin)" -ForegroundColor Yellow
    Write-Host "   Tip: Manually add AUTO_PUSH=true to your user environment variables" -ForegroundColor Yellow
}

# 3. Create/Update Git Hooks
Write-Host "`n[3] Creating Git hooks..." -ForegroundColor Cyan

$HooksDir = "$RepoRoot\.git\hooks"
if (-not (Test-Path $HooksDir)) {
    New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
}

# Post-commit hook (auto-push)
$PostCommitHook = @"
#!/bin/bash
# Post-commit hook - auto-push after commit

set -e

# Check if AUTO_PUSH is enabled
if [ "`$AUTO_PUSH" = "true" ]; then
    BRANCH=`$(git rev-parse --abbrev-ref HEAD)
    echo "🚀 [Git Hook] Auto-push enabled, pushing to origin/`$BRANCH..."
    if git push origin "`$BRANCH" 2>/dev/null; then
        echo "✅ [Git Hook] Push successful"
    else
        echo "⚠️  [Git Hook] Push failed (network issue or auth required)"
    fi
else
    echo "⏸️  [Git Hook] Auto-push is disabled (set AUTO_PUSH=true to enable)"
fi

exit 0
"@

$PostCommitPath = "$HooksDir\post-commit"
Set-Content -Path $PostCommitPath -Value $PostCommitHook -Encoding UTF8
Write-Host "✅ Post-commit hook created" -ForegroundColor Green

# 4. Test configuration
Write-Host "`n[4] Verifying configuration..." -ForegroundColor Cyan
Write-Host "    AUTO_PUSH = $env:AUTO_PUSH" -ForegroundColor Cyan
Write-Host "    Git  = $(git --version | Out-String)".Trim() -ForegroundColor Cyan
Write-Host "    Branch = $(git rev-parse --abbrev-ref HEAD)" -ForegroundColor Cyan

Write-Host "`n" + "=" * 70
Write-Host "✅ Auto-Git Push is now ENABLED!" -ForegroundColor Green
Write-Host "=" * 70

Write-Host @"

📖 USAGE:

1. Make changes to your files
2. Commit normally:
   git add .
   git commit -m "Your message"
   
   OR use the npm helper:
   npm run git:push "Your message"

3. Changes will automatically push to remote (if AUTO_PUSH=true)

⚙️  CONFIGURATION:

Enable for current session:
  `$env:AUTO_PUSH = "true"

Disable for current session:
  `$env:AUTO_PUSH = "false"

Check status:
  `$env:AUTO_PUSH

💡 AVAILABLE COMMANDS (from server folder):

  npm run git:push "message"        - Commit & push
  npm run git:push:force            - Force commit & push
  npm run git:status                - Show git status
  node auto-git-push.js "message"  - Direct script usage

" -ForegroundColor Cyan

Write-Host "🎉 Setup Complete! Happy coding!`n" -ForegroundColor Green
