# API Test Commands pour PowerShell (Windows)

# Configuration
$BASE_URL = "https://salescompanion-production-a34d.up.railway.app"

# =====================================
# 1️⃣ HEALTH CHECK
# =====================================
Write-Host "Testing Health Check..." -ForegroundColor Cyan
Invoke-RestMethod "$BASE_URL/health" -Method Get | ConvertTo-Json


# =====================================
# 2️⃣ CREATE USER
# =====================================
Write-Host "`nCreating User..." -ForegroundColor Cyan

$userBody = @{
    email    = "testuser_$(Get-Random)@example.com"
    name     = "Test User"
    password = "SecurePass123!"
    company  = "Test Company"
    plan     = "free"
} | ConvertTo-Json

$userResponse = Invoke-RestMethod "$BASE_URL/api/users/create" `
    -Method Post `
    -ContentType "application/json" `
    -Body $userBody

$userResponse | ConvertTo-Json
$userToken = $userResponse.token
$userId = $userResponse.id

Write-Host "✅ User Created: ID=$userId" -ForegroundColor Green


# =====================================
# 3️⃣ GET USER PROFILE
# =====================================
Write-Host "`nGetting User Profile..." -ForegroundColor Cyan

Invoke-RestMethod "$BASE_URL/api/users/$userId" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $userToken"} | ConvertTo-Json


# =====================================
# 4️⃣ UPDATE USER PROFILE
# =====================================
Write-Host "`nUpdating User Profile..." -ForegroundColor Cyan

$updateBody = @{
    name    = "Updated Name"
    company = "Updated Corp"
    phone   = "+237 6XX XXXXX"
} | ConvertTo-Json

Invoke-RestMethod "$BASE_URL/api/users/$userId" `
    -Method Put `
    -ContentType "application/json" `
    -Headers @{"Authorization" = "Bearer $userToken"} `
    -Body $updateBody | ConvertTo-Json


# =====================================
# 5️⃣ CREATE COMPANY
# =====================================
Write-Host "`nCreating Company..." -ForegroundColor Cyan

$companyBody = @{
    name           = "ACME Corporation"
    industry       = "Technology"
    location       = "Douala, Cameroon"
    contact_name   = "John Doe"
    contact_email  = "john@acme.com"
    phone          = "+237 6XX XXXXX"
    website        = "www.acme.com"
} | ConvertTo-Json

$companyResponse = Invoke-RestMethod "$BASE_URL/api/companies/create" `
    -Method Post `
    -ContentType "application/json" `
    -Headers @{"Authorization" = "Bearer $userToken"} `
    -Body $companyBody

$companyResponse | ConvertTo-Json
$companyId = $companyResponse.id

Write-Host "✅ Company Created: ID=$companyId" -ForegroundColor Green


# =====================================
# 6️⃣ PERFORM SEARCH
# =====================================
Write-Host "`nPerforming Search..." -ForegroundColor Cyan

$searchBody = @{
    query   = "BTP à Douala"
    filters = @{
        sector = "construction"
        region = "Littoral"
    }
} | ConvertTo-Json

$searchResponse = Invoke-RestMethod "$BASE_URL/api/search" `
    -Method Post `
    -ContentType "application/json" `
    -Headers @{"Authorization" = "Bearer $userToken"} `
    -Body $searchBody

$searchResponse | ConvertTo-Json

Write-Host "✅ Search logged successfully" -ForegroundColor Green


# =====================================
# 7️⃣ ADMIN LOGIN
# =====================================
Write-Host "`nAdmin Login..." -ForegroundColor Cyan

$adminBody = @{
    email    = "admin"
    password = "admin123"
} | ConvertTo-Json

$adminResponse = Invoke-RestMethod "$BASE_URL/admin/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $adminBody

$adminResponse | ConvertTo-Json
$adminToken = $adminResponse.token

Write-Host "✅ Admin logged in successfully" -ForegroundColor Green


# =====================================
# 8️⃣ VIEW ACTIVITY LOGS (Admin only)
# =====================================
Write-Host "`nFetching Activity Logs (Admin)..." -ForegroundColor Cyan

Invoke-RestMethod "$BASE_URL/api/activity-logs" `
    -Method Get `
    -Headers @{"Authorization" = "Bearer $adminToken"} | ConvertTo-Json -Depth 3


Write-Host "`n✅ All tests completed!" -ForegroundColor Green
Write-Host "📊 Check Firestore Collections:" -ForegroundColor Cyan
Write-Host "   • users"
Write-Host "   • companies"
Write-Host "   • activity_logs"
Write-Host "   • search_logs`n"
