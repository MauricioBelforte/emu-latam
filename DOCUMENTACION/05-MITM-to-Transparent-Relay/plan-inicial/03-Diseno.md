# 03 - Diseño - MITM Relay Node.js (Plan Inicial)

## Arquitectura
```
Master RA → --connect 127.0.0.1 → relay:55435 ← --connect 127.0.0.1 ← Guest RA
```

## Estados del Relay (por conexión)
```
ST_MITM_ID (0)   → espera RATS/header
ST_HEADER (1)    → espera header netplay (16 bytes)
ST_POST_HEADER (2) → espera post-header (8 bytes)
ST_SEND_NICK (3) → envía CMD_NICK "NICK" al peer
ST_RECV_NICK (4) → espera CMD_NICK del peer
ST_SEND_INFO (5) → envía CMD_INFO al peer
ST_RECV_INFO (6) → espera CMD_INFO del peer
ST_SEND_SYNC (7) → envía CMD_SYNC al peer
ST_READY (8)     → reenvío bidireccional de comandos
```

## Flujo de Handshake (Master)
1. Master conecta → relay asigna como client 1
2. Master envía header → relay responde con header echo (salt zeroeado)
3. Master envía post-header → relay responde con post-header echo
4. Relay envía CMD_NICK "NICK" → Master responde con su NICK
5. Relay envía CMD_INFO vacío → Master envía primer INFO → relay lo refleja
6. Master envía segundo INFO → relay envía CMD_SYNC
7. Master envía CMD_PLAY → relay responde con CMD_MODE
8. Master envía REQ_SAVE → relay responde con LOAD_SAVE vacío o lo dropea

## Comandos Post-Handshake
- INPUT, NOINPUT: forwardeados al otro peer
- PLAY: relay responde con MODE
- INFO/NICK: suprimidos si el peer ya está en ST_READY
- SPECTATE, LOAD_SAVE, REQ_SAVE: forwardeados o manejados según estado
