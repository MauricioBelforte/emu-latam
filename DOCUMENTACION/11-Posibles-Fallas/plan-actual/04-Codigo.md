# 04 - Bitácora de Fallas y Soluciones (Plan Inicial)

---

## [6] — Doble input del guest persistió: run_ahead era la causa real (corrige entrada [2])

**Fecha:** 2026-07-16
**Reportado por:** Usuario en pruebas cross-PC (Tailscale y directo)
**Componente afectado:** 04-Anti-Lag-RunAhead

### Síntoma
A pesar de aplicar `check_frames = "0"` (entrada [2]), el doble input del guest en el host seguía ocurriendo. Se notó que al presionar la barra espaciadora (turbo/fast forward en RetroArch) el problema desaparecía momentáneamente.

### Causa raíz
`run_ahead_enabled = "true"` con `run_ahead_frames = "1"`. Run-ahead ejecuta 1 frame adelantado prediciendo inputs. Cuando el input real del guest llega por red, el host concilia el frame predicho con el real. Si la predicción fue incorrecta, el input se aplica dos veces (predicho + real).

Fast-forward (espacio) desactiva temporalmente el frame limiting, lo que cambia el timing de run-ahead y hace que el doble input desaparezca mientras está activo.

### Solución aplicada
En `retroarch/netplay_optimized.cfg`:
```
run_ahead_enabled = "true"  →  run_ahead_enabled = "false"
run_ahead_frames = "1"      →  (eliminado)
run_ahead_secondary_instance = "true"  →  (eliminado)
```

### Código/Comandos involucrados
- `retroarch/netplay_optimized.cfg`: `run_ahead_enabled = "false"`

### Verificación
- ✅ MITM local: inputs del guest correctos en host sin necesidad de check_frames=0
- ✅ Tailscale cross-PC: inputs del guest correctos en host
- Fast-forward ya no es necesario para corregir el problema
- La solución aplica a todos los flujos (MITM, Bore, Tailscale, Directo)

### Nota
Este hallazgo reemplaza parcialmente la solución documentada en la entrada [2]. `check_frames = "0"` se mantiene por si acaso, pero la causa raíz real era run-ahead.

---

## [5] — Nakama Server no disponible desde el renderer (ERR_CONNECTION_REFUSED)

**Fecha:** 2026-07-16
**Reportado por:** Usuario al iniciar app en PC sin Nakama local
**Componente afectado:** 02-Integracion-Nakama

### Síntoma
Al hacer clic en "Insert Coin", la consola del DevTools muestra:
```
POST http://127.0.0.1:7350/v2/account/authenticate/device... net::ERR_CONNECTION_REFUSED
```
Y luego aparece "Nakama no disponible, usando modo local" en la UI.

### Causa raíz
El archivo `emu_latam_nakama.json` tiene `host: "127.0.0.1"` (localhost), pero en esa PC Nakama no corre localmente. Nakama corre en la otra PC y debe conectarse vía Tailscale (IP `100.x.x.x`).

El renderer llama a `get-nakama-server` vía IPC que lee este archivo, y si la IP es incorrecta, la autenticación falla.

### Solución aplicada
En `emu_latam_nakama.json`, cambiar:
```json
{ "host": "127.0.0.1", "port": "7350" }
```
por la IP de la PC que tiene Nakama corriendo:
```json
{ "host": "100.91.21.22", "port": "7350" }
```

### Código/Comandos involucrados
- `emu_latam_nakama.json`: archivo de configuración leído por `getNakamaConfig()` en `client/src/main/index.ts`
- `client/src/main/index.ts`: ipcMain.handle("get-nakama-server")
- `client/src/context/AuthContext.tsx`: `loginGhost()` obtiene la config vía IPC

### Verificación
- La app se conecta a Nakama remoto y autentica correctamente.
- Desde la PC remota con Nakama se debe confirmar que Nakama está funcionando.

---

## [4] — Auto-restart de Nakama al crashear

**Fecha:** 2026-07-16
**Reportado por:** Usuario durante prueba de conexión cross-PC
**Componente afectado:** 02-Integracion-Nakama

### Síntoma
Nakama se caía inesperadamente en la PC remota (sin motivo aparente). La única forma de restaurarlo era cerrar la app y ejecutar `start_server.bat` manualmente, lo cual es inviable para un usuario final.

### Causa raíz
`launchNakama()` en `client/src/main/index.ts` solo se ejecutaba una vez al arrancar la app. No había:
- Handler de evento `close` del proceso para reiniciarlo.
- Health check periódico para detectar si el servidor dejó de responder.
- Límite de reintentos para evitar loops infinitos.
- Flag de "cierre intencional" para no reiniciar cuando se cierra la app.

### Solución aplicada
Se modificó `launchNakama()` y se agregó `startNakamaHealthCheck()`:
1. **Evento `close`**: Si Nakama se cierra inesperadamente, espera 2s y lo reinicia automáticamente.
2. **Health check c/30s**: Verifica que Nakama responda en `http://{host}:{port}`. Si no responde, mata el proceso (para reinicio limpio) o lo lanza si está caído.
3. **Máx 5 reintentos**: Evita loops infinitos si la causa es grave (PostgreSQL caído, etc.).
4. **`nakamaKilledIntentionally`**: Flag que evita reinicio cuando la app se cierra (before-quit).
5. **Limpieza**: Timers e intervals se cancelan en `before-quit`.

