# 05-Checklist.md — Checklist de Tareas del Plan de Mejoras

## Resumen del Plan

| Mejora | Título | Prioridad | Estado | Dependencias |
|--------|--------|-----------|--------|--------------|
| 1 | Paquete Shared IPC Types (`@emu-latam/ipc-types`) | **CRÍTICA** | ⬜ Pendiente | Ninguna |
| 2 | NetworkContext + React Query (TanStack Query v5) | **CRÍTICA** | ⬜ Pendiente | Mejora 1 |
| 3 | Servicios Proxy/Forwarder/MITM/Bore + ProcessManager | **CRÍTICA** | ⬜ Pendiente | Mejora 1 |
| 4 | Health Checks + Auto-Restart + Circuit Breaker | **CRÍTICA** | ⬜ Pendiente | Mejora 3 |
| 5 | Winston Logger Estructurado + Rotación | **ALTA** | ⬜ Pendiente | Mejora 1 |
| 6 | Error Boundaries + Toast + ErrorPayload Tipado | **ALTA** | ⬜ Pendiente | Mejora 1, 2 |
| 7 | Tests: Unit + Integration (Testcontainers) + E2E (Playwright) | **ALTA** | ⬜ Pendiente | Mejora 1, 3, 8 |
| 8 | TypeScript Strict Mode (Incremental) | **ALTA** | ⬜ Pendiente | Mejora 1 |
| 9 | Config Centralizada (Zod + YAML) | **MEDIA** | ⬜ Pendiente | Mejora 1, 5 |
| 10 | Electron Forge + Auto-Update (GitHub Releases) | **MEDIA** | ⬜ Pendiente | Mejora 8 |
| 11 | i18n (react-i18next) Español/Inglés | **MEDIA** | ⬜ Pendiente | Mejora 2 |
| 12 | Nakama OpenAPI Codegen (Cliente Tipado) | **BAJA** | ⬜ Pendiente | Mejora 1 |

---

## Orden Crítico de Implementación

```
1 → 3 → 2 → (4 || 5) → 6 → 7 → 8 → 9 → 10
              ↘ 11, 12 (paralelo después de 1)
```

**Leyenda:**
- `→` = Secuencial (debe completarse antes)
- `||` = Paralelo (pueden hacerse simultáneamente)
- `↘` = Paralelo después de hito

---

## MEJORA 1: Paquete Shared IPC Types (`@emu-latam/ipc-types`)

### Tareas

- [ ] **1.1** Crear estructura `packages/ipc-types/` con `package.json`, `tsconfig.json`
- [ ] **1.2** Definir `channels.ts`: `MainToRendererChannels`, `RendererToMainChannels`
- [ ] **1.3** Definir `payloads.ts`: Todos los tipos de payload (LaunchGameArgs, StartRelayTunnelArgs, HealthCheckResult, SystemMetrics, ServiceHealth, ProxyMetrics, ForwarderMetrics, MitmMetrics, BoreMetrics, GameStatus, ErrorPayload)
- [ ] **1.4** Definir `validators.ts`: Esquemas Zod + `validateIpcPayload()` helper
- [ ] **1.5** Definir `errors.ts`: `ErrorPayload`, `ErrorPayloadSchema`
- [ ] **1.6** Crear `index.ts` barrel export
- [ ] **1.7** Configurar build: `npm run build` → `dist/` con declarations
- [ ] **1.8** Agregar al workspace root `package.json`: `"workspaces": ["packages/*"]`
- [ ] **1.9** Instalar en `client`: `npm install @emu-latam/ipc-types`
- [ ] **1.10** Tests unitarios: `validators.test.ts` (payloads válidos/inválidos)
- [ ] **1.11** Actualizar `client/src/preload/index.ts`: Importar tipos + validación Zod en `contextBridge`
- [ ] **1.12** Actualizar `client/src/renderer/src/lib/ipc.ts`: Wrapper tipado `window.ipc`
- [ ] **1.13** Eliminar tipos IPC duplicados en `client/src/main/ipc/`, `client/src/renderer/src/types/`
- [ ] **1.14** Verificar: `npm run typecheck` pasa en todo el workspace

