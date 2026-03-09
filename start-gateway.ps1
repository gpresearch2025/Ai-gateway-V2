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

$port = if ($env:PORT) { $env:PORT } else { "3001" }
Write-Host "Starting AI Gateway on port $port"
npm run dev