### Código/Comandos involucrados
- `client/src/main/index.ts`:
  - Variables: `nakamaProcess`, `nakamaRestartAttempts`, `nakamaRestartTimer`, `nakamaHealthTimer`, `nakamaKilledIntentionally`
  - Constantes: `MAX_NAKAMA_RESTART_ATTEMPTS = 5`, `NAKAMA_RESTART_DELAY_MS = 2000`, `NAKAMA_HEALTH_INTERVAL_MS = 30000`
  - Función `launchNakama()` modificada: agrega `on("close")` handler con auto-restart
  - Nueva función `startNakamaHealthCheck()`: setInterval cada 30s
  - `before-quit`: limpia timers, marca `nakamaKilledIntentionally = true`

### Verificación
- Matar Nakama manualmente (taskkill /F /IM nakama.exe) → se reinicia solo en ≤ 2s
- El log muestra: `Nakama cerró inesperadamente (código 1). Reintentando en 2000ms...`
- Si se cierra la app, Nakama no se reinicia
- Health check detecta proceso colgado y lo reinicia

---

## [3] — Ventana de Electron se cierra al usar MITM Local

**Fecha:** 2026-07-15
**Reportado por:** Usuario en sesión de pruebas
**Componente afectado:** 01-Setup-Electron-Vite

### Síntoma
Al hacer click en "MITM LOCAL (HOST+GUEST MISMA PC)", la ventana de Electron se cerraba sola sin mostrar error.

### Causa raíz
- El renderer de Electron crasheaba por una excepción no manejada durante el flujo MITM (spawn de 2 RetroArch + relay Node.js).
- No había un handler de `webContents.on("crashed")` que recargara la ventana.
- El handler `start-mitm-local` no tenía protección contra doble ejecución.

### Solución aplicada
1. **Crashed handler:** Se agregó `mainWindow.webContents.on("crashed")` que recarga la página automáticamente en vez de cerrar la ventana.
2. **Bloqueo de doble ejecución:** Variable `mitmRunning` en el main process que impide ejecutar el handler dos veces.
3. **before-quit log:** Se agregó `event.reason` al log para identificar por qué se cierra la app.

### Código/Comandos involucrados
- `client/src/main/index.ts`: webContents.on("crashed"), variable mitmRunning, before-quit log.
- `client/src/App.tsx`: guard en handleTestMitmLocal.

### Verificación
- `npm run build` exitoso.
- El flujo MITM se ejecuta completo sin cerrar la ventana.
- Si el renderer crashea, la ventana se recarga en vez de cerrarse.

### Logs relacionados
- `Logs/24-Proteccion-cierre-Electron-MITM-Local-2026-07-15_15-45-00.md`

---

## [2] — Doble input del guest en pantalla del host

**Fecha:** 2026-07-15
**Reportado por:** Usuario en pruebas MITM local y Tailscale cross-PC
**Componente afectado:** 04-Anti-Lag-RunAhead

### Síntoma
Cuando el guest (player 2) se movía, en la pantalla del host se veía como si se moviera uno de más (doble input). Por ejemplo, al presionar → una vez, el personaje avanzaba 2 casilleros en la pantalla del host.

### Causa raíz
`netplay_check_frames = "30"` en `retroarch/netplay_optimized.cfg`. RetroArch verificaba el estado del juego cada 30 frames y al re-procesar, los inputs del guest se duplicaban (rollback/desfase de 1 frame).

La solución ya estaba documentada desde Julio 2026 en `3-DOCUMENTO-TAREAS-ACTUAL.md` (Fase 4), pero nunca se aplicó al archivo de configuración.

### Solución aplicada
En `retroarch/netplay_optimized.cfg`:
```
netplay_check_frames = "30"  →  netplay_check_frames = "0"
```

### Verificación
- ✅ MITM local: inputs del guest se ven correctos en el host.
- La solución aplica a todos los flujos (MITM, Bore, Tailscale, Directo) porque todos usan `--appendconfig netplay_optimized.cfg`.

### Logs relacionados
- `Logs/25-Fix-doble-input-guest-host-check-frames-0-2026-07-15_17-01-00.md`

---

## [1] — Conexión Nakama: PostgreSQL puerto incorrecto

**Fecha:** 2026-07-16
**Reportado por:** Usuario al probar conexión cross-PC
**Componente afectado:** 02-Integracion-Nakama

### Síntoma
Al hacer CREAR SALA en PC 2, Nakama no arrancaba. El puerto 7350 no respondía. Desde PC 1, al hacer UNIRSE A SALA con la IP de Tailscale de PC 2, daba "No se pudo conectar al servidor. Verificá la IP." El `ping` a la IP de Tailscale funcionaba (0ms).

### Causa raíz
El archivo `backend/local.yml` tenía configurado:
```
"postgres:localdb@127.0.0.1:5432/nakama"
```
Pero en PC 2, PostgreSQL escuchaba en el puerto **5433**, no en 5432. Nakama no podía conectarse a la base de datos y fallaba al iniciar con el error:
```
Error pinging database: ... autentificación password falló para el usuario postgres
```

### Solución aplicada
En `backend/local.yml`, cambiar:
```
"postgres:localdb@127.0.0.1:5432/nakama"
```
por:
```
"postgres:localdb@127.0.0.1:5433/nakama"
```

### Código/Comandos involucrados
- `backend/local.yml`: cambiar puerto de 5432 a 5433.

### Verificación
- Nakama inicia correctamente (PID visible en consola).
- `curl http://127.0.0.1:7350` responde OK en PC 2.
- `curl http://100.98.148.11:7350` responde OK desde PC 1.
- El guest puede conectarse a la sala.

### Logs relacionados
- Ninguno (se documenta directamente aquí).
