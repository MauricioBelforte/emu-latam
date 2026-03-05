# Script para preparar el paquete mínimo de RetroArch
$source = "retroarch"
$dest = "KOF98_READY"

echo "=========================================="
echo "   PREPARANDO PACK MINIMO PARA NETPLAY"
echo "=========================================="

if (!(Test-Path $source)) {
    echo "[ERROR] No se encontro la carpeta 'retroarch'. Asegurate de estar en la raiz del proyecto."
    exit
}

# Crear carpetas base
New-Item -ItemType Directory -Force -Path "$dest"
New-Item -ItemType Directory -Force -Path "$dest\cores"
New-Item -ItemType Directory -Force -Path "$dest\roms"
New-Item -ItemType Directory -Force -Path "$dest\system"

# Copiar ejecutable y DLLs esenciales de la raiz
echo "[1/4] Copiando ejecutables y librerias..."
Copy-Item "$source\*.exe" -Destination "$dest"
Copy-Item "$source\*.dll" -Destination "$dest"
Copy-Item "$source\*.cfg" -Destination "$dest"

# Copiar el core de FBNeo
echo "[2/4] Copiando Core (FBNeo)..."
Copy-Item "$source\cores\fbneo_libretro.dll" -Destination "$dest\cores"

# Copiar la ROM y la BIOS (Esencial)
echo "[3/4] Copiando ROM y BIOS..."
Copy-Item "$source\roms\kof98.zip" -Destination "$dest\roms"
if (Test-Path "$source\system\neogeo.zip") {
    Copy-Item "$source\system\neogeo.zip" -Destination "$dest\system"
} elseif (Test-Path "$source\roms\neogeo.zip") {
    Copy-Item "$source\roms\neogeo.zip" -Destination "$dest\system"
    echo "[AVISO] neogeo.zip encontrado en roms, movido a system para mejor compatibilidad."
}

# Copiar carpetas de assets minimos
echo "[4/4] Copiando carpetas de soporte..."
Copy-Item "$source\assets" -Destination "$dest" -Recurse -ErrorAction Ignore
Copy-Item "$source\autoconfig" -Destination "$dest" -Recurse -ErrorAction Ignore

echo "=========================================="
echo "   ¡PACK LISTO EN LA CARPETA '$dest'!"
echo "   Ahora comprimi esa carpeta en un ZIP."
echo "=========================================="
