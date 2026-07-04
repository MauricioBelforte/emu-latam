# 01-Requerimientos.md — Requerimientos del Plan de Mejoras (Plan Actual)

> **Nota**: Este archivo es una copia de `plan-inicial/01-Requerimientos.md` y se actualiza conforme avanza la implementación para reflejar el estado real del código.

---

## Resumen de Mejoras

| # | Mejora | Prioridad | Estado |
|---|--------|-----------|--------|
| 1 | Paquete Shared IPC Types (`@emu-latam/ipc-types`) | CRÍTICA | ⬜ Pendiente |
| 2 | NetworkContext + React Query (TanStack Query v5) | CRÍTICA | ⬜ Pendiente |
| 3 | Servicios Proxy/Forwarder/MITM/Bore + ProcessManager | CRÍTICA | ⬜ Pendiente |
| 4 | Health Checks + Auto-Restart + Circuit Breaker | CRÍTICA | ⬜ Pendiente |
| 5 | Winston Logger Estructurado + Rotación | ALTA | ⬜ Pendiente |
| 6 | Error Boundaries + Toast + ErrorPayload Tipado | ALTA | ⬜ Pendiente |
| 7 | Tests: Unit + Integration (Testcontainers) + E2E (Playwright) | ALTA | ⬜ Pendiente |
| 8 | TypeScript Strict Mode (Incremental) | ALTA | ⬜ Pendiente |
| 9 | Config Centralizada (Zod + YAML) | MEDIA | ⬜ Pendiente |
| 10 | Electron Forge + Auto-Update (GitHub Releases) | MEDIA | ⬜ Pendiente |
| 11 | i18n (react-i18next) Español/Inglés | MEDIA | ⬜ Pendiente |
| 12 | Nakama OpenAPI Codegen (Cliente Tipado) | BAJA | ⬜ Pendiente |

---

## Orden Crítico de Implementación

```
1 → 3 → 2 → (4 || 5) → 6 → 7 → 8 → 9 → 10
          ↘ 11, 12 (paralelo después de 1)
```

---

## MEJORA 1: Paquete Shared IPC Types (`@emu-latam/ipc-types`)

### Problema
Tipos IPC duplicados en 3 ubicaciones: `client/src/main/ipc/`, `client/src/preload/`, `client/src/renderer/src/types/`. Sin validación runtime. Cambios rompen compilación en cascada.

### Solución
Monorepo npm workspace con paquete `@emu-latam/ipc-types` que exporta:
- Canales IPC tipados
- Payloads con esquemas Zod
- Validadores runtime en preload
- Tipos de error unificados

### Criterios de Aceptación
- [ ] Un solo source of truth para todos los tipos IPC
- [ ] Validación runtime con Zod en preload ANTES de `ipcRenderer.invoke`
- [ ] Tipos TypeScript estrictos en main, preload, renderer
- [ ] Tests cubren 100% de esquemas Zod (válidos + inválidos)
- [ ] Build genera `.d.ts` declarations

### Archivos Esperados (Plan Actual)
- `packages/ipc-types/src/channels.ts`
- `packages/ipc-types/src/payloads.ts`
- `packages/ipc-types/src/validators.ts`
- `packages/ipc-types/src/errors.ts`
- `packages/ipc-types/src/index.ts`
- `packages/ipc-types/package.json`
- `packages/ipc-types/tsconfig.json`

---

## MEJORA 2: NetworkContext + React Query (TanStack Query v5)

### Problema
Estado de red disperso en componentes (`useState`/`useEffect` manuales). Sin cache, refetch automático, ni manejo unificado de loading/error.

### Solución
`NetworkProvider` con `QueryClient` + hooks tipados: `useHealthCheck()`, `useRelayStatus()`, `useLaunchGame()`, `useRelayTunnel()`, `useMatchmaking()`, `useMetrics()`.

