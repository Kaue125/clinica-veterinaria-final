@echo off
title VetCare - Reativar servicos
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONFIGURAR-INICIALIZACAO.ps1"
if errorlevel 1 (
  echo.
  echo Nao foi possivel configurar a inicializacao automatica.
  pause
  exit /b 1
)
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INICIAR-VETCARE.ps1"
echo.
echo Servicos reativados. Aguarde alguns segundos para o backend e o tunel iniciarem.
pause
