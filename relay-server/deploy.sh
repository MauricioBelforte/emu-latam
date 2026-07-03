#!/bin/bash

# Script de despliegue para el Relay Server en Fly.io
# Requiere tener instalado flyctl y haber iniciado sesión con 'fly auth login'

echo "--- Iniciando despliegue de Emu Latam Relay Server ---"

# Verificar si flyctl está instalado
if ! command -v flyctl &> /dev/null
then
    echo "Error: flyctl no está instalado. Visita https://fly.io/docs/hands-on/install-flyctl/"
    exit
fi

# Intentar desplegar
flyctl deploy --remote-only

echo "--- Despliegue finalizado ---"
echo "Asegúrate de configurar el registro DNS o usar la IP provista por Fly.io en el Backend de Nakama."
