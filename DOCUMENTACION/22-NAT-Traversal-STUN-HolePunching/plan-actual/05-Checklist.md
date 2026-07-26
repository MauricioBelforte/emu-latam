# 05 — Checklist: NAT Traversal (STUN + Hole Punching)

## Fase 1: Implementación natTraversal.ts

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 1.1 | Implementar `createStunBindingRequest()` (RFC 5389) | 🔴 Alta | `natTraversal.ts` | ⬜ |
| 1.2 | Implementar `parseStunResponse()` | 🔴 Alta | `natTraversal.ts` | ⬜ |
| 1.3 | Implementar `discoverEndpoint()` con detección NAT simétrica | 🔴 Alta | `natTraversal.ts` | ⬜ |
| 1.4 | Implementar `attemptHolePunch()` con timeout 5s | 🔴 Alta | `natTraversal.ts` | ⬜ |
| 1.5 | Implementar `startKeepAlive()` / `stopKeepAlive()` | 🟡 Media | `natTraversal.ts` | ⬜ |
| 1.6 | Implementar `closeAll()` cleanup completo | 🟡 Media | `natTraversal.ts` | ⬜ |

## Fase 2: Integración IPC

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 2.1 | Registrar 4 handlers `nat-traversal-*` en `index.ts` | 🟢 Baja | `index.ts` | ⬜ |
| 2.2 | Agregar cleanup `registerCleanup("nat-traversal")` | 🟢 Baja | `index.ts` | ⬜ |
| 2.3 | Agregar 4 canales a `ipcChannels.ts` | 🟢 Baja | `ipcChannels.ts` | ⬜ |

## Fase 3: Integración ChallengeContext

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 3.1 | Agregar método `"nat"` como prioritario antes de `"bore"` | 🔴 Alta | `ChallengeContext.tsx` | ⬜ |
| 3.2 | Host: discover → conn_info → guest_ready → punch → launch | 🔴 Alta | `ChallengeContext.tsx` | ⬜ |
| 3.3 | Guest: conn_info → discover → punch → guest_ready → launch | 🔴 Alta | `ChallengeContext.tsx` | ⬜ |
| 3.4 | Fallback automático a bore si NAT simétrica o timeout | 🔴 Alta | `ChallengeContext.tsx` | ⬜ |

## Fase 4: Tests

| # | Tarea | Prioridad | Archivo | Estado |
|:--|:------|:----------|:--------|:-------|
| 4.1 | Test: STUN binding request formato correcto (bytes) | 🟡 Media | `test_nat_traversal.js` | ⬜ |
| 4.2 | Test: parseStunResponse con respuesta real simulada | 🟡 Media | `test_nat_traversal.js` | ⬜ |
| 4.3 | Test: discoverEndpoint timeout manejado | 🟡 Media | `test_nat_traversal.js` | ⬜ |
| 4.4 | Test: attemptHolePunch timeout (simular sin respuesta) | 🟡 Media | `test_nat_traversal.js` | ⬜ |
| 4.5 | Test: detección NAT simétrica (2 requests, puertos diferentes) | 🟡 Media | `test_nat_traversal.js` | ⬜ |
| 4.6 | Test: closeAll limpia todos los recursos | 🟡 Media | `test_nat_traversal.js` | ⬜ |
| 4.7 | Regresión: test_stable_flows.js 50/51 | 🔴 Alta | `test_stable_flows.js` | ⬜ |
| 4.8 | Build exitoso (npm run dev) | 🔴 Alta | — | ⬜ |

## Fase 5: Verificación Manual

| # | Tarea | Prioridad | Estado |
|:--|:------|:----------|:-------|
| 5.1 | Prueba localhost (loopback): hole punch entre 2 sockets en misma PC | 🔴 Alta | ⬜ |
| 5.2 | Prueba 2 PCs misma LAN: hole punch via IP pública real | 🔴 Alta | ⬜ |
| 5.3 | Prueba WAN: con otro usuario con NAT compatible | 🟡 Media | ⬜ |
