$ErrorActionPreference = 'Stop'

$server = $PSScriptRoot
$composeFile = Join-Path $server 'docker-compose.yml'
$startupShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'VetCare - iniciar servidores.lnk'

Write-Host 'Encerrando backend VetCare...'
$nodeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*$server*" }
foreach ($process in $nodeProcesses) {
  Stop-Process -Id $process.ProcessId -Force
}

Write-Host 'Encerrando Cloudflare Tunnel...'
$tunnels = Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" |
  Where-Object { $_.CommandLine -like '*tunnel --url http://localhost:3001*' }
foreach ($tunnel in $tunnels) {
  Stop-Process -Id $tunnel.ProcessId -Force
}

Write-Host 'Parando Evolution API e banco de dados...'
docker compose -f $composeFile down

if (Test-Path $startupShortcut) {
  Remove-Item -Path $startupShortcut -Force
}

Write-Host ''
Write-Host 'Modo jogo ativado. Os servicos do VetCare nao iniciarao automaticamente.'
Write-Host 'Para reativar, execute REATIVAR-VETCARE.bat.'
