$token = ""

# Test login
$loginPayload = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Testing login endpoint..."
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/admin/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $loginPayload `
        -UseBasicParsing

    Write-Host "Login response:" -ForegroundColor Green
    $loginResponse.Content | ConvertFrom-Json | Format-List
    
    $token = ($loginResponse.Content | ConvertFrom-Json).token
    Write-Host "Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: $($_)" -ForegroundColor Red
}

# Test accessing admin panel
if ($token) {
    Write-Host "`nTesting admin access..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/admin/" `
            -Headers @{"Authorization"="Bearer $token"} `
            -UseBasicParsing
        
        Write-Host "Admin panel accessible: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "Cannot access admin panel: $($_)" -ForegroundColor Yellow
    }
}
