@echo off
title KOF '98 Launcher - Configuracion de Firewall
echo ==============================================
echo   CONFIGURANDO FIREWALL PARA KOF '98 NETPLAY
echo ==============================================
echo.

:: Verificar permisos de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR CRITICO] Este script necesita permisos de Administrador.
    echo Por favor, haz clic derecho sobre "configurar_red.bat"
    echo y selecciona "Ejecutar como administrador".
    echo.
    pause
    exit /b
)

echo [1/3] Abriendo puerto TCP 55435 para RetroArch (Netplay)...
netsh advfirewall firewall add rule name="KOF98_RetroArch_Netplay" dir=in action=allow protocol=TCP localport=55435 >nul
echo       -^> Regla creada: KOF98_RetroArch_Netplay

echo [2/3] Abriendo puerto TCP 7350 para Nakama Server (API)...
netsh advfirewall firewall add rule name="KOF98_Nakama_Server" dir=in action=allow protocol=TCP localport=7350 >nul
echo       -^> Regla creada: KOF98_Nakama_Server

echo [3/3] Abriendo puerto TCP 7351 para Nakama Server (Consola)...
netsh advfirewall firewall add rule name="KOF98_Nakama_Console" dir=in action=allow protocol=TCP localport=7351 >nul
echo       -^> Regla creada: KOF98_Nakama_Console

echo.
echo ==============================================
echo   ¡FIREWALL CONFIGURADO CON EXITO!
echo   Las conexiones entrantes ahora estan permitidas.
echo ==============================================
echo.
pause
