$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'Servidor'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$configFile = Join-Path $root 'sitevetcare\firebase-config.js'

function Wait-Http($url, $timeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return $true }
    } catch {}
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)
  return $false
}

Write-Host 'Iniciando containers da Evolution API...'
docker compose -f (Join-Path $server 'docker-compose.yml') up -d

if (-not (Wait-Http 'http://localhost:8080/manager' 90)) {
  throw 'A Evolution API não respondeu na porta 8080.'
}

$node = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host 'Iniciando backend VetCare...'
  Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $server `
    -RedirectStandardOutput (Join-Path $server 'server.log') `
    -RedirectStandardError (Join-Path $server 'server-error.log')
}

if (-not (Wait-Http 'http://localhost:3001/health' 30)) {
  throw 'O backend VetCare não respondeu na porta 3001.'
}

$tunnelProcess = Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" |
  Where-Object { $_.CommandLine -like '*tunnel --url http://localhost:3001*' }
if (-not $tunnelProcess) {
  if (-not (Test-Path $cloudflared)) {
    throw "cloudflared não encontrado em $cloudflared."
  }
  Write-Host 'Iniciando túnel HTTPS público...'
  Set-Content -Path (Join-Path $server 'tunnel-error.log') -Value '' -Encoding UTF8
  Start-Process -FilePath $cloudflared `
    -ArgumentList 'tunnel --url http://localhost:3001 --no-autoupdate' `
    -WorkingDirectory $server `
    -RedirectStandardOutput (Join-Path $server 'tunnel.log') `
    -RedirectStandardError (Join-Path $server 'tunnel-error.log')
}

Write-Host 'Aguardando URL pública do Cloudflare Tunnel...'
$tunnelUrl = $null
$tunnelLog = Join-Path $server 'tunnel-error.log'
$deadline = (Get-Date).AddSeconds(60)
do {
  if (Test-Path $tunnelLog) {
    $match = Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' |
      Select-Object -Last 1
    if ($match) {
      $tunnelUrl = [regex]::Match($match.Line, 'https://[a-z0-9-]+\.trycloudflare\.com').Value
    }
  }
  if (-not $tunnelUrl) { Start-Sleep -Seconds 2 }
} while (-not $tunnelUrl -and (Get-Date) -lt $deadline)

if (-not $tunnelUrl) {
  throw 'Não foi possível descobrir a URL pública do Cloudflare Tunnel.'
}

Write-Host "URL pública: $tunnelUrl"
$config = Get-Content $configFile -Raw
$updatedConfig = [regex]::Replace(
  $config,
  "backendUrl:\s*'https://[^']*'",
  "backendUrl: '$tunnelUrl'"
)

if ($updatedConfig -ne $config) {
  Set-Content -Path $configFile -Value $updatedConfig -Encoding UTF8
  Push-Location $root
  try {
    git add sitevetcare/firebase-config.js
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
      git commit -m "Atualiza URL pública do backend"
      git push origin main
    }
  } finally {
    Pop-Location
  }
}

Write-Host ''
Write-Host 'VetCare iniciado e URL pública sincronizada com o GitHub.'
