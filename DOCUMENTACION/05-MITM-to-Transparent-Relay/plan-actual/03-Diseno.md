# 03 - Diseño - Transparent Relay Fix (Plan Actual)

## Arquitectura
```
Host RA → --host :55435 (escucha, tiene estado del juego)
          ↑ pipe TCP
Relay → escucha :55436 → connecta 127.0.0.1:55435
          ↑ pipe TCP
Guest RA → --connect 127.0.0.1:55436 (conecta al relay)
```

## Flujo de Conexión
1. Host RA se lanza con `--host --port 55435` (escucha en 55435)
2. Handler espera a que puerto 55435 esté listo (waitForPort)
3. Relay se lanza: `node mitm-relay.js 55436 127.0.0.1 55435`
4. Guest RA se lanza con `--connect 127.0.0.1 --port 55436`
5. Guest connecta al relay → relay connecta al host
6. Pipe TCP bidireccional: guest ↔ relay ↔ host
7. Host maneja handshake completo, REQ_SAVE, LOAD_SAVE, frame sync, inputs

## Relay (forwarder transparente)
- ~60 líneas, sin lógica de protocolo
- Por cada conexión entrante: connecta al target, pipea bidireccionalmente
- TCP_NODELAY en ambos sockets
- Manejo de errores: ECONNRESET/EPIPE silencioso, otros se loggean
- Cierre: cuando un socket se cierra, destruye el otro

## Configuración
- Usa `retroarch/netplay_optimized.cfg` (sin `netplay_use_mitm_server`)
- `netplay_mitm.cfg` ya no es necesario (queda como referencia histórica)
