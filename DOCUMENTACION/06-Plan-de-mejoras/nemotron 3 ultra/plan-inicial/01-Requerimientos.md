# 01-Requerimientos.md — Plan de Mejoras Nemotron 3 Ultra

## 1. Problema y Contexto

El proyecto **emu-latam** es una aplicación Electron + React + TypeScript que permite netplay de juegos retro (FBNeo/RetroArch) mediante:
- **Nakama**: Matchmaking, autenticación, relay de señales WebSocket
- **Bore**: Túneles TCP públicos (bore.pub) para conectividad NAT traversal
- **RetroArch/FBNeo**: Core de emulación con netplay TCP nativo (puerto 55435)
- **Arquitectura actual**: Proxy TCP local + Forwarder LAN + MITM Relay para inspección de tráfico

**Problemas actuales identificados:**
1. **Acoplamiento fuerte** entre Main Process y Renderer: tipos IPC duplicados, sin validación en runtime
2. **Gestión de red frágil**: Health checks inexistentes, procesos huérfanos (bore, proxy, forwarder), sin reintentos automáticos
3. **Logging inconsistente**: `console.log` disperso, sin niveles, sin rotación, difícil debugging en producción
4. **Manejo de errores reactivo**: Error boundaries ausentes, toasts inexistentes, crashes silenciosos en Main
5. **Testing inexistente**: 0 tests de integración, 0 E2E, solo 35 tests unitarios de flujos estables
6. **TypeScript laxo**: `strict: false`, `any` implícitos, sin validación de tipos IPC en runtime
7. **Configuración hardcodeada**: Puertos, IPs, timeouts, URLs hardcodeados en múltiples archivos
8. **Sin i18n**: Solo español, sin preparación para inglés/portugués (mercado Latam)
9. **Sin CI/CD ni empaquetado**: No auto-updates, no code signing, no pipeline
10. **Nakama sin contratos**: Cliente TypeScript manual, sin OpenAPI, sin contract testing

## 2. Objetivos Generales

Transformar emu-latam de **prototipo funcional** a **aplicación lista para producción** mediante 12 mejoras estructuradas en 3 niveles de prioridad:

| Prioridad | Mejoras | Objetivo Principal |
|-----------|---------|-------------------|
| **ALTA** (3) | 1, 2, 3 | Fundamentos: tipos compartidos, estado de red reactivo, arquitectura proxy/forwarder/MITM robusta |
| **MEDIA** (5) | 4, 5, 6, 7, 8 | Resiliencia: health checks, logging estructurado, UX errores, testing real, TypeScript estricto |
| **BAJA** (4) | 9, 10, 11, 12 | Calidad de producto: config externalizada, packaging/auto-update, i18n, contratos Nakama |

## 3. Alcance por Mejora

### ALTA PRIORIDAD

#### Mejora 1: Paquete Shared de Tipos IPC (`@emu-latam/ipc-types`)
- **Problema**: Tipos IPC duplicados entre `client/src/main`, `client/src/preload`, `client/src/renderer`
- **Objetivo**: Paquete npm interno con tipos TypeScript + validadores Zod + codegen automático
- **Entregables**: 
  - `packages/ipc-types/` con `package.json`, `tsconfig.json`, `src/index.ts`, `src/validators.ts`
  - Scripts de build + publish local (`npm pack` + `file:` dependency)
  - Tipos: `IpcChannels`, `LaunchGameArgs`, `RelayTunnelArgs`, `HealthCheckResult`, `ErrorPayload`, etc.
  - Validadores Zod para cada canal IPC con `parse()` en preload (runtime validation)

#### Mejora 2: NetworkContext + React Query (TanStack Query v5)
- **Problema**: Estado de red disperso (useState en componentes, IPC calls directos, sin cache, sin reintentos)
- **Objetivo**: Contexto React único + React Query para server state (health checks, matchmaking, relay status)
- **Entregables**:
  - `client/src/renderer/src/context/NetworkContext.tsx` (Provider + hooks `useNetwork`, `useHealthCheck`, `useMatchmaking`)
  - `client/src/renderer/src/services/api.ts` (wrappers IPC tipados con React Query mutations/queries)
  - Configuración global: `queryClient` con `retry: 3`, `staleTime: 30s`, `cacheTime: 5m`
  - Devtools en desarrollo

