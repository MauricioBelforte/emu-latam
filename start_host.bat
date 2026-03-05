@echo off
title KOF '98 Launcher - All-in-One Startup
echo ==========================================
echo   INICIANDO SERVIDOR Y LANZADOR KOF '98
echo ==========================================

:: 1. Iniciar Nakama con Docker
echo [1/3] Levantando servidor Nakama (Docker)...
cd backend
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo iniciar Docker. Asegurate de que Docker Desktop este abierto.
    pause
    exit /b %errorlevel%
)
cd ..

:: 2. Esperar a que la base de datos este lista
echo [2/3] Esperando 5 segundos para que Nakama se estabilice...
timeout /t 5 /nobreak > nul

:: 3. Iniciar el Launcher (Electron)
echo [3/3] Iniciando el Launcher de Electron...
cd client
npm run dev
