# Test Weighted QA Scoring
$API_BASE = "http://localhost:3001/api"

# Login
$headers = @{ 'Content-Type' = 'application/json' }
$body = '{"email":"admin@axtra.local","password":"admin123"}'
$login = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Headers $headers -Body $body
$token = $login.data.token
Write-Host "Logged in" -ForegroundColor Green

# Get criteria
$headers = @{ 'Content-Type' = 'application/json'; 'Authorization' = "Bearer $token" }
$criteria = Invoke-RestMethod -Uri "$API_BASE/qa/criteria" -Headers $headers
Write-Host "`nCurrent Criteria:" -ForegroundColor Cyan
$criteria.data | ForEach-Object {
  $type = if ($_.level -eq 0) { "[PARENT]" } else { "  [CHILD]" }
  Write-Host "$type $($_.name) (weight: $($_.weight)%, max: $($_.max_score))"
}
Write-Host ""

# Verify parent weights sum to 100
$parents = $criteria.data | Where-Object { $_.level -eq 0 }
$parentWeightSum = ($parents | Measure-Object -Property weight -Sum).Sum
if ($parentWeightSum -eq 100) {
  Write-Host "Parent Weight Sum: $parentWeightSum% [OK]" -ForegroundColor Green
} else {
  Write-Host "Parent Weight Sum: $parentWeightSum% [Should be 100%]" -ForegroundColor Red
}
