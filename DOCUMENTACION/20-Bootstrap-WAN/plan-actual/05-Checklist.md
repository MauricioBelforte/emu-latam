# 05 — Checklist del Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN

## Fase 1: Módulo bootstrap.ts

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 1.1 | Crear `bootstrap.ts` con funciones publish/fetch/start/close | 🔴 Alta | `client/src/main/bootstrap.ts` | ✅ |
| 1.2 | Implementar `startNakamaBore()`: spawn bore para puerto 7350 | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.3 | Implementar `handleBootstrapHost()`: orquestación completa | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.4 | Implementar `handleBootstrapGuest()`: config Nakama remoto | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.5 | Implementar `handleBootstrapClose()`: cleanup + restore localhost | 🟡 Media | `bootstrap.ts` | ✅ |
| 1.6 | Implementar `startGameBoreTunnel()`: bore game relay 55436 sin taskkill global | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.7 | Implementar `stopGameBoreTunnel()`: cleanup aislado | 🟡 Media | `bootstrap.ts` | ✅ |

## Fase 2: Integración IPC

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 2.1 | Registrar IPC handlers bootstrap-host/guest/close | 🟢 Baja | `client/src/main/index.ts` | ✅ |
| 2.2 | Registrar IPC bootstrap-start-game-relay / stop | 🟢 Baja | `index.ts` | ✅ |
| 2.3 | Registrar cleanup bootstrap-game-relay | 🟢 Baja | `index.ts` | ✅ |
| 2.4 | Agregar canales a `ipcChannels.ts` | 🟢 Baja | `ipcChannels.ts` | ✅ |

## Fase 3: UI + Flujo de Retos

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 3.1 | UI botón "SALA PÚBLICA" en App.tsx | 🟡 Media | `App.tsx` | ✅ |
| 3.2 | RA host bootstrap: usar game bore + forwarder TCP | 🔴 Alta | `ChallengeContext.tsx` | ✅ |
| 3.3 | RA guest bootstrap: usar proxy TCP existente | 🔴 Alta | `ChallengeContext.tsx` | ✅ |
| 3.4 | GGPO relay bootstrap con relay UDP↔TCP | 🔴 Alta | `bootstrapGgpoRelay.ts` | ✅ |

## Fase 4: Mejoras bootstrapGgpoRelay.ts

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 4.1 | Eliminar handler duplicado `udpRelay.on("message")` | 🟡 Media | `bootstrapGgpoRelay.ts` | ✅ |
| 4.2 | Reemplazar sockets UDP temporales por persistentes | 🟡 Media | `bootstrapGgpoRelay.ts` | ✅ |
| 4.3 | Limpieza de sockets persistentes en cleanup | 🟡 Media | `bootstrapGgpoRelay.ts` | ✅ |

## Fase 5: Tests

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 5.1 | Build exitoso (npm run dev) | 🔴 Alta | — | ✅ |
| 5.2 | Regresión: test_stable_flows.js 50/51 | 🔴 Alta | `test_stable_flows.js` | ✅ |
| 5.3 | Compilación TypeScript sin errores | 🔴 Alta | — | ✅ |