### Criterios de Aceptación
- [ ] Estado de red centralizado, sin `useState`/`useEffect` manuales para datos servidor
- [ ] Refetch automático: health 10s, relay 5s, metrics 15s
- [ ] Mutations con optimistic updates donde aplique
- [ ] Error handling unificado via `onError` en mutation defaults
- [ ] Loading/error/empty states manejados por React Query

### Archivos Esperados
- `client/src/renderer/src/providers/NetworkProvider.tsx`
- `client/src/renderer/src/context/NetworkContext.tsx`
- `client/src/renderer/src/hooks/useHealthCheck.ts`
- `client/src/renderer/src/hooks/useRelayStatus.ts`
- `client/src/renderer/src/hooks/useLaunchGame.ts`
- `client/src/renderer/src/hooks/useRelayTunnel.ts`
- `client/src/renderer/src/hooks/useMatchmaking.ts`
- `client/src/renderer/src/hooks/useMetrics.ts`

---

## MEJORA 3: Servicios Proxy/Forwarder/MITM/Bore + ProcessManager

### Problema
Lógica de red frágil en `client/src/main/ipc/handlers.ts` (3000+ líneas). Sin lifecycle management, health checks, ni métricas. Procesos huérfanos al cerrar app.

### Solución
`ProcessManager` orquesta servicios con lifecycle, health checks, restart policy, circuit breaker. Servicios independientes: `ProxyService`, `ForwarderService`, `MitmRelayService`, `BoreService`, `GameLauncher`.

### Criterios de Aceptación
- [ ] ProcessManager maneja lifecycle completo: start → running → health checks → restart → stop
- [ ] Proxy: 55435 → bore.pub:puerto_dinámico (bidireccional)
- [ ] Forwarder: 55436 → LAN_IP:55435 (usa `getLanIp()`, NO 127.0.0.1)
- [ ] MITM: 55437 → bore.pub:puerto_dinámico (intercepta frames)
- [ ] Bore: Spawn, parse puerto, reconexión automática
- [ ] GameLauncher: Args correctos por modo (host/guest directo/guest relay)
- [ ] Métricas expuestas via IPC `get-metrics`
- [ ] Tests unitarios > 80% coverage en servicios

### Archivos Esperados
- `client/src/main/services/ProcessManager.ts`
- `client/src/main/services/ProxyService.ts`
- `client/src/main/services/ForwarderService.ts`
- `client/src/main/services/MitmRelayService.ts`
- `client/src/main/services/BoreService.ts`
- `client/src/main/services/GameLauncher.ts`
- `client/src/main/services/index.ts`

---

## MEJORA 4: Health Checks + Auto-Restart + Circuit Breaker

### Problema
Sin visibilidad de salud de servicios. Fallos silenciosos. Sin recuperación automática.

### Solución
Health check loop configurable por servicio. 3 fallos = unhealthy → restart con backoff exponencial. 3 reinicios fallidos = circuit breaker (60s reset).

### Criterios de Aceptación
- [ ] Health check cada 10s por defecto, configurable
- [ ] 3 fallos consecutivos = unhealthy → restart automático
- [ ] Backoff exponencial: 2s, 4s, 8s entre reintentos
- [ ] Circuit breaker tras 3 reinicios fallidos, reset tras 60s sano
- [ ] Estado expuesto via IPC y events para UI

### Archivos Esperados
- Integrado en `ProcessManager.ts` (config `HealthCheckConfig`, `RestartPolicy`)
- IPC `health-check` handler
- Event `health:status` cada 10s

---

## MEJORA 5: Winston Logger Estructurado + Rotación

### Problema
`console.log`/`console.error` en main process. Sin estructura, rotación, ni niveles. Logs pierden contexto en producción.

### Solución
Winston con transports: Console (pretty) + File (JSON). Rotación 10MB, 30 archivos, gzip. Correlation IDs para tracing IPC.

### Criterios de Aceptación
- [ ] Logs JSON estructurados en archivo, pretty en consola
- [ ] Rotación automática 10MB, 30 archivos, compresión gzip
- [ ] Correlation IDs para tracing requests IPC
- [ ] Nivel configurable via `LOG_LEVEL` env var
- [ ] No pérdida de logs durante rotación

