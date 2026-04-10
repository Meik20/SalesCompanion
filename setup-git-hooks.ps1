# Git Hooks Setup for Windows
# Usage: .\setup-git-hooks.ps1

Write-Host "`n[Git Hooks Setup]" -ForegroundColor Cyan
Write-Host "=" * 60

$repoRoot = Get-Location
$hooksDir = Join-Path $repoRoot ".git/hooks"

# Check if .git directory exists
if (-not (Test-Path ".git")) {
    Write-Host "[FAIL] Not a git repository!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Git repository found"
Write-Host ""

# Create post-merge hook
$postMergeContent = @'
@echo off
REM Post-merge hook - runs after git pull

echo [Git Hook] Post-merge detected
echo [*] Auto-committing changes...

git add -A 2>nul
git diff-index --quiet --cached HEAD 2>nul
if %ERRORLEVEL% neq 0 (
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
    git commit -m "Auto-commit after merge: !mydate! !mytime!" 2>nul
    echo [OK] Changes auto-committed
)
'@

$postMergePath = Join-Path $hooksDir "post-merge"
Set-Content -Path $postMergePath -Value $postMergeContent
Write-Host "[OK] Post-merge hook installed"

# Create post-commit hook for auto-push
$postCommitContent = @'
@echo off
REM Post-commit hook - runs after every commit

if "%AUTO_PUSH%"=="true" (
    echo [Git Hook] Auto-push enabled, pushing to remote...
    git push origin HEAD 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [WARN] Push failed
    )
)
'@

$postCommitPath = Join-Path $hooksDir "post-commit"
Set-Content -Path $postCommitPath -Value $postCommitContent
Write-Host "[OK] Post-commit hook installed"

# Create pre-commit hook
$preCommitContent = @'
@echo off
REM Pre-commit hook - runs before commit

echo [Git Hook] Pre-commit checks...
REM Add any validation here
'@

$preCommitPath = Join-Path $hooksDir "pre-commit"
Set-Content -Path $preCommitPath -Value $preCommitContent
Write-Host "[OK] Pre-commit hook installed"

Write-Host ""
Write-Host "=" * 60
Write-Host "Git hooks have been installed!" -ForegroundColor Green
Write-Host "=" * 60
Write-Host ""

Write-Host "To enable auto-push:" -ForegroundColor Yellow
Write-Host '  $env:AUTO_PUSH="true"' 
Write-Host ""

Write-Host "To disable auto-push:" -ForegroundColor Yellow
Write-Host '  $env:AUTO_PUSH="false"'
Write-Host ""

Write-Host "Or set it permanently in your PowerProfile:" -ForegroundColor Gray
Write-Host '  [Environment]::SetEnvironmentVariable("AUTO_PUSH", "true", "User")'
Write-Host ""