### Criterios de Aceptación (desde 01-Requerimientos.md)
- [ ] Un solo source of truth para todos los tipos IPC
- [ ] Validación runtime con Zod en preload ANTES de `ipcRenderer.invoke`
- [ ] Tipos TypeScript estrictos en main, preload, renderer
- [ ] Tests cubren 100% de esquemas Zod (válidos + inválidos)
- [ ] Build genera `.d.ts` declarations

---

## MEJORA 2: NetworkContext + React Query (TanStack Query v5)

### Tareas

- [ ] **2.1** Instalar dependencias: `@tanstack/react-query`, `@tanstack/react-query-devtools`
- [ ] **2.2** Crear `client/src/renderer/src/providers/NetworkProvider.tsx` con `QueryClient`
- [ ] **2.3** Configurar `QueryClient` defaults: `staleTime: 5000`, `retry: 2`, `refetchOnWindowFocus: true`
- [ ] **2.4** Crear `client/src/renderer/src/context/NetworkContext.tsx` con `useNetwork()` hook
- [ ] **2.5** Implementar `useHealthCheck()`: query `['health']`, refetch 10s, `enabled: true`
- [ ] **2.6** Implementar `useRelayStatus()`: query `['relay-status']`, refetch 5s, `enabled: false` (condicional)
- [ ] **2.7** Implementar `useLaunchGame()`: mutation `launch-game`, toast success/error
- [ ] **2.8** Implementar `useRelayTunnel()`: mutations `start-relay-tunnel`, `stop-relay-tunnel`
- [ ] **2.9** Implementar `useMatchmaking(matchId)`: query `['matchmaking', matchId]`, enabled por matchId
- [ ] **2.9** Implementar `useMetrics()`: query `['metrics']`, refetch 15s
- [ ] **2.10** Integrar `NetworkProvider` en `main.tsx` (wrap App)
- [ ] **2.11** Migrar componentes existentes (`HostPanel`, `JoinPanel`, `RelayPanel`) a usar hooks
- [ ] **2.12** Agregar React Query DevTools en desarrollo
- [ ] **2.13** Tests: Mock `window.ipc` + React Query testing utilities

### Criterios de Aceptación
- [ ] Estado de red centralizado, sin `useState`/`useEffect` manuales para datos servidor
- [ ] Refetch automático: health 10s, relay 5s, metrics 15s
- [ ] Mutations con optimistic updates donde aplique
- [ ] Error handling unificado via `onError` en mutation defaults
- [ ] Loading/error/empty states manejados por React Query

---

## MEJORA 3: Servicios Proxy/Forwarder/MITM/Bore + ProcessManager

### Tareas

- [ ] **3.1** Crear `client/src/main/services/ProcessManager.ts`
  - [ ] `ServiceConfig` interface: name, startFn, stopFn, healthCheck, restartPolicy
  - [ ] `startService(config)`, `stopService(name)`, `restartService(name)`
  - [ ] `getStatus(name)`, `getAllStatus()`
  - [ ] Health check loop con interval configurable
  - [ ] Event emitter: `service:started`, `service:stopped`, `service:restarted`, `service:circuit-open`, `health:status`
- [ ] **3.2** Crear `client/src/main/services/ProxyService.ts`
  - [ ] `start(config: { listenPort, targetHost, targetPort })`
  - [ ] `stop()`
  - [ ] `healthCheck()`: TCP connect a listenPort
  - [ ] `getMetrics()`: `ProxyMetrics { connectionsTotal, connectionsActive, bytesProxied, errors }`
  - [ ] Manejo bidireccional `socket.pipe(target)`, `target.pipe(socket)`
  - [ ] Error handling: `ECONNREFUSED`, `ETIMEDOUT`, cleanup sockets
