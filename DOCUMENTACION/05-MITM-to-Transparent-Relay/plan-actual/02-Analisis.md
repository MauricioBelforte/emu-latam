# 02 - Análisis - Transparent Relay Fix (Plan Actual)

## Análisis del Problema Original
- El MITM relay implementaba una máquina de estados completa para el handshake netplay (header echo, post-header, NICK, INFO, SYNC).
- Cuando el master enviaba REQ_SAVE (0x41), el relay no tenía estado de juego para responder.
- Opciones probadas y su resultado:
  - **Drop silencioso**: master espera ~2s y se desconecta (timeout interno de RA)
  - **NAK**: desconexión inmediata (RA interpreta como rechazo)
  - **LOAD_SAVE vacío** (frame 0, size 0): retrasa la desconexión pero no la evita
  - **MODE broadcast**: no afecta la desconexión (el problema no es la notificación)

## Decisión Clave
- El relay MITM es conceptualmente incorrecto para nuestro caso: necesita ser el host del juego (tener estado de emulación) para funcionar correctamente.
- Solución real: usar `--host` para un RA (el que tiene el juego) y `--connect` para el otro.
- El relay se convierte en un forwarder TCP transparente: solo pipea datos bidireccionalmente.
- RetroArch maneja TODO el protocolo netplay (handshake, savestate sync, frame sync, inputs).

## Ventajas del Forwarder Transparente
- No necesita conocer el protocolo netplay (0 líneas de lógica MITM)
- El host responde REQ_SAVE con su estado real de juego
- Frame sync funciona porque el host genera inputs y frames
- Mucho más simple (~60 líneas vs ~681 líneas)
- Fácil de depurar (solo pipea bytes, sin interpretación)
