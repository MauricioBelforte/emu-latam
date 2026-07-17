# Análisis del Dominio y Alternativas — Gemini 3.5 Flash

## 1. Análisis del Dominio
El ecosistema de Emu Latam involucra la interacción asíncrona entre el proceso principal de Electron, el frontend de React y múltiples procesos de red y emulación de terceros (`retroarch.exe`, `bore.exe`, `nakama.exe`). La optimización del netplay para juegos de pelea como KOF '98 exige precisiones de latencia de nivel de milisegundos (<50ms).

Cualquier retraso o jitter introducido por relays de red (como Tailscale DERP) o frames perdidos durante rollbacks compromete la experiencia competitiva.

## 2. Alternativas Evaluadas

### Alternativa 1: Diagnóstico de Red
- **Opción A (Ping simple ICMP):** Realizar pings por sistema operativo al host oponente. *Desventaja:* Muchos firewalls domésticos y de Tailscale bloquean ICMP, dando falsos negativos.
- **Opción B (Tailscale Status JSON):** Ejecutar `tailscale status --json` y extraer el campo `Active` y `TxBytes/RxBytes` del peer, verificando la bandera `DERP` o `direct-connection`. *Decisión:* **Opción B**. Es altamente confiable, expone si el tráfico pasa por un relay y no requiere permisos especiales ni altera firewalls.

### Alternativa 2: Control de RetroArch
- **Opción A (Matar proceso):** Usar `process.kill()` o `taskkill`. *Desventaja:* Brusco, corrompe SRAM y partidas guardadas de FBNeo, no da feedback al oponente.
- **Opción B (Comandos UDP):** Habilitar `network_cmd_enable = "true"` y enviar strings de comandos por socket UDP a `127.0.0.1:55400`. *Decisión:* **Opción B**. Permite suspender la emulación de manera limpia, forzar guardados rápidos (`SAVE_STATE`) antes de desconectar y cerrar ordenadamente el programa.

### Alternativa 3: Seguridad en Bore
- **Opción A (Cambiar a túnel SSH privado):** Configurar llaves SSH para cada cliente. *Desventaja:* Complejo de mantener y empaquetar en Windows.
- **Opción B (Handshake en Forwarder Local):** El forwarder en Node.js de la PC host actúa como guardián. No redirige bytes a RetroArch hasta recibir un token efímero vía conexión TCP de control. *Decisión:* **Opción B**. Mantiene la ligereza de Bore pero bloquea el escaneo aleatorio de bots en `bore.pub`.

## 3. Decisiones de Arquitectura
- **Autenticación:** Migrar a `authenticateDevice` persistiendo el UUID del cliente en un archivo local `config.json` de la app.
- **Matchmaking:** Implementar lógica de cola de emparejamiento con Nakama Matchmaker, definiendo criterios basados en propiedades personalizadas del usuario (ej. `ping_region`).
- **Supervisión de Procesos:** Crear un módulo `ProcessWatchdog` en Electron para unificar el ciclo de vida de los procesos y emitir diagnósticos en base a códigos de salida (`exitCode`).