- [ ] **3.3** Crear `client/src/main/services/ForwarderService.ts`
  - [ ] `start(config: { listenPort, targetPort })` - targetHost = `getLanIp()`
  - [ ] `stop()`
  - [ ] `healthCheck()`: TCP connect a listenPort
  - [ ] `getMetrics()`: `ForwarderMetrics { connectionsTotal, connectionsActive, bytesForwarded, errors }`
  - [ ] **Crítico**: Usar LAN IP (no 127.0.0.1) para evitar conflicto con proxy
- [ ] **3.4** Crear `client/src/main/services/MitmRelayService.ts`
  - [ ] `start(config: { listenPort, targetHost, targetPort })`
  - [ ] `stop()`
  - [ ] `healthCheck()`
  - [ ] `getMetrics()`: `MitmMetrics { connectionsTotal, connectionsActive, framesIntercepted, bytesIntercepted, errors }`
  - [ ] Parseo frames FBNeo (opcional, para debugging)
  - [ ] Event emitter: `frame` con `ParsedFrame`
- [ ] **3.5** Crear `client/src/main/services/BoreService.ts`
  - [ ] `start(config: { localPort, boreHost, borePort, authToken? })`
  - [ ] `stop()`
  - [ ] `healthCheck()`: verificar proceso vivo + puerto asignado
  - [ ] `getMetrics()`: `BoreMetrics { connected, assignedPort, restarts, uptimeMs, lastError }`
  - [ ] Spawn `bore.exe local {localPort} --to {boreHost}:{borePort}`
  - [ ] Parsear stdout para puerto dinámico: `listening on bore.pub:XXXXX`
  - [ ] Event emitter: `connected(port)`, `disconnected`, `error`
  - [ ] Auto-reconnect con backoff (delegado a ProcessManager)
- [ ] **3.6** Crear `client/src/main/services/GameLauncher.ts`
  - [ ] `launch(args: LaunchGameArgs)`: spawn RetroArch con args correctos
  - [ ] `stop(pid)`: kill process tree
  - [ ] `getStatus(pid)`: `GameStatus { pid, running, core, gamePath }`
  - [ ] Args host: `--host --port 55435`
  - [ ] Args guest directo: `--connect {ip} --port 55435`
  - [ ] Args guest relay: `--connect 127.0.0.1` (proxy en 55435)
- [ ] **3.7** Actualizar `client/src/main/ipc/handlers.ts`: Orquestar servicios via ProcessManager
- [ ] **3.8** Registrar handlers IPC: `start-relay-tunnel`, `stop-relay-tunnel`, `launch-game`, `health-check`, `get-metrics`, `get-relay-status`
- [ ] **3.9** Tests unitarios: Mock `net` module, verificar lifecycle, métricas, health checks

### Criterios de Aceptación
- [ ] ProcessManager maneja lifecycle completo: start → running → health checks → restart → stop
- [ ] Proxy: 55435 → bore.pub:puerto_dinámico (bidireccional)
- [ ] Forwarder: 55436 → LAN_IP:55435 (usa `getLanIp()`, NO 127.0.0.1)
- [ ] MITM: 55437 → bore.pub:puerto_dinámico (intercepta frames)
- [ ] Bore: Spawn, parse puerto, reconexión automática
- [ ] GameLauncher: Args correctos por modo (host/guest directo/guest relay)
- [ ] Métricas expuestas via IPC `get-metrics`
- [ ] Tests unitarios > 80% coverage en servicios

---

## MEJORA 4: Health Checks + Auto-Restart + Circuit Breaker

### Tareas

- [ ] **4.1** Implementar `HealthCheckConfig` en ProcessManager: `intervalMs`, `timeoutMs`, `retries`, `check()`
- [ ] **4.2** Implementar `RestartPolicy`: `maxRetries`, `backoffMs[]`, `resetAfterMs`
- [ ] **4.3** Health check loop: cada `intervalMs`, timeout `timeoutMs`, contar fallos consecutivos
- [ ] **4.4** Tras `retries` fallos → marcar `unhealthy` → trigger `restartService()`
- [ ] **4.5** Restart con backoff exponencial: `backoffMs[attempt]` (ej: 2000, 4000, 8000)
- [ ] **4.6** Circuit breaker: tras `maxRetries` reinicios fallidos → `service:circuit-open`, no reintentar hasta `resetAfterMs` sano
- [ ] **4.7** Health checks por servicio:
  - [ ] Proxy: TCP connect a 55435
  - [ ] Forwarder: TCP connect a 55436
  - [ ] MITM: TCP connect a 55437
  - [ ] Bore: Proceso vivo + puerto asignado válido
