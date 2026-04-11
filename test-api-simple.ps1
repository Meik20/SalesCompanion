# Simple API Test Script for PowerShell

$BASE_URL = "https://salescompanion-production-a34d.up.railway.app"

Write-Host "Testing Sales Companion API..." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    Write-Host "DB Ready: $($response.db)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 2: Create User
Write-Host "2. Creating Test User..." -ForegroundColor Cyan
$userData = @{
    email    = "user_$(Get-Random)@test.com"
    name     = "Test User"
    password = "SecurePass123"
    company  = "Test Corp"
    plan     = "free"
} | ConvertTo-Json

try {
    $userResp = Invoke-RestMethod -Uri "$BASE_URL/api/users/create" `
        -Method Post `
        -ContentType "application/json" `
        -Body $userData
    
    Write-Host "User Created: $($userResp.id)" -ForegroundColor Green
    Write-Host "Email: $($userResp.email)" -ForegroundColor Green
    $userToken = $userResp.token
    Write-Host ""
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error: $($err.error)" -ForegroundColor Red
}

# Test 3: Admin Login
Write-Host "3. Testing Admin Login..." -ForegroundColor Cyan
$loginData = @{
    email    = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $adminResp = Invoke-RestMethod -Uri "$BASE_URL/admin/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData
    
    Write-Host "Admin Login Successful" -ForegroundColor Green
    Write-Host "Admin ID: $($adminResp.admin.id)" -ForegroundColor Green
    $adminToken = $adminResp.token
    Write-Host ""
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error: $($err.error)" -ForegroundColor Red
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Check Firestore Collections:" -ForegroundColor Yellow
Write-Host " * users" 
Write-Host " * activity_logs"
Write-Host " * companies"
Write-Host " * search_logs"
