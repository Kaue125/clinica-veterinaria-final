$ErrorActionPreference = 'Stop'
$startup = [Environment]::GetFolderPath('Startup')
$script = Join-Path $PSScriptRoot 'INICIAR-VETCARE.ps1'
$shortcutPath = Join-Path $startup 'VetCare - iniciar servidores.lnk'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = 'Inicia Docker, Evolution, backend e Cloudflare Tunnel do VetCare'
$shortcut.Save()

Write-Host "Inicializacao configurada em: $shortcutPath"
