param(
  [string]$EnvFile = ".env"
)

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*$' -or $_ -match '^\s*#') {
      return
    }

    $parts = $_.Split('=', 2)
    if ($parts.Length -eq 2) {
      [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1])
      Set-Item -Path "Env:$($parts[0])" -Value $parts[1]
    }
  }
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

$interval = if ($env:JOB_WORKER_INTERVAL_MS) { $env:JOB_WORKER_INTERVAL_MS } else { "2000" }
Write-Host "Starting AI Gateway worker with interval $interval ms"
npm run dev:worker
