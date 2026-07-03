# 02 - Análisis - MITM Relay Node.js (Plan Inicial)

## Análisis del Dominio
- El servidor MITM original (C) actúa como intermediario entre dos clientes `--connect`.
- El servidor maneja: MITM pre-handshake (RATS/RATL), header echo, post-header, NICK, INFO, SYNC.
- Post-handshake: forwardea comandos entre ambos peers (INPUT, PLAY, MODE, REQ_SAVE, LOAD_SAVE, etc.).
- RetroArch con `netplay_use_mitm_server = "true"` debería enviar RATS (0x52415453) antes del header normal.

## Alternativas Consideradas
1. **Servidor C compilado**: Inviable (sin toolchain, sin Qt5).
2. **Servidor Node.js completo**: Elegido. Implementa el protocolo netplay desde cero.
3. **Forwarder TCP transparente**: Rechazado inicialmente porque ambos RAs debían usar `--connect`.

## Decisiones Técnicas
- Lazy assignment: master/guest se asignan en el primer `data` event (no en TCP connection).
- Header echo con salt zeroeado (evita diálogo de password de RA).
- Hardcoded server NICK "NICK" (como el C server).
- Cliente 2 recibe INFO+SYNC del master inmediatamente (como el C server).
- Post-handshake: forwardeo bidireccional + cola de pendientes si un peer no está listo.
