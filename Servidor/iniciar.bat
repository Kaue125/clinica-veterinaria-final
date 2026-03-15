@echo off
chcp 65001 >nul
title VetCare — Servidor WhatsApp

echo.
echo  VetCare — Servidor WhatsApp Automatico
echo  =======================================
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERRO] Node.js nao encontrado!
  echo Acesse https://nodejs.org e instale a versao LTS.
  pause & exit /b 1
)

echo [1/2] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
  echo [ERRO] Falha ao instalar. Verifique sua conexao.
  pause & exit /b 1
)
echo [OK] Dependencias instaladas
echo.
echo [2/2] Iniciando servidor...
echo.
echo  =========================================
echo   Aguarde 30-60 segundos para inicializar
echo   Depois acesse: http://localhost:3001/setup
echo   e escaneie o QR Code com o WhatsApp
echo  =========================================
echo.
echo  NAO feche esta janela!
echo.

timeout /t 2 /nobreak >nul
start http://localhost:3001/setup

node server.js
pause