- [ ] **4.8** IPC `health-check`: retorna `HealthCheckResult { healthy: boolean, services: ServiceHealth[], timestamp }`
- [ ] **4.9** Event `health:status` emitido cada 10s con estado agregado
- [ ] **4.10** Tests: Simular fallos, verificar restart, circuit breaker, recovery

### Criterios de Aceptación
- [ ] Health check cada 10s por defecto, configurable
- [ ] 3 fallos consecutivos = unhealthy → restart automático
- [ ] Backoff exponencial: 2s, 4s, 8s entre reintentos
- [ ] Circuit breaker tras 3 reinicios fallidos, reset tras 60s sano
- [ ] Estado expuesto via IPC y events para UI

---

## MEJORA 5: Winston Logger Estructurado + Rotación

### Tareas

- [ ] **5.1** Instalar: `winston`, `winston-daily-rotate-file` (o rotación nativa)
- [ ] **5.2** Crear `client/src/main/logger/index.ts`: `logger` singleton
- [ ] **5.3** Crear `client/src/main/logger/transports.ts`: Console (pretty) + File (JSON)
- [ ] **5.4** Crear `client/src/main/logger/rotation.ts`: 10MB, max 30 archivos, gzip
- [ ] **5.5** Configurar formato: timestamp ISO, level, message, service, pid, appVersion, correlationId
- [ ] **5.6** Integrar en `client/src/main/index.ts`: Inicializar logger al inicio
- [ ] **5.7** Reemplazar `console.log/error` en main process por `logger.info/warn/error`
- [ ] **5.8** Agregar `correlationId` en handlers IPC (generar al inicio de cada request)
- [ ] **5.9** Logs estructurados en servicios: `logger.info({ service: 'proxy', port }, 'message')`
- [ ] **5.10** Verificar rotación: escribir > 10MB → archivo rotado a `logs/rotated/main_process-YYYY-MM-DD.log.gz`
- [ ] **5.11** Variable `LOG_LEVEL` para controlar nivel (error/warn/info/debug)

### Criterios de Aceptación
- [ ] Logs JSON estructurados en archivo, pretty en consola
- [ ] Rotación automática 10MB, 30 archivos, compresión gzip
- [ ] Correlation IDs para tracing requests IPC
- [ ] Nivel configurable via `LOG_LEVEL` env var
- [ ] No pérdida de logs durante rotación

---

## MEJORA 6: Error Boundaries + Toast + ErrorPayload Tipado

### Tareas

- [ ] **6.1** Crear `client/src/renderer/src/components/ErrorBoundary.tsx`
  - [ ] `componentDidCatch(error, errorInfo)` → log a consola/Sentry
  - [ ] Fallback UI: mensaje amigable + botón "Recargar"
  - [ ] `resetKeys` prop para resetear estado
- [ ] **6.2** Crear `client/src/renderer/src/components/ErrorToast.tsx`
  - [ ] `useErrorToast()` hook
  - [ ] Toast con `ErrorPayload`: código, mensaje, recoverable, action "Reintentar"
  - [ ] Integración con `sonner` o `react-hot-toast`
- [ ] **6.3** Crear `client/src/renderer/src/hooks/useErrorHandler.ts`
  - [ ] Handler global para mutations React Query
  - [ ] Mapea errores a `ErrorPayload` y muestra toast
- [ ] **6.4** Integrar `ErrorBoundary` en `App.tsx` (wrap routes)
- [ ] **6.5** Integrar `useErrorHandler` en `NetworkContext` mutation defaults
- [ ] **6.6** Actualizar `ErrorPayload` en `@emu-latam/ipc-types` si faltan códigos
- [ ] **6.7** Tests: Simular error en componente, verificar boundary catch; simular mutation error, verificar toast