#### Mejora 3: Arquitectura Proxy/Forwarder/MITM Robusta
- **Problema**: Código actual en `client/src/main/services/` frágil, sin health checks, limpieza manual, MITM básico
- **Objetivo**: Servicios systemd-style en Main Process con lifecycle gestionado, health checks TCP, MITM con buffering inteligente
- **Entregables**:
  - `client/src/main/services/ProxyService.ts` (TCP proxy 127.0.0.1:55435 → bore.pub:XXXXX)
  - `client/src/main/services/ForwarderService.ts` (TCP forwarder 127.0.0.1:55436 → LAN_IP:55435)
  - `client/src/main/services/MitmRelayService.ts` (MITM con framing length-prefixed, backpressure, métricas)
  - `client/src/main/services/ProcessManager.ts` (spawn, health check, restart, cleanup, signal handling)
  - IPC handlers tipados: `start-relay-tunnel`, `stop-relay-tunnel`, `health-check`, `get-metrics`

### MEDIA PRIORIDAD

#### Mejora 4: Health Checks + Resiliencia de Procesos
- **Problema**: Procesos bore/proxy/forwarder/RetroArch pueden morir silenciosamente
- **Objetivo**: Health checks periódicos (TCP connect + payload), auto-restart con backoff exponencial, circuit breaker
- **Entregables**:
  - `ProcessManager.healthCheck(interval: 10s, timeout: 3s, retries: 3)`
  - `CircuitBreaker` (failure threshold: 5, reset timeout: 60s)
  - IPC `health-check` retorna `{ proxy: boolean, forwarder: boolean, bore: boolean, retroarch: boolean, timestamp: number }`
  - UI: indicador de estado en tiempo real (verde/amarillo/rojo) en header

#### Mejora 5: Logging Estructurado (Winston + Rotación)
- **Problema**: `console.log` disperso, sin niveles, sin rotación, imposible debugging producción
- **Objetivo**: Winston con transports (Console + File + Rotated File), niveles, contexto estructurado, correlation IDs
- **Entregables**:
  - `client/src/main/logger.ts` (Winston config: `combined` format, `json` para archivos, `pretty` para consola)
  - Rotación: `logs/main_process-%DATE%.log`, maxSize: 10MB, maxFiles: 30, compress: true
  - Niveles: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`
  - Context enrichment: `{ service: 'proxy', correlationId: 'uuid', pid: 1234 }`
  - IPC `get-logs` para UI (últimos N líneas, filtrado por nivel/servicio)

#### Mejora 6: Manejo de Errores + UX (Error Boundaries + Toasts)
- **Problema**: Crashes silenciosos, sin feedback usuario, errores IPC no tipados
- **Objetivo**: Error Boundaries React + React Hot Toast + Error Payload tipado IPC + logging automático
- **Entregables**:
  - `client/src/renderer/src/components/ErrorBoundary.tsx` (class component, `componentDidCatch`, report to logger)
  - `client/src/renderer/src/hooks/useToast.ts` (wrapper `toast.error/success/loading/promise`)
  - `ErrorPayload` en `@emu-latam/ipc-types`: `{ code: string, message: string, context?: Record<string, unknown>, recoverable: boolean }`
  - IPC handlers wrappped: `try/catch` → `logger.error` → `return { success: false, error: ErrorPayload }`
  - UI: Toaster global en `App.tsx`, botón "Reintentar" en toasts de error recuperable

#### Mejora 7: Tests de Integración Reales (TestContainers + Playwright)
- **Problema**: 0 tests integración/E2E, solo 35 tests unitarios flujos estables
- **Objetivo**: TestContainers para Nakama/Postgres/Redis + Playwright E2E (Electron + Web) + CI pipeline
- **Entregables**:
  - `client/test/integration/` con `@testcontainers/modules/nakama` (o Docker Compose test)
  - `client/test/e2e/` Playwright: `launch-game.spec.ts`, `relay-tunnel.spec.ts`, `matchmaking.spec.ts`
  - `docker-compose.test.yml` (Nakama + Postgres + Redis efímeros)
  - Scripts: `npm run test:integration`, `npm run test:e2e`, `npm run test:all`
  - GitHub Actions: matrix (ubuntu-latest, windows-latest) con services

#### Mejora 8: TypeScript Strict Mode
- **Problema**: `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, `any` abundante
- **Objetivo**: `strict: true` en todos los `tsconfig.json` sin errores, migración incremental
- **Entregables**:
  - `tsconfig.base.json` con `strict: true` + todas las flags strict
  - `client/tsconfig.json`, `client/tsconfig.node.json`, `client/tsconfig.app.json` extienden base
  - `packages/ipc-types/tsconfig.json` strict
  - Fix progresivo: `noImplicitAny`, `strictNullChecks`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
  - `eslint.config.js` con `@typescript-eslint/strict-type-checked`

