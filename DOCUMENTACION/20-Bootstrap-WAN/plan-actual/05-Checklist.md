# 05 — Checklist del Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN

## Fase 1: Módulo bootstrap.ts

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 1.1 | Crear `bootstrap.ts` con funciones publish/fetch/start/close | 🔴 Alta | `client/src/main/bootstrap.ts` | ✅ |
| 1.2 | Implementar `publishBoreUrl()`: POST a dpaste.org con la bore URL | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.3 | Implementar `fetchBoreUrl()`: GET de dpaste.org por room code | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.4 | Implementar `startNakamaBore()`: spawn bore para puerto 7350 | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.5 | Implementar `handleBootstrapHost()`: orquestación completa | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.6 | Implementar `handleBootstrapGuest()`: fetch + config Nakama | 🔴 Alta | `bootstrap.ts` | ✅ |
| 1.7 | Implementar `handleBootstrapClose()`: cleanup + restore localhost | 🟡 Media | `bootstrap.ts` | ✅ |

## Fase 2: Integración IPC

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 2.1 | Registrar 3 IPC handlers en `index.ts` | 🟢 Baja | `client/src/main/index.ts` | ✅ |
| 2.2 | Agregar 3 canales a `ipcChannels.ts` | 🟢 Baja | `ipcChannels.ts` | ✅ |

## Fase 3: UI en App.tsx

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 3.1 | Agregar estado `bootstrapStatus`, `roomCode`, `bootstrapBoreUrl` | 🟢 Baja | `App.tsx` | ✅ |
| 3.2 | Agregar handlers `handleBootstrapHost/Guest/Close` | 🟡 Media | `App.tsx` | ✅ |
| 3.3 | Agregar UI: botón "ABRIR SALA PÚBLICA" + input room code + estado | 🟡 Media | `App.tsx` | ✅ |

## Fase 4: Tests

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 4.1 | Crear `test_bootstrap.js` (34 tests, inline + verificación de archivos) | 🔴 Alta | `client/test_bootstrap.js` | ✅ |
| 4.2 | parseBoreUrl extrae URL correcta | 🟡 Media | `test_bootstrap.js` | ✅ |
| 4.3 | fetchBoreUrl con room code válido | 🟡 Media | `test_bootstrap.js` | ✅ |
| 4.4 | fetchBoreUrl con room code inválido (404) | 🟡 Media | `test_bootstrap.js` | ✅ |
| 4.5 | dpaste timeout manejado | 🟡 Media | `test_bootstrap.js` | ✅ |
| 4.6 | parseBoreUrl con varios formatos (bore.pub, IP:puerto, sin match) | 🟡 Media | `test_bootstrap.js` | ✅ |
| 4.7 | BootstrapClose sin nada activo (no crash) | 🟡 Media | `test_bootstrap.js` | ✅ |
| 4.8 | Verificación de archivos fuente (App.tsx, index.ts, ipcChannels.ts) | 🟡 Media | `test_bootstrap.js` | ✅ |

## Fase 5: Verificación

| # | Tarea | Prioridad | Estado |
|:--|:------|:----------|:-------|
| 5.1 | Build exitoso (npm run build) | 🔴 Alta | ✅ |
| 5.2 | Tests pasan (test_bootstrap.js 34/34) | 🔴 Alta | ✅ |
| 5.3 | Regresión: test_stable_flows.js 50/51 | 🔴 Alta | ✅ |
| 5.4 | Regresión: test_p2p_ggpo.js 39/39 | 🟡 Media | ✅ |
| 5.5 | Regresión: test_ggpo_p2p_wan.js 17/17 | 🟡 Media | ✅ |
