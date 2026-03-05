@echo off
title KOF '98 Launcher - Modo Cliente
echo ==========================================
echo   INICIANDO LANZADOR KOF '98 (CLIENTE)
echo ==========================================
echo.
echo Conectando al Modo Cliente...
echo (Asegurate de haber configurado tu archivo .env con la IP de tu amigo)
echo.

cd client
npm run dev
