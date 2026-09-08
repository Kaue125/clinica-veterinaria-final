@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONFIGURAR-INICIALIZACAO.ps1"
if errorlevel 1 exit /b 1
echo Docker, backend e Cloudflare Tunnel serao iniciados ao entrar no Windows.
pause
