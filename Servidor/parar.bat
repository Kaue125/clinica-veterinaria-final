@echo off
chcp 65001 >nul
title VetCare — Parando Servidor

echo.
echo  Parando servidor VetCare...
echo.

:: Para o container Docker
docker stop vetcare-evolution >nul 2>&1
docker rm vetcare-evolution >nul 2>&1

:: Mata o processo Node.js na porta 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001"') do (
  taskkill /f /pid %%a >nul 2>&1
)

echo  [OK] Servidor parado com sucesso.
echo.
pause