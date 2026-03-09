param(
  [Parameter(Mandatory = $true)][string]$Username,
  [Parameter(Mandatory = $true)][string]$Password,
  [Parameter(Mandatory = $true)][string]$Org,
  [ValidateSet("admin", "member", "auditor")][string]$Role = "member",
  [string]$OrgName = ""
)

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

$args = @("run", "user:create", "--", "--username", $Username, "--password", $Password, "--org", $Org, "--role", $Role)
if ($OrgName) {
  $args += @("--org-name", $OrgName)
}

npm @args
