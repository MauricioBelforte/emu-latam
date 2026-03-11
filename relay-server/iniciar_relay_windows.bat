@echo off
title Emu Latam - Lanzador de Tunel BORE
echo ==========================================
echo    BIENVENIDO AL CONFIGURADOR BORE
echo ==========================================
echo.
echo [DEBUG] Verificando archivos...
if exist bore.exe (
    echo [OK] bore.exe encontrado.
) else (
    echo [ERROR] bore.exe NO ENCONTRADO.
    pause
    exit
)

echo.
echo Presiona una tecla para LANZAR EL TUNEL...
pause

echo.
echo [INFO] Iniciando Tunel de BORE...
echo.
bore local 55435 --to bore.pub

echo.
echo [SISTEMA] Si ves este mensaje, Bore dejo de funcionar o se cerro.
pause
