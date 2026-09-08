$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'Servidor'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'

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

$tunnel = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if (-not $tunnel) {
  if (-not (Test-Path $cloudflared)) {
    throw "cloudflared não encontrado em $cloudflared."
  }
  Write-Host 'Iniciando túnel HTTPS público...'
  Start-Process -FilePath $cloudflared `
    -ArgumentList 'tunnel --url http://localhost:3001 --no-autoupdate' `
    -WorkingDirectory $server `
    -RedirectStandardOutput (Join-Path $server 'tunnel.log') `
    -RedirectStandardError (Join-Path $server 'tunnel-error.log')
}

Write-Host ''
Write-Host 'VetCare iniciado. Consulte Servidor\tunnel-error.log para ver a URL pública.'