### Criterios de Aceptación
- [ ] ErrorBoundary catch errors en árbol React, no crashea app
- [ ] Toast tipado desde `ErrorPayload` con acción "Reintentar" si `recoverable: true`
- [ ] Errores de mutations React Query manejados globalmente
- [ ] Códigos de error consistentes: `LAUNCH_FAILED`, `TUNNEL_TIMEOUT`, `HEALTH_CHECK_FAILED`, `CONFIG_INVALID`, `NAKAMA_UNAVAILABLE`

---

## MEJORA 7: Tests (Unit + Integration + E2E)

### Tareas

- [ ] **7.1** Configurar Vitest: `vitest.config.ts` con `environment: 'node'`, coverage
- [ ] **7.2** Tests Unitarios (objetivo > 80% coverage en main process):
  - [ ] `ProxyService.test.ts`: start/stop, healthCheck, métricas, error handling
  - [ ] `ForwarderService.test.ts`: start/stop, LAN IP resolution, pipe bidireccional
  - [ ] `BoreService.test.ts`: spawn, parse puerto, reconexión, healthCheck
  - [ ] `ProcessManager.test.ts`: lifecycle, restart policy, circuit breaker, events
  - [ ] `validators.test.ts`: Zod schemas valid/invalid payloads
  - [ ] `network.test.ts`: `getLanIp()`, `waitForPort()`
- [ ] **7.3** Configurar Testcontainers: `@testcontainers/postgresql`, `@testcontainers/nakama` (custom)
- [ ] **7.4** Tests Integración (Testcontainers):
  - [ ] `nakama.test.ts`: Nakama Docker → matchmaking, auth, match create/join
  - [ ] `postgres.test.ts`: PostgreSQL → migraciones, queries
- [ ] **7.5** Configurar Playwright: `playwright.config.ts` con `webServer` (dev server)
- [ ] **7.6** Tests E2E (Playwright):
  - [ ] `host-flow.spec.ts`: Host directo → launch game → verify RA process
  - [ ] `join-flow.spec.ts`: Join directo → connect → verify RA process
  - [ ] `relay-flow.spec.ts`: Host Bore → Join con relay → verify conexión
- [ ] **7.7** CI: `npm run test:all` en GitHub Actions
- [ ] **7.8** Coverage threshold: 80% unit, 60% integration

### Criterios de Aceptación
- [ ] Unit tests: > 80% coverage en main process services
- [ ] Integration tests: Nakama + PostgreSQL reales via Testcontainers
- [ ] E2E tests: 3 flujos críticos cubiertos (host directo, join directo, relay)
- [ ] CI ejecuta todos los tests en PR
- [ ] Tests determinísticos, sin flakiness

---

## MEJORA 8: TypeScript Strict Mode (Incremental)

### Tareas

- [ ] **8.1** Habilitar strict en `packages/ipc-types/tsconfig.json` (desde día 1)
- [ ] **8.2** Habilitar strict en `client/tsconfig.json`, `tsconfig.node.json`, `tsconfig.app.json`
- [ ] **8.3** Fix `client/src/main/`: Eliminar `any`, agregar type guards, tipar `ipcMain` handlers
- [ ] **8.4** Fix `client/src/preload/`: Tipar `contextBridge`, validación Zod ya ayuda
- [ ] **8.5** Fix `client/src/renderer/`: Tipar hooks, componentes, props, React Query types
- [ ] **8.6** Configurar `noUncheckedIndexedAccess: true`
- [ ] **8.7** Configurar `exactOptionalPropertyTypes: true` (opcional, breaking)
- [ ] **8.8** `npm run typecheck` pasa sin errores en todo el workspace
- [ ] **8.9** Documentar patrones de migración en `04-Codigo.md` (type guards, unknown, etc.)

### Criterios de Aceptación
- [ ] `strict: true` en todos los tsconfig
- [ ] `npm run typecheck` → 0 errores
- [ ] 0 uso de `any` en código nuevo (legacy permitido con `// @ts-expect-error` temporal)
- [ ] Type guards para validación runtime (Zod ya cubre IPC)

