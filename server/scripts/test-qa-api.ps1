# QA Criteria API Test Script
# Run: powershell -ExecutionPolicy Bypass -File server/scripts/test-qa-api.ps1

$API_BASE = "http://localhost:3001/api"
$token = $null

function Login {
    Write-Host "=== Step 1: Login ===" -ForegroundColor Cyan
    $headers = @{ 'Content-Type' = 'application/json' }
    $body = '{"email":"admin@axtra.local","password":"admin123"}'
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method POST -Headers $headers -Body $body
        if ($response.success) {
            $script:token = $response.data.token
            Write-Host "✅ Login successful" -ForegroundColor Green
            Write-Host "   Token: $($script:token.Substring(0, 20))..." -ForegroundColor Gray
        } else {
            Write-Host "❌ Login failed" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

function Get-Criteria {
    Write-Host "=== Step 2: Get Current Criteria ===" -ForegroundColor Cyan
    $headers = @{ 
        'Content-Type' = 'application/json'
        'Authorization' = "Bearer $script:token"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/qa/criteria" -Headers $headers
        Write-Host "✅ Found $($response.data.Count) criteria" -ForegroundColor Green
        $response.data | ForEach-Object {
            $level = if ($_.level -eq 0) { "PARENT" } else { "CHILD " }
            Write-Host "   [$level] $($_.name) (id=$($_.id), score=$($_.scoring_type)/$($_.max_score), weight=$($_.weight)%)" -ForegroundColor Gray
        }
        return $response.data
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        return @()
    }
    Write-Host ""
}

function Save-Criteria {
    param($Criteria)
    Write-Host "=== Step 3: Save New Criteria ===" -ForegroundColor Cyan
    $headers = @{ 
        'Content-Type' = 'application/json'
        'Authorization' = "Bearer $script:token"
    }
    
    $body = @{
        criteria = $Criteria
        removed_ids = @()
    } | ConvertTo-Json -Depth 5
    
    Write-Host "   Sending request..." -ForegroundColor Gray
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/qa/criteria/bulk" -Method POST -Headers $headers -Body $body
        if ($response.success) {
            Write-Host "✅ $($response.message)" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed: $($response.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
    Write-Host ""
}

function Delete-Criteria {
    param($CriteriaId)
    Write-Host "=== Step 4: Delete Criteria ===" -ForegroundColor Cyan
    $headers = @{ 
        'Content-Type' = 'application/json'
        'Authorization' = "Bearer $script:token"
    }
    
    try {
        Invoke-RestMethod -Uri "$API_BASE/qa/criteria/$CriteriaId" -Method DELETE -Headers $headers | Out-Null
        Write-Host "✅ Deleted $CriteriaId" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Main Test Flow
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "  QA Criteria V2 API Test" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host ""

# Step 1: Login
Login

# Step 2: Get existing criteria
$existing = Get-Criteria

# Step 3: Create a new criteria
$newCriteria = @{
    id = "qc_test_$(Get-Random -Minimum 10000 -Maximum 99999)"
    name = "Browser Test Criteria"
    description = "Testing criteria creation via API"
    ai_prompt = "Evaluate if the operator greeted the customer warmly and professionally within the first 30 seconds."
    scoring_type = "scale"
    max_score = 5
    weight = 0
    is_required = $true
    sort_order = 0
}

Save-Criteria -Criteria @($newCriteria)

# Step 4: Verify it was saved
Write-Host "=== Step 4: Verify Saved Criteria ===" -ForegroundColor Cyan
$updated = Get-Criteria
$newlyCreated = $updated | Where-Object { $_.id -eq $newCriteria.id }
if ($newlyCreated) {
    Write-Host "✅ Criteria found in database!" -ForegroundColor Green
    Write-Host "   Created: $($newlyCreated.name)" -ForegroundColor Gray
    Write-Host "   With leaf child: $($updated | Where-Object { $_.parent_criteria_id -eq $newCriteria.id } | Select-Object -ExpandProperty id)" -ForegroundColor Gray
} else {
    Write-Host "❌ Criteria not found after save" -ForegroundColor Red
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "  Test Complete!" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
