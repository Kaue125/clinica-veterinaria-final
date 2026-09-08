@echo off
title VetCare - Modo Jogo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0MODO-JOGO.ps1"
if errorlevel 1 (
  echo.
  echo Nao foi possivel ativar completamente o modo jogo.
  pause
  exit /b 1
)
echo.
pause
