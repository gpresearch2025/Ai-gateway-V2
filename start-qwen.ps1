param(
  [string]$Model = "Qwen/Qwen2.5-VL-3B-Instruct",
  [int]$Port = 8000,
  [string]$Host = "127.0.0.1",
  [string]$ApiKey = "",
  [string]$ExtraArgs = ""
)

$vllm = Get-Command vllm -ErrorAction SilentlyContinue
if (-not $vllm) {
  Write-Error "vLLM is not installed or not on PATH. Install it first, then rerun this script."
  exit 1
}

$arguments = @(
  "serve"
  $Model
  "--host", $Host
  "--port", $Port
)

if ($ApiKey) {
  $arguments += @("--api-key", $ApiKey)
}

if ($ExtraArgs) {
  $arguments += $ExtraArgs -split "\s+"
}

Write-Host "Starting local Qwen runtime..."
Write-Host "Model: $Model"
Write-Host "Endpoint: http://${Host}:$Port/v1"
Write-Host "Command: vllm $($arguments -join ' ')"

& $vllm.Source @arguments