### BAJA PRIORIDAD

#### Mejora 9: Configuración Externalizada (Zod + Config Files)
- **Problema**: Puertos, IPs, timeouts, URLs hardcodeados en 15+ archivos
- **Objetivo**: Schema Zod + archivos `.env` + `config.yaml` + validación startup + hot-reload opcional
- **Entregables**:
  - `client/src/shared/config/schema.ts` (Zod schema: `ports`, `network`, `nakama`, `bore`, `retroarch`, `logging`)
  - `client/config/default.yaml` (valores por defecto)
  - `client/config/local.yaml` (override local, gitignored)
  - `client/config/production.yaml` (override prod)
  - `ConfigService` singleton con `load()`, `get<T>(key)`, `watch()` (chokidar)
  - Validación al arranque: `schema.parse(config)` → exit(1) si inválido

#### Mejora 10: Empaquetado + Distribución (Auto-Updates + Code Signing + CI/CD)
- **Problema**: Solo `npm run build`, sin instalador, sin auto-update, sin firma, sin pipeline
- **Objetivo**: Electron Forge + electron-updater + GitHub Actions + Code Signing (Windows) + Release drafter
- **Entregables**:
  - `forge.config.ts` (makers: `@electron-forge/maker-squirrel`, `@electron-forge/maker-dmg`, `@electron-forge/maker-deb`)
  - `electron-updater` config: `provider: 'github'`, `autoDownload: true`, `autoInstallOnAppQuit: true`
  - `.github/workflows/release.yml`: build matrix (win/mac/linux), sign (Windows: `windows-signtool`, macOS: `notarytool`), publish draft release
  - `package.json`: `build` config, `publish` config, `version` script
  - Code signing certs en secrets (GitHub Actions / Azure Key Vault)

#### Mejora 11: Internacionalización (i18n - react-i18next)
- **Problema**: Solo español, mercado Latam requiere EN/PT-BR
- **Objetivo**: react-i18next + namespaces + detector + selector UI + extracción automática
- **Entregables**:
  - `client/src/renderer/src/i18n/index.ts` (config i18next: `es`, `en`, `pt-BR`, fallback `es`)
  - Namespaces: `common`, `errors`, `network`, `settings`, `netplay`
  - `client/src/renderer/src/i18n/resources/` (JSON por locale/namespace)
  - `LanguageSelector.tsx` en Settings (persiste en localStorage)
  - `useTranslation` hook en todos los componentes
  - Script `npm run i18n:extract` (i18next-scanner) → CI check

#### Mejora 12: Nakama OpenAPI + Generación Cliente TypeScript
- **Problema**: Cliente Nakama manual, sin contratos, breaking changes silenciosos
- **Objetivo**: OpenAPI spec desde Nakama + `openapi-typescript-codegen` → cliente tipado + contract testing
- **Entregables**:
  - `backend/nakama/openapi.yaml` (exportado de Nakama o escrito a mano)
  - `packages/nakama-client/` generado: `api.ts`, `schemas.ts`, `client.ts` (fetch/axios wrapper)
  - `npm run nakama:generate` script
  - Contract tests: `pact` o `schemathesis` contra Nakama real en CI
  - Versionado semántico del cliente (`@emu-latam/nakama-client@1.x.x`)

## 4. Restricciones y Supuestos

### Restricciones Técnicas
- **Electron 28+** (maintenance LTS), **Node 20+**, **TypeScript 5.3+**
- **Windows 10/11** como target principal (desarrollo y usuarios), macOS/Linux secundarios
- **RetroArch/FBNeo** binarios externos, no modificables, puerto netplay fijo 55435
- **Bore.pub** servicio externo gratuito, sin SLA, puerto dinámico asignado en runtime
- **Nakama** self-hosted (Docker), versión 3.21+, PostgreSQL 15+, Redis 7+

### Restricciones de Proyecto (AGENTS.md)
- **Idioma obligatorio**: Español en todo (código, docs, commits, logs)
- **Documentation-first**: Crear docs ANTES de código (Regla 13)
- **Flujos bloqueados NO modificables** (Regla 15): Host directo, Host bore manual, Join directo
- **Modularidad**: Nuevos flujos = nuevos IPC handlers, no tocar `launch-game` existente (Regla 14)
- **Logs**: Usar sistema existente `console.log` interceptado → `logs/main_process.log` con rotación 500KB (Regla 17)
- **Verificación obligatoria**: `npm run dev` sin errores TS + Vite OK antes de cerrar tarea (Regla 12)

