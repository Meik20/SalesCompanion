#!/usr/bin/env pwsh
# Test admin login with Firestore role validation

$API = "http://localhost:3000"
$ADMIN_EMAIL = "admin"
$ADMIN_PASSWORD = "admin123"

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ADMIN LOGIN ROLE VALIDATION TEST      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Test 1: Login with default admin
Write-Host "[1/3] Testing admin login with Firestore role validation..." -ForegroundColor Yellow

try {
    $body = @{
        email = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
    } | ConvertTo-Json

    $response = Invoke-WebRequest `
        -Uri "$API/admin/login" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -ErrorAction Stop

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        
        Write-Host "   ✅ Login successful" -ForegroundColor Green
        Write-Host "   Email: $($data.admin.email)"
        Write-Host "   Role: $($data.admin.role)" -ForegroundColor Cyan
        Write-Host "   Name: $($data.admin.name)"
        Write-Host "   Token: $($data.token.Substring(0, 20))..."
        Write-Host "   Needs password change: $($data.needs_password_change)"
        
        # Validate role
        if ($data.admin.role -eq "admin" -or $data.admin.role -eq "super-admin") {
            Write-Host "   ✅ ROLE VALID: Admin can access panel" -ForegroundColor Green
            $token = $data.token
        } else {
            Write-Host "   ❌ ROLE INVALID: $($data.admin.role)" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   ❌ Status code: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Test /auth/me endpoint with token
Write-Host "[2/3] Testing /auth/me endpoint with JWT token..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest `
        -Uri "$API/auth/me" `
        -Method GET `
        -Headers @{ 
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $token"
        } `
        -ErrorAction Stop

    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        Write-Host "   ✅ Token validation successful" -ForegroundColor Green
        Write-Host "   User: $($data.name)"
        Write-Host "   Plan: $($data.plan)"
        Write-Host "   Remaining searches: $($data.remaining)"
    } else {
        Write-Host "   ❌ Status code: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Test invalid role rejection
Write-Host "[3/3] Testing invalid login (wrong password)..." -ForegroundColor Yellow

try {
    $body = @{
        email = $ADMIN_EMAIL
        password = "wrongpassword"
    } | ConvertTo-Json

    $response = Invoke-WebRequest `
        -Uri "$API/admin/login" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body `
        -ErrorAction Stop

    Write-Host "   ❌ Should have failed but succeeded" -ForegroundColor Red
    exit 1
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        $data = $_.Exception.Response.Content.ToString() | ConvertFrom-Json
        Write-Host "   ✅ Correctly rejected invalid credentials" -ForegroundColor Green
        Write-Host "   Error: $($data.error)"
    } else {
        Write-Host "   ❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ ALL TESTS PASSED                  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
