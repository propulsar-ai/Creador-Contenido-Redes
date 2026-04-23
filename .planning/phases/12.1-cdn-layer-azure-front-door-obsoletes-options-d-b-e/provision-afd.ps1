# Phase 12.1-01 Task 1 - Azure Front Door Standard provisioning
# Idempotent - safe to re-run. Writes evidence to provision-afd-output.json.
# ASCII-only for Windows PowerShell 5.1 compatibility (default CP1252 loader).

$ErrorActionPreference = "Continue"
$ProgressPreference    = "SilentlyContinue"

$SUBSCRIPTION   = "26656554-4a6e-496b-a94d-0f7ef8b9b990"
$RG             = "propulsar-production"
$PROFILE_NAME   = "propulsar-content-afd"
$ENDPOINT       = "propulsarcontent"
$ORIGIN_GROUP   = "propulsarcontent-origin-group"
$ORIGIN         = "propulsarcontent-origin"
$ROUTE          = "propulsarcontent-route"
$ORIGIN_HOST    = "propulsarcontent.blob.core.windows.net"
$OUT_FILE       = Join-Path $PSScriptRoot "provision-afd-output.json"

function Say($msg)  { Write-Host ("[" + (Get-Date -Format 'HH:mm:ss') + "] " + $msg) -ForegroundColor Cyan }
function Ok($msg)   { Write-Host ("  OK  : " + $msg)  -ForegroundColor Green }
function Warn2($msg){ Write-Host ("  WARN: " + $msg)  -ForegroundColor Yellow }
function Err2($msg) { Write-Host ("  ERR : " + $msg)  -ForegroundColor Red }

Say "Setting subscription..."
az account set --subscription $SUBSCRIPTION | Out-Null
if ($LASTEXITCODE -ne 0) {
    Err2 "az account set failed. Run 'az login' first."
    exit 1
}
$acct = az account show --query "{name:name, id:id, user:user.name}" -o json | ConvertFrom-Json
Ok ("Active: " + $acct.name + " (" + $acct.id + ") as " + $acct.user)

Say "Step 1/6 - Create AFD profile $PROFILE_NAME (Standard)..."
az afd profile create --profile-name $PROFILE_NAME --resource-group $RG --sku Standard_AzureFrontDoor 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) {
    Warn2 "profile create returned non-zero - may already exist, continuing"
}
Ok "Profile step done"

Say "Step 2/6 - Create endpoint $ENDPOINT..."
az afd endpoint create --resource-group $RG --endpoint-name $ENDPOINT --profile-name $PROFILE_NAME --enabled-state Enabled 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) {
    Warn2 "endpoint create returned non-zero - may already exist, continuing"
}

$HOSTNAME_AFD = az afd endpoint show --resource-group $RG --profile-name $PROFILE_NAME --name $ENDPOINT --query hostName -o tsv
if (-not $HOSTNAME_AFD) {
    Err2 "Could not retrieve endpoint hostname"
    exit 1
}
Ok ("Endpoint hostname: " + $HOSTNAME_AFD)

Say "Step 3/6 - Create origin group $ORIGIN_GROUP..."
az afd origin-group create `
    --resource-group $RG `
    --origin-group-name $ORIGIN_GROUP `
    --profile-name $PROFILE_NAME `
    --probe-request-type HEAD `
    --probe-protocol Https `
    --probe-path / `
    --probe-interval-in-seconds 120 `
    --sample-size 4 `
    --successful-samples-required 3 `
    --additional-latency-in-milliseconds 50 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) {
    Warn2 "origin-group create returned non-zero - may already exist, continuing"
}
Ok "Origin group step done"

Say "Step 4/6 - Create origin $ORIGIN -> $ORIGIN_HOST..."
az afd origin create `
    --resource-group $RG `
    --origin-group-name $ORIGIN_GROUP `
    --profile-name $PROFILE_NAME `
    --origin-name $ORIGIN `
    --host-name $ORIGIN_HOST `
    --origin-host-header $ORIGIN_HOST `
    --http-port 80 `
    --https-port 443 `
    --priority 1 `
    --weight 1000 `
    --enabled-state Enabled 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) {
    Warn2 "origin create returned non-zero - may already exist, continuing"
}
Ok "Origin step done"

Say "Step 5/6 - Create route $ROUTE (HTTPS only, linked to origin group)..."
az afd route create `
    --resource-group $RG `
    --profile-name $PROFILE_NAME `
    --endpoint-name $ENDPOINT `
    --route-name $ROUTE `
    --origin-group $ORIGIN_GROUP `
    --supported-protocols Https `
    --https-redirect Enabled `
    --forwarding-protocol HttpsOnly `
    --link-to-default-domain Enabled `
    --patterns-to-match "/*" `
    --query-string-caching-behavior IgnoreQueryString `
    --enabled-state Enabled 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) {
    Warn2 "route create returned non-zero - may already exist, continuing"
}
Ok "Route step done"

Say "Step 6/6 - Waiting 30s for AFD config propagation..."
Start-Sleep -Seconds 30

$profileJson  = az afd profile  show --resource-group $RG --profile-name $PROFILE_NAME -o json 2>$null | ConvertFrom-Json
$endpointJson = az afd endpoint show --resource-group $RG --profile-name $PROFILE_NAME --name $ENDPOINT -o json 2>$null | ConvertFrom-Json
$ogJson       = az afd origin-group show --resource-group $RG --profile-name $PROFILE_NAME --origin-group-name $ORIGIN_GROUP -o json 2>$null | ConvertFrom-Json
$originJson   = az afd origin     show --resource-group $RG --profile-name $PROFILE_NAME --origin-group-name $ORIGIN_GROUP --origin-name $ORIGIN -o json 2>$null | ConvertFrom-Json
$routeJson    = az afd route      show --resource-group $RG --profile-name $PROFILE_NAME --endpoint-name $ENDPOINT --route-name $ROUTE -o json 2>$null | ConvertFrom-Json

$result = [PSCustomObject]@{
    timestamp_utc         = (Get-Date).ToUniversalTime().ToString("o")
    subscription          = $SUBSCRIPTION
    resource_group        = $RG
    profile_name          = $PROFILE_NAME
    profile_sku           = $profileJson.sku.name
    profile_state         = $profileJson.provisioningState
    endpoint_name         = $ENDPOINT
    endpoint_host         = $HOSTNAME_AFD
    endpoint_state        = $endpointJson.provisioningState
    origin_group          = $ORIGIN_GROUP
    origin_group_state    = $ogJson.provisioningState
    origin_name           = $ORIGIN
    origin_host           = $ORIGIN_HOST
    origin_state          = $originJson.provisioningState
    route_name            = $ROUTE
    route_state           = $routeJson.provisioningState
    route_protocols       = ($routeJson.supportedProtocols -join ",")
    route_patterns        = ($routeJson.patternsToMatch -join ",")
    route_origin_group_id = $routeJson.originGroup.id
}

$result | ConvertTo-Json -Depth 5 | Out-File -FilePath $OUT_FILE -Encoding utf8
Ok ("Evidence saved to: " + $OUT_FILE)

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host (" AFD ENDPOINT HOSTNAME: " + $HOSTNAME_AFD) -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