---

## MEJORA 9: Config Centralizada (Zod + YAML)

### Tareas

- [ ] **9.1** Instalar: `zod`, `yaml` (js-yaml)
- [ ] **9.2** Crear `client/src/main/config/schema.ts`: `ConfigSchema` (Zod) + `Config` type
- [ ] **9.3** Crear `client/src/main/config/defaults.ts`: Valores por defecto
- [ ] **9.4** Crear `client/src/main/config/ConfigService.ts`: `load()`, `get()`, `set()`, `save()`, `watch()`
- [ ] **9.4** Crear `client/config/app.defaults.yaml` (commiteado)
- [ ] **9.5** Crear `client/config/app.yaml` (gitignored, generado en primer run)
- [ ] **9.6** Integrar en `client/src/main/index.ts`: Cargar config al inicio
- [ ] **9.7** Inyectar config en servicios: `ProxyService`, `BoreService`, `GameLauncher`, `logger`
- [ ] **9.8** IPC `get-config`, `set-config` (validado con Zod)
- [ ] **9.9** UI Settings page: Formulario reactivo con config actual
- [ ] **9.10** Tests: Validación schema, load/save, defaults, merge

### Criterios de Aceptación
- [ ] Config única fuente de verdad (YAML + Zod validation)
- [ ] Defaults commiteados, user config gitignored
- [ ] Hot reload: cambios en YAML → recarga automática (watch)
- [ ] Validación Zod en load y en IPC set-config
- [ ] Tipos TypeScript inferidos del schema

---

## MEJORA 10: Electron Forge + Auto-Update

### Tareas

- [ ] **10.1** Instalar: `@electron-forge/cli`, `@electron-forge/plugin-vite`, `@electron-forge/maker-squirrel`, `@electron-forge/maker-dmg`, `@electron-forge/maker-deb`, `@electron-forge/publisher-github`, `electron-updater`
- [ ] **10.2** Crear `client/forge.config.ts`: packager, makers (squirrel, dmg, deb), plugins (vite), publishers (github)
- [ ] **10.3** Configurar `electron-updater` en `client/src/main/autoUpdater.ts`
  - [ ] `autoUpdater.checkForUpdatesAndNotify()`
  - [ ] Eventos: `update-available`, `update-downloaded`, `error`
  - [ ] IPC `check-updates`, `install-update`
- [ ] **10.4** Crear `.github/workflows/release.yml`:
  - [ ] Trigger: tag `v*` o manual dispatch
  - [ ] Build: `npm run forge:make`
  - [ ] Sign: Windows (cert), macOS (notarize), Linux (gpg)
  - [ ] Publish: `npm run forge:publish` → GitHub Releases
- [ ] **10.5** Version bump script: `npm version patch|minor|major` → tag → push → CI release
- [ ] **10.6** Test: Instalar build local, verificar auto-update apunta a GitHub Releases

### Criterios de Aceptación
- [ ] Build produce: `.exe` (Windows), `.dmg` (macOS), `.deb` (Linux)
- [ ] Auto-update funcional: check → download → install → restart
- [ ] CI/CD: Tag push → GitHub Release con artifacts
- [ ] Código firmado (Windows/macOS) para evitar warnings

---

## MEJORA 11: i18n (react-i18next) Español/Inglés

### Tareas

- [ ] **11.1** Instalar: `react-i18next`, `i18next`, `i18next-browser-languagedetector`, `i18next-http-backend`
- [ ] **11.2** Crear `client/src/renderer/src/i18n/index.ts`: init i18n, detector, backend
- [ ] **11.3** Crear `client/src/renderer/src/i18n/locales/es.json`: Todas las claves (ver 04-Codigo.md)
- [ ] **11.4** Crear `client/src/renderer/src/i18n/locales/en.json`: Traducciones inglés
- [ ] **11.5** Integrar en `main.tsx`: `import './i18n'` antes de App
- [ ] **11.6** Migrar componentes: `t('key')` en lugar de strings hardcodeados
- [ ] **11.7** Language selector en Settings: Cambia `i18n.changeLanguage()`, persiste en config
- [ ] **11.8** Tests: Verificar traducciones existen para todas las claves usadas

