# 24 — Protección contra cierre de Electron al usar MITM Local

**Fecha:** 2026-07-15 15:45:00
**Tipo:** Bugfix / Robustez
**Componentes:** 01-Setup-Electron-Vite

## Problema
Al hacer clic en "MITM LOCAL (HOST+GUEST MISMA PC)", la ventana de Electron se cerraba sola. Posibles causas:
- Error no manejado en el renderer (crasheo del proceso).
- Doble clic en el botón ejecutando el handler dos veces.
- Spawning de 2 RetroArch + relay Node.js saturando recursos.

## Cambios

### 1. Renderer crash recovery (index.ts)
- Agregado `mainWindow.webContents.on("crashed")` que recarga la página automáticamente en lugar de dejar que la ventana se cierre.

### 2. Bloqueo de doble ejecución (index.ts)
- Nueva variable `mitmRunning` en el main process.
- El handler `start-mitm-local` retorna `{ success: false, error: "MITM ya está en ejecución" }` si ya está corriendo.
- Bloqueo liberado en `finally { mitmRunning = false }`.

### 3. before-quit logging (index.ts)
- Agregado `event.reason` al log de `before-quit` para identificar por qué se está cerrando la app.

### 4. UI guard (App.tsx)
- `handleTestMitmLocal` ahora retorna temprano si `loading.mitm` ya es `true`.
- Si el error es "ya está en ejecución", solo loguea advertencia sin mostrar alerta.

## Archivos modificados
- `client/src/main/index.ts` — 3 cambios (crashed handler, mitmRunning flag, before-quit log)
- `client/src/App.tsx` — guard en handleTestMitmLocal
- Incluye cambios menores en AuthContext.tsx y nakama.ts (de commits anteriores)

## Verificación
- `npm run build` → sin errores
