# Código de Ejecución - Emu Latam

## Para desarrollar y ejecutar localmente
1. Asegurar que PostgreSQL está corriendo en Windows (puerto 5433 en PC de Mauricio).
2. Abrir terminal en `client/`.
3. Ejecutar `npm run dev`.
4. Vite levantará React en el puerto 5173, y Electron abrirá la ventana principal.
5. Nakama se inicia silenciosamente al arrancar Electron, con un Health Check para no duplicar procesos. Al cerrar la App, los procesos mueren limpiamente.

## Arquitectura Actual (Julio 2026)

### Modos de Conexión

#### 1. HOST DIRECTO (sin bore)
- Host RA: `--host --port 55435`
- Guest RA: `--connect 127.0.0.1 --port 55435`
- Sin proxy, sin túnel. Para prueba local en misma PC.

#### 2. HOST GAME (BORE) — Conexión Internet
- **Problema de base:** RetroArch ignora `--port` en modo cliente. Siempre conecta al puerto 55435 (default) sin importar el valor de `--port`.
- **Solución:** Proxy TCP local en puerto 55435 que redirige al túnel bore.
- **Host:** `--host --port 55436` (usa 55436 en vez de 55435 para que el proxy guest pueda usar 55435)
- **Bore:** `bore local 55436 --to bore.pub` → tunnel en `bore.pub:XXXXX`
- **Guest Proxy:** Servidor TCP en `127.0.0.1:55435` que reenvía datos a `bore.pub:XXXXX`
- **Guest RA:** `--connect 127.0.0.1` → proxy local → bore tunnel → host

### Archivos Clave
- `client/src/main/index.ts` — Todo el backend de Electron: IPC handlers, proxy TCP, spawn de procesos
- `client/src/App.tsx` — UI de React: botones Host/JOIN/Directo, lógica de relay file
- `client/src/preload/index.ts` — Exposición IPC vía contextBridge
- `relay-server/active_relay.txt` — Archivo compartido entre ventanas para intercambio de URL
- `logs/main_process.log` — Log completo del main process con timestamps
- `retroarch/netplay_optimized.cfg` — Config anti-lag anexada a RetroArch