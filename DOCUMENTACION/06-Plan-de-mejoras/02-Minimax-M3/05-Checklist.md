# 05 - Checklist - Plan de Mejoras (minimax-m3)

> Estado: **PENDIENTE**. Este plan aún no se ha implementado. La idea es que cada ítem se marque como completado cuando su PR esté mergeado y validado, y que cada cierre genere un log en `Logs/`.

## Fase 0 — Aprobación de diseño

- [ ] Revisar `01-Requerimientos.md` con el usuario.
- [ ] Revisar `02-Analisis.md` con el usuario.
- [ ] Revisar `03-Diseno.md` con el usuario.
- [ ] Revisar `04-Codigo.md` con el usuario.
- [ ] Confirmar que no hay colisión con los planes de otros modelos en `06-Plan-de-mejoras/`.

## Fase 1 — Servicios del main process (RF-01, RF-03, RF-04, RF-07)

- [ ] Crear `client/src/main/services/ipcChannels.ts` con `IPC_CHANNELS` y `IPC_WHITELIST`.
- [ ] Crear `client/src/types/electron.d.ts` con `IpcInvokeMap`.
- [ ] Modificar `client/src/preload/index.ts` para validar el whitelist.
- [ ] Crear `client/src/main/services/processRegistry.ts` con `register/unregister/killByTag/killAll/list/heartbeat`.
- [ ] Modificar `client/src/main/index.ts`:
  - [ ] Importar `IPC_CHANNELS`.
  - [ ] Registrar `nakamaProcess`, `boreProcess`, `mitmRelayProcess` en el registry.
  - [ ] Suscribir `app.on("before-quit", ...)` a `processRegistry.killAll()`.
- [ ] Crear `client/src/main/services/shared/portUtils.ts`.
- [ ] Crear `client/src/main/services/shared/boreCore.ts`.
- [ ] Refactorizar handlers `start-relay-tunnel` y `start-relay-tunnel-v2` para usar `boreCore` (sin cambiar su firma ni canales).
- [ ] Crear `client/src/main/services/relayConfigStore.ts` con fallback al archivo legacy.
- [ ] Modificar handlers `save-relay-url` y `get-relay-url` para usar `relayConfigStore` (manteniendo el archivo legacy como espejo).

## Fase 2 — Tests de los servicios

- [ ] Crear `client/test_ipc_whitelist.js` (≥ 4 tests).
- [ ] Crear `client/test_process_registry.js` (≥ 4 tests).
- [ ] Crear `client/test_port_utils.js` (≥ 3 tests).
- [ ] Agregar scripts a `client/package.json`: `test:registry`, `test:ipc`, `test:ports`.
- [ ] Extender `client/test_stable_flows.js` con 3 nuevos tests:
  - [ ] `should reject unknown IPC channels in preload`.
  - [ ] `should kill all registered processes when before-quit fires`.
  - [ ] `should return port-in-use error from assertPortFree when busy`.

## Fase 3 — Toast system (reemplazo de `alert()`)

- [ ] Crear `client/src/renderer/context/ToastContext.tsx`.
- [ ] Crear `client/src/renderer/hooks/useToast.ts`.
- [ ] Crear `client/src/renderer/components/ToastHost.tsx`.
- [ ] Envolver la app en `<ToastProvider>` dentro de `client/src/main.tsx`.
- [ ] Renderizar `<ToastHost />` dentro de `<AppShell>` (o como hermano en `App.tsx`).
- [ ] Reemplazar todos los `alert()` de `App.tsx` por `toast.show(...)`.

## Fase 4 — Hook `useHostingActions` (RF-08, RF-10)

- [ ] Crear `client/src/renderer/hooks/useHostingActions.ts`.
- [ ] Mover los handlers de hosting de `App.tsx` al hook.
- [ ] Agregar botón "Cancelar" durante `loading.bore` que mata el proceso vía nuevo IPC `kill-by-tag`.
- [ ] Registrar el nuevo IPC en `IPC_CHANNELS`.

## Fase 5 — Verificación y limpieza

- [ ] Correr `npm run lint` → 0 errores.
- [ ] Correr `npm run test:stable` → todos los tests verdes.
- [ ] Correr `npm run test:registry`, `test:ipc`, `test:ports` → verdes.
- [ ] Correr `npm run dev` → la app levanta sin warnings nuevos.
- [ ] Smoke test manual: iniciar Nakama + bore + RetroArch, cerrar la app, verificar `tasklist` limpio.
- [ ] Verificar que el EXE empaquetado (`npm run package`) incluye los nuevos archivos.
- [ ] Actualizar `DOCUMENTACION/4-DOCUMENTO-EJECUCION-ACTUAL.md` con la nueva arquitectura de servicios.
- [ ] Actualizar `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` marcando los items derivados.
- [ ] Generar logs en `Logs/` por cada cierre de fase.

## Fase 6 — Hardening (mejoras opcionales si hay tiempo)

- [ ] Agregar `processRegistry.heartbeat()` que escriba en log cada 60s.
- [ ] En `index.ts`, suscribir a `mainWindow.on("closed", ...)` para también matar procesos.
- [ ] Mover `AppShell` a `client/src/renderer/layout/` para alinearlo con la convención de `layout/`.
- [ ] Documentar en `04-Codigo.md` el orden de inicialización: `app.whenReady` → `processRegistry` → IPC handlers → `createWindow`.

## Estado de cierre

- [ ] Plan implementado al 100%.
- [ ] Plan revisado por el usuario.
- [ ] Logs de cierre generados.
- [ ] `Mensajes entre modelos/ESTADO-PARALELO.md` actualizado si corresponde.
