# 04 - Bitácora de Fallas y Soluciones (Plan Inicial)

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