### Supuestos
- Equipo: 1-2 desarrolladores full-stack (Electron + React + Node)
- Timeline estimado: 12-16 semanas para ALTA+MEDIA, 4-6 semanas adicionales para BAJA
- Presupuesto: Code signing cert (~$200/año), GitHub Actions minutes (gratis para público)
- Nakama ya desplegado en staging/producción con datos de prueba

## 5. Criterios de Aceptación Generales

| Mejora | Criterio de Aceptación (Definition of Done) |
|--------|---------------------------------------------|
| 1. Shared IPC Types | `npm run build` en `packages/ipc-types` genera `.d.ts` + `.js`; `client` compila sin errores TS usando `import { LaunchGameArgs } from '@emu-latam/ipc-types'`; validadores Zod pasan tests unitarios |
| 2. NetworkContext + React Query | `useHealthCheck()` retorna datos reactivos cada 10s; `useMatchmaking()` maneja loading/error/data; DevTools muestra queries; 0 `useState` para estado red en componentes |
| 3. Proxy/Forwarder/MITM | `start-relay-tunnel` levanta proxy + forwarder + bore + MITM; health check TCP OK en <3s; MITM loggea frames length-prefixed; cleanup al cerrar ventana |
| 4. Health Checks | `health-check` IPC retorna estado 4 servicios; UI muestra indicador tiempo real; auto-restart tras crash bore (max 3 reintentos, backoff 2s/4s/8s) |
| 5. Winston Logging | `logs/main_process-2026-01-15.log` existe, JSON válido, rotación a 10MB; `logger.info({service:'proxy'}, 'msg')` aparece estructurado; IPC `get-logs` retorna últimas 100 líneas |
| 6. Error Boundaries + Toasts | Crash en componente hijo muestra ErrorBoundary UI + toast error; IPC error retorna `ErrorPayload` tipado; 0 `console.error` sin contexto |
| 7. Integration + E2E Tests | `npm run test:integration` pasa (Nakama testcontainer up/down); `npm run test:e2e` pasa 3 flujos críticos en CI; coverage > 60% código nuevo |
| 8. TypeScript Strict | `tsc --noEmit` pasa en `client/`, `packages/ipc-types/`, `packages/nakama-client/`; 0 errores `any` implícito; ESLint strict rules pass |
| 9. Config Externalizada | `ConfigService.get('ports.proxy')` retorna 55436; `config/local.yaml` override funciona; startup falla si schema inválido |
| 10. Packaging + CI/CD | `npm run make` genera `.exe` firmado (Windows); `electron-updater` detecta release GitHub; workflow `release.yml` pasa en push tag `v*` |
| 11. i18n | UI cambia idioma al seleccionar EN/PT-BR/ES; 0 strings hardcodeados en componentes; `npm run i18n:extract` actualiza JSONs |
| 12. Nakama OpenAPI | `packages/nakama-client` publica en npm local; `import { AuthApi } from '@emu-latam/nakama-client'` compila; contract test pasa contra Nakama staging |

## 6. Dependencias Entre Mejoras (Critical Path)

```
MEJORA 1 (Shared IPC Types)
    │
    ├──→ MEJORA 3 (Proxy/Forwarder/MITM) ──→ MEJORA 2 (NetworkContext + React Query)
    │                                           │
    │                                           ├──→ MEJORA 4 (Health Checks)
    │                                           ├──→ MEJORA 5 (Winston Logging)
    │                                           ├──→ MEJORA 6 (Error Handling + UX)
    │                                           │
    │                                           └──→ MEJORA 7 (Integration/E2E Tests)
    │                                                   │
    └───────────────────────────────────────────────────┴──→ MEJORA 8 (TS Strict)
                                                               │
                                                               ├──→ MEJORA 9 (Config Zod)
                                                               ├──→ MEJORA 10 (Packaging/CI/CD)
                                                               ├──→ MEJORA 11 (i18n)  ←─ Paralelo, baja prioridad
                                                               └──→ MEJORA 12 (Nakama OpenAPI) ←─ Paralelo, baja prioridad
```

**Orden de ejecución recomendado**: 1 → 3 → 2 → (4, 5 paralelo) → 6 → 7 → 8 → 9 → 10, con 11 y 12 en paralelo cuando haya capacidad.