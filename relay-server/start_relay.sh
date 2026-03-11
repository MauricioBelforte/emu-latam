#!/bin/bash

# start_relay.sh - Emu Latam V2
# Inicia el servidor MITM y el túnel de Playit.gg

echo "--- Iniciando Servidor Relay MITM (Puerto 55435 UDP) ---"
./netplay_mitm_server 55435 &
MITM_PID=$!

echo "--- Iniciando Agente Playit.gg ---"
echo "Si es la primera vez, busca el enlace 'claim' abajo para vincular tu cuenta."
echo "--------------------------------------------------------------------------"

# Ejecutamos playit. 
# --secret puede ser pasado como variable de entorno si ya se tiene.
if [ -z "$PLAYIT_SECRET" ]; then
    ./playit
else
    ./playit --secret "$PLAYIT_SECRET"
fi

# Al cerrar playit, matamos el servidor mitm
kill $MITM_PID
