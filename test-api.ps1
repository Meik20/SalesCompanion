# Test Railway API Endpoints
# Usage: .\test-api.ps1

$BASE_URL = "https://salescompanion-production-a34d.up.railway.app"

Write-Host "🚀 Testing Sales Companion API" -ForegroundColor Green
Write-Host "==========================================`n"

# Test 1: Health Check
Write-Host "1️⃣  Testing Health Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Host "✅ Health Status: $(if($response.db) {'READY'} else {'INITIALIZING'})" -ForegroundColor Green
    Write-Host "   Firestore: $($response.db)"
    Write-Host "   Timestamp: $($response.timestamp)`n"
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
}

# Test 2: Create User
Write-Host "2️⃣  Creating Test User..." -ForegroundColor Cyan
$userData = @{
    email    = "user_$(Get-Random)@test.com"
    name     = "Test User $(Get-Date -Format 'HH:mm:ss')"
    password = "TestPass123!"
    company  = "Test Corp"
    plan     = "free"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/users/create" `
        -Method Post `
        -ContentType "application/json" `
        -Body $userData
    
    Write-Host "✅ User Created Successfully" -ForegroundColor Green
    Write-Host "   ID: $($response.id)"
    Write-Host "   Email: $($response.email)"
    Write-Host "   Name: $($response.name)"
    Write-Host "   Token: $($response.token.Substring(0, 20))...`n"
    
    $testUserId = $response.id
    $testToken = $response.token
} catch {
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "⚠️  User Creation Response: $($errorBody.error)" -ForegroundColor Yellow
}

# Test 3: Create Company (needs auth)
if ($testToken) {
    Write-Host "3️⃣  Creating Test Company..." -ForegroundColor Cyan
    $companyData = @{
        name            = "ACME Corp $(Get-Random)"
        industry        = "Technology"
        location        = "Douala, Cameroon"
        contact_name    = "John Doe"
        contact_email   = "john@acme.com"
        phone           = "+237 6XX XXXXX"
        website         = "www.acme.com"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/companies/create" `
            -Method Post `
            -ContentType "application/json" `
            -Headers @{"Authorization" = "Bearer $testToken"} `
            -Body $companyData
        
        Write-Host "✅ Company Created Successfully" -ForegroundColor Green
        Write-Host "   ID: $($response.id)"
        Write-Host "   Name: $($response.name)"
        Write-Host "   Industry: $($response.industry)"
        Write-Host "   Location: $($response.location)`n"
    } catch {
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "⚠️  Company Creation Response: $($errorBody.error)" -ForegroundColor Yellow
    }
}

# Test 4: Perform Search
if ($testToken) {
    Write-Host "4️⃣  Performing Test Search..." -ForegroundColor Cyan
    $searchData = @{
        query   = "BTP à Douala"
        filters = @{
            sector = "construction"
        }
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/search" `
            -Method Post `
            -ContentType "application/json" `
            -Headers @{"Authorization" = "Bearer $testToken"} `
            -Body $searchData
        
        Write-Host "✅ Search Logged Successfully" -ForegroundColor Green
        Write-Host "   Log ID: $($response.log_id)"
        Write-Host "   Query: $($response.query)"
        Write-Host "   Message: $($response.message)`n"
    } catch {
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "⚠️  Search Response: $($errorBody.error)" -ForegroundColor Yellow
    }
}

# Test 5: Admin Login
Write-Host "5️⃣  Testing Admin Login..." -ForegroundColor Cyan
$loginData = @{
    email    = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/admin/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData
    
    Write-Host "✅ Admin Login Successful" -ForegroundColor Green
    Write-Host "   Admin ID: $($response.admin.id)"
    Write-Host "   Email: $($response.admin.email)"
    Write-Host "   Token: $($response.token.Substring(0, 20))...`n"
} catch {
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "⚠️  Admin Login Response: $($errorBody.error)" -ForegroundColor Yellow
}

Write-Host "==========================================`n"
Write-Host "✅ API Tests Complete!" -ForegroundColor Green
Write-Host "📋 Check Firestore for:" -ForegroundColor Cyan
Write-Host "   • Collection: users"
Write-Host "   • Collection: activity_logs"
Write-Host "   • Collection: companies"
Write-Host "   • Collection: search_logs`n"