### Criterios de Aceptación
- [ ] 100% strings UI en archivos de traducción (0 hardcoded)
- [ ] Español por defecto, inglés disponible
- [ ] Cambio de idioma en runtime sin reload
- [ ] Persistencia de idioma en config YAML

---

## MEJORA 12: Nakama OpenAPI Codegen (Cliente Tipado)

### Tareas

- [ ] **12.1** Obtener OpenAPI spec de Nakama: `curl http://localhost:7350/openapi.json > backend/nakama/openapi.json`
- [ ] **12.2** Crear `packages/nakama-client/` como npm workspace
- [ ] **12.3** Script `scripts/generate-nakama-client.ts`: `openapi-typescript-codegen` → axios client
- [ ] **12.4** Generar cliente: `npm run generate:nakama`
- [ ] **12.5** Publicar local: `npm pack` + `file:` dependency en `client/package.json`
- [ ] **12.6** Crear `client/src/renderer/src/lib/nakama.ts`: Wrapper tipado para React Query
- [ ] **12.7** Migrar llamadas Nakama directas a cliente tipado
- [ ] **12.8** Tests: Verificar tipos generados compilan, llamadas básicas funcionan

### Criterios de Aceptación
- [ ] Cliente TypeScript generado desde spec oficial Nakama
- [ ] Tipos para: Auth, Matchmaking, Matches, Leaderboards, Storage, RPC
- [ ] Wrapper React Query con hooks tipados: `useAuth()`, `useMatchmaking()`, `useMatch()`
- [ ] Actualizable: regenerar cuando Nakama actualice API

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
- [ ] **Flujos protegidos verificados** (Regla 15):
  - [ ] Host directo (sin bore) → funciona
  - [ ] Host con bore manual → funciona
  - [ ] Join directo (lee relay file) → funciona
- [ ] **Commits**: Mensajes en español, pasado descriptivo
- [ ] **Respaldos**: Archivos modificados grandes respaldados en `Obsoletos/`

---

## Notas de Implementación

### Orden Recomendado de Commits (por mejora)

```
feat(ipc-types): add shared IPC types package with Zod validation
feat(network-context): add NetworkContext + React Query for server state
feat(services): add ProxyService, ForwarderService, MitmRelayService, BoreService, ProcessManager
feat(health): add health checks, auto-restart, circuit breaker
feat(logger): add Winston structured logging with rotation
feat(errors): add ErrorBoundary, ErrorToast, typed ErrorPayload
feat(tests): add unit, integration (testcontainers), e2e (playwright) tests
feat(typescript): enable strict mode across workspace
feat(config): add centralized Zod+YAML configuration
feat(forge): add Electron Forge + auto-update
feat(i18n): add react-i18next Spanish/English
feat(nakama): add OpenAPI codegen typed client
```

### Riesgos y Mitigaciones (Recordatorio)

| Riesgo | Mitigación |
|--------|------------|
| Romper flujos protegidos (Regla 15) | **NO MODIFICAR** handlers existentes `launch-game`, `start-relay-tunnel` V1. Agregar NUEVOS handlers V2. |
| TypeScript strict rompe build | Migración incremental por paquetes, `// @ts-expect-error` temporal |
| Testcontainers lentos en CI | Cache Docker layers, paralelizar jobs, timeout generoso |
| Electron Forge config compleja | Empezar simple (solo Windows), añadir macOS/Linux después |
| Nakama spec cambia | Codegen script versionado, regenerar en CI semanal |

---

## Referencias

- `01-Requerimientos.md`: Requisitos detallados y criterios de aceptación por mejora
- `02-Analisis.md`: Análisis técnico, alternativas, decisiones, orden crítico
- `03-Diseno.md`: Arquitectura, diagramas, flujos, contratos IPC
- `04-Codigo.md`: Archivos, funciones, logs, puntos de entrada
- `AGENTS.md`: Reglas globales (Regla 13: Documentation-First, Regla 15: Flujos Protegidos)