### Archivos Esperados
- `client/src/main/logger/index.ts`
- `client/src/main/logger/transports.ts`
- `client/src/main/logger/rotation.ts`

---

## MEJORA 6: Error Boundaries + Toast + ErrorPayload Tipado

### Problema
Errores en React crashean la app. Sin feedback visual tipado. Errores IPC sin códigos consistentes.

### Solución
`ErrorBoundary` catch errors árbol React. `ErrorToast` con `ErrorPayload` tipado (código, mensaje, recoverable, action). Integración React Query mutation defaults.

### Criterios de Aceptación
- [ ] ErrorBoundary catch errors en árbol React, no crashea app
- [ ] Toast tipado desde `ErrorPayload` con acción "Reintentar" si `recoverable: true`
- [ ] Errores de mutations React Query manejados globalmente
- [ ] Códigos de error consistentes: `LAUNCH_FAILED`, `TUNNEL_TIMEOUT`, `HEALTH_CHECK_FAILED`, `CONFIG_INVALID`, `NAKAMA_UNAVAILABLE`

### Archivos Esperados
- `client/src/renderer/src/components/ErrorBoundary.tsx`
- `client/src/renderer/src/components/ErrorToast.tsx`
- `client/src/renderer/src/hooks/useErrorHandler.ts`

---

## MEJORA 7: Tests (Unit + Integration + E2E)

### Problema
Solo 35 tests unitarios. Sin tests integración (Nakama/PostgreSQL reales). Sin E2E. CI no valida flujos críticos.

### Solución
Vitest (unit), Testcontainers (integración Nakama/PostgreSQL), Playwright (E2E 3 flujos críticos). CI ejecuta todo en PR.

### Criterios de Aceptación
- [ ] Unit tests: > 80% coverage en main process services
- [ ] Integration tests: Nakama + PostgreSQL reales via Testcontainers
- [ ] E2E tests: 3 flujos críticos cubiertos (host directo, join directo, relay)
- [ ] CI ejecuta todos los tests en PR
- [ ] Tests determinísticos, sin flakiness

### Archivos Esperados
- `vitest.config.ts`
- `client/src/main/services/*.test.ts`
- `client/test/integration/nakama.test.ts`
- `client/test/integration/postgres.test.ts`
- `playwright.config.ts`
- `client/test/e2e/host-flow.spec.ts`
- `client/test/e2e/join-flow.spec.ts`
- `client/test/e2e/relay-flow.spec.ts`

---

## MEJORA 8: TypeScript Strict Mode (Incremental)

### Problema
`strict: false` en tsconfig. 40%+ `any` usage. Sin type guards. Refactoring riesgoso.

### Solución
Habilitar `strict: true` incremental por paquetes. Eliminar `any`, agregar type guards. `noUncheckedIndexedAccess: true`.

### Criterios de Aceptación
- [ ] `strict: true` en todos los tsconfig
- [ ] `npm run typecheck` → 0 errores
- [ ] 0 uso de `any` en código nuevo (legacy permitido con `// @ts-expect-error` temporal)
- [ ] Type guards para validación runtime (Zod ya cubre IPC)

### Archivos Esperados
- `packages/ipc-types/tsconfig.json` (strict desde día 1)
- `client/tsconfig.json`, `tsconfig.node.json`, `tsconfig.app.json` (strict habilitado)

---

## MEJORA 9: Config Centralizada (Zod + YAML)

### Problema
Config hardcodeada en `handlers.ts`, `main.ts`, servicios. Sin validación. Cambios requieren rebuild.

### Solución
`ConfigService` con schema Zod + YAML. Defaults commiteados (`app.defaults.yaml`), user config gitignored (`app.yaml`). Hot reload via watch.

### Criterios de Aceptación
- [ ] Config única fuente de verdad (YAML + Zod validation)
- [ ] Defaults commiteados, user config gitignored
- [ ] Hot reload: cambios en YAML → recarga automática (watch)
- [ ] Validación Zod en load y en IPC set-config
- [ ] Tipos TypeScript inferidos del schema

### Archivos Esperados
- `client/src/main/config/schema.ts`
- `client/src/main/config/defaults.ts`
- `client/src/main/config/ConfigService.ts`
- `client/config/app.defaults.yaml`
- `client/config/app.yaml` (gitignored)

---

## MEJORA 10: Electron Forge + Auto-Update

### Problema
Sin packaging automatizado. Sin auto-update. Builds manuales inconsistentes.

### Solución
Electron Forge + Vite plugin. Makers: Squirrel (Windows), DMG (macOS), DEB (Linux). Publisher: GitHub Releases. `electron-updater` para auto-update.

### Criterios de Aceptación
- [ ] Build produce: `.exe` (Windows), `.dmg` (macOS), `.deb` (Linux)
- [ ] Auto-update funcional: check → download → install → restart
- [ ] CI/CD: Tag push → GitHub Release con artifacts
- [ ] Código firmado (Windows/macOS) para evitar warnings

### Archivos Esperados
- `client/forge.config.ts`
- `client/src/main/autoUpdater.ts`
- `.github/workflows/release.yml`

---

## MEJORA 11: i18n (react-i18next) Español/Inglés

### Problema
Strings hardcodeados en español en componentes React. Sin soporte multiidioma.

### Solución
`react-i18next` con detector + backend. `es.json`/`en.json` en `src/i18n/locales/`. Language selector en Settings persiste en config YAML.

### Criterios de Aceptación
- [ ] 100% strings UI en archivos de traducción (0 hardcoded)
- [ ] Español por defecto, inglés disponible
- [ ] Cambio de idioma en runtime sin reload
- [ ] Persistencia de idioma en config YAML

### Archivos Esperados
- `client/src/renderer/src/i18n/index.ts`
- `client/src/renderer/src/i18n/locales/es.json`
- `client/src/renderer/src/i18n/locales/en.json`

---

## MEJORA 12: Nakama OpenAPI Codegen (Cliente Tipado)

### Problema
Cliente Nakama manual, sin tipos, propenso a errores. API Nakama evoluciona.

### Solución
OpenAPI spec de Nakama → `openapi-typescript-codegen` → cliente axios tipado. Wrapper React Query con hooks tipados. Regenerable en CI.

### Criterios de Aceptación
- [ ] Cliente TypeScript generado desde spec oficial Nakama
- [ ] Tipos para: Auth, Matchmaking, Matches, Leaderboards, Storage, RPC
- [ ] Wrapper React Query con hooks tipados: `useAuth()`, `useMatchmaking()`, `useMatch()`
- [ ] Actualizable: regenerar cuando Nakama actualice API

### Archivos Esperados
- `packages/nakama-client/` (npm workspace)
- `scripts/generate-nakama-client.ts`
- `client/src/renderer/src/lib/nakama.ts`

---

## Verificación Final (Definition of Done Global)

Antes de considerar el plan completo:

- [ ] **Documentación actualizada**: `plan-actual/` sincronizado con implementación real
- [ ] **Logs generados**: Entrada en `Logs/` con formato `NN-DESCRIPCION_AAAA-MM-DD_HH-MM-SS.md`
- [ ] **Tests pasan**: `npm run test:all` → 0 fallos
- [ ] **Typecheck pasa**: `npm run typecheck` → 0 errores
- [ ] **Lint pasa**: `npm run lint` → 0 errores
- [ ] **Build funciona**: `npm run build` → artifacts generados
- [ ] **Dev funciona**: `npm run dev` → app levanta sin errores consola
- [ ] **Flujos protegidos verificados** (Regla 15 AGENTS.md):
  - [ ] Host directo (sin bore) → funciona
  - [ ] Host con bore manual → funciona
  - [ ] Join directo (lee relay file) → funciona
- [ ] **Commits**: Mensajes en español, pasado descriptivo
- [ ] **Respaldos**: Archivos modificados grandes respaldados en `Obsoletos/`