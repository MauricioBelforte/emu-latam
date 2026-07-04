# 02-Analisis.md — Análisis del Plan de Mejoras (Plan Actual)

> **Nota**: Este archivo es una copia de `plan-inicial/02-Analisis.md` y se actualiza conforme avanza la implementación para reflejar el estado real del análisis y decisiones tomadas.

---

## Resumen Ejecutivo

Este documento analiza las 12 mejoras propuestas para el proyecto Emu Latam, evaluando alternativas técnicas, riesgos, y decisiones de arquitectura. El análisis original se encuentra en `DOCUMENTACION/02-Analisis.md` (raíz) y se replica aquí para trazabilidad.

---

## Contexto del Sistema Actual

### Stack Tecnológico
- **Electron 28+** (Maintenance LTS) + **Node 20+**
- **React 18** + **Vite 5** (Renderer)
- **TypeScript 5.3+** (actualmente `strict: false`)
- **Nakama 3.21+** (Matchmaking via Docker)
- **Bore** (TCP Tunneling via bore.pub)
- **RetroArch / FBNeo** (Netplay core, puerto fijo 55435)

### Arquitectura Actual (Problemas Identificados)
1. **Tipos IPC duplicados** en 3 ubicaciones sin validación runtime
2. **Estado de red disperso** en componentes React (useState/useEffect manuales)
3. **Lógica de red monolítica** en `handlers.ts` (3000+ líneas) sin lifecycle management
4. **Sin health checks** ni recuperación automática de servicios
4. **Logging básico** con `console.log`/`console.error`
5. **Sin error boundaries** ni feedback visual tipado
6. **Tests limitados**: 35 unitarios, 0 integración, 0 E2E
7. **TypeScript no estricto**: 40%+ `any` usage
8. **Config hardcodeada** sin validación
9. **Sin packaging/auto-update** automatizado
10. **Sin i18n** (strings hardcodeados en español)
11. **Cliente Nakama manual** sin tipos

---

## Análisis por Mejora

### MEJORA 1: Paquete Shared IPC Types (`@emu-latam/ipc-types`)

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Monorepo npm workspace** | Single source of truth, versionado independiente, build aislado | Complejidad inicial | ✅ **SELECCIONADA** |
| Archivos compartidos (symlinks) | Simple | Frágil, no versionable | ❌ |
| Copiar/pegar tipos | Sin setup | Duplicación, drift inevitable | ❌ |
| Solo TypeScript (sin Zod) | Menos deps | Sin validación runtime | ❌ |

#### Decisiones Clave
- **npm workspaces** con estructura: `packages/ipc-types/`, `packages/main/`, `packages/renderer/`
- **Zod** para validación runtime en preload ANTES de `ipcRenderer.invoke`
- **Canales IPC** como `const` objects con `as const` para inferencia literal
- **ErrorPayload** unificado con códigos estandarizados

#### Riesgos y Mitigación
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Breaking changes en IPC rompen renderer | Alta | Alto | Tests de contrato IPC, versionado semver |
| Zod añade overhead en preload | Baja | Medio | Validación solo en desarrollo, cache schemas |

---

### MEJORA 2: NetworkContext + React Query (TanStack Query v5)

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **TanStack Query v5** | Cache automático, refetch, dedup, mutations, devtools | Curva aprendizaje | ✅ **SELECCIONADA** |
| SWR | Más simple | Menos features (mutations, invalidation) | ❌ |
| Redux Toolkit Query | Integrado con Redux | Overhead si no usa Redux | ❌ |
| Custom hooks + useState | Control total | Reimplementar cache/refetch | ❌ |

#### Decisiones Clave
- **QueryClient** singleton en `NetworkProvider`
- **Stale times**: health 10s, relay 5s, metrics 15s
- **Mutations** para acciones: launchGame, startRelayTunnel, matchmaking
- **Error handling** global via `mutationOptions.onError` → `ErrorToast`

#### Riesgos y Mitigación
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Over-fetching en health checks | Media | Bajo | Configurar `refetchInterval` apropiado |
| Mutations race conditions | Media | Alto | `mutationKey` único, `onMutate` optimistic updates |

---

### MEJORA 3: Servicios Proxy/Forwarder/MITM/Bore + ProcessManager

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **ProcessManager + Servicios separados** | Separación concerns, testable, lifecycle explícito | Más archivos | ✅ **SELECCIONADA** |
| Monolito refactorizado | Menos archivos | Acoplamiento, difícil testear | ❌ |
| Child processes sin manager | Simple | Sin health checks, huérfanos | ❌ |
| PM2 / systemd | Robusto | Overkill para app Electron | ❌ |

#### Decisiones Clave
- **ProcessManager** como orquestador central con `Map<string, ManagedProcess>`
- **Servicios** implementan interfaz `IManagedService`: `start()`, `stop()`, `healthCheck()`, `getMetrics()`
- **Proxy**: Puerto 55435 → bore.pub:puerto_dinámico (bidireccional TCP)
- **Forwarder**: Puerto 55436 → LAN_IP:55435 (usa `getLanIp()`, **NO 127.0.0.1**)
- **MITM**: Puerto 55437 → bore.pub:puerto_dinámico (intercepta frames RetroArch)
- **Bore**: Spawn `bore local <port> --to bore.pub`, parse puerto asignado, reconexión exponencial
- **GameLauncher**: Args correctos por modo (ver Regla 15 AGENTS.md)

#### Arquitectura de Red (Flujos Protegidos - NO MODIFICAR)

```
FLUJO 1: Host Directo (sin bore)
[Host RA] --host --port 55435 ←→ [Guest RA] --connect 127.0.0.1 --port 55435
  Sin proxy, sin túnel, directo LAN

FLUJO 2: Host con Bore Manual
[Host RA] --host --port 55435
    ↑
[Forwarder:55436] → LAN_IP:55435
    ↑
[Bore] local 55436 --to bore.pub → bore.pub:XXXXX
                                    ↓
[Guest RA] --connect 127.0.0.1
    ↑
[Proxy:55435] → bore.pub:XXXXX

FLUJO 3: Join Directo (lee relay file)
Según relayIp:
  - IP local → directo (como Flujo 1)
  - IP externa → proxy + bore (como Flujo 2 guest)
```

#### Riesgos y Mitigación
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Conflicto puertos (55435 proxy vs forwarder) | Alta | Crítico | Forwarder usa LAN_IP, proxy usa 127.0.0.1 |
| Bore puerto dinámico cambia | Media | Alto | Parse output, reconexión automática |
| Procesos huérfanos al crash | Media | Alto | ProcessManager cleanup en `beforeExit`/`SIGINT` |

---

### MEJORA 4: Health Checks + Auto-Restart + Circuit Breaker

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Integrado en ProcessManager** | Centralizado, usa misma infra | Acoplamiento | ✅ **SELECCIONADA** |
| Servicio separado | Desacoplado | Duplicación lógica | ❌ |
| Health checks externos (HTTP) | Estándar | Overhead, puerto extra | ❌ |

#### Decisiones Clave
- **Config por servicio**: `interval`, `timeout`, `threshold` (fallos consecutivos)
- **Restart policy**: `maxRetries`, `backoffMs`, `backoffMultiplier`
- **Circuit breaker**: `failureThreshold`, `resetTimeoutMs`
- **Eventos**: `health:status` cada check, `health:unhealthy`, `health:circuit-open`

#### Riesgos y Mitigación
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Restart loop infinito | Media | Alto | Circuit breaker + maxRetries |
| Health check falso positivo | Baja | Medio | Timeout conservador, threshold > 1 |

---

### MEJORA 5: Winston Logger Estructurado + Rotación

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Winston** | Maduro, transports, rotación, formatos | Tamaño bundle | ✅ **SELECCIONADA** |
| Pino | Muy rápido, JSON nativo | Menos transports built-in | ❌ |
| Bunyan | JSON, streams | Menos mantenido | ❌ |
| Console + fs manual | Sin deps | Reimplementar todo | ❌ |

#### Decisiones Clave
- **Transports**: Console (pretty, colorizado) + File (JSON, rotación)
- **Rotación**: 10MB max, 30 archivos, gzip old files
- **Correlation IDs**: UUID por request IPC, propagado via context
- **Niveles**: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`
- **Env var**: `LOG_LEVEL` (default: `info`)

#### Riesgos y Mitigación
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida logs durante rotación | Baja | Alto | `winston-daily-rotate-file` maneja atómicamente |
| Performance impacto | Baja | Medio | Async transports, sampling en producción |

---

### MEJORA 6: Error Boundaries + Toast + ErrorPayload Tipado

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **ErrorBoundary + react-hot-toast** | Estándar React, simple, accesible | Requiere class component para boundary | ✅ **SELECCIONADA** |
| react-error-boundary (hook) | Hook-based | Menos control ciclo vida | ❌ |
| Custom toast system | Control total | Reimplementar accesibilidad | ❌ |

#### Decisiones Clave
- **ErrorBoundary** class component (requerido para `componentDidCatch`)
- **ErrorPayload** tipado desde `@emu-latam/ipc-types`:
  ```typescript
  interface ErrorPayload {
    code: ErrorCode;
    message: string;
    recoverable: boolean;
    action?: { label: string; handler: () => void };
    context?: Record<string, unknown>;
  }
  ```
- **ErrorToast** consume `ErrorPayload`, muestra acción "Reintentar" si `recoverable`
- **Integración React Query**: `mutationOptions.onError` → `showErrorToast(payload)`

#### Códigos de Error Estandarizados
| Código | Cuándo | Recuperable |
|--------|--------|-------------|
| `LAUNCH_FAILED` | GameLauncher falla spawn | Sí (retry) |
| `TUNNEL_TIMEOUT` | Bore no asigna puerto en 30s | Sí (retry) |
| `HEALTH_CHECK_FAILED` | Servicio unhealthy > threshold | Sí (auto-restart) |
| `CONFIG_INVALID` | Zod validation falla | No (requiere fix config) |
| `NAKAMA_UNAVAILABLE` | Health check Nakama falla | Sí (retry) |

---

### MEJORA 7: Tests (Unit + Integration + E2E)

#### Alternativas Evaluadas
| Capa | Opción | Decisión |
|------|--------|----------|
| **Unit** | **Vitest** (rápido, ESM nativo, compatible Vite) | ✅ |
| **Integration** | **Testcontainers** (Nakama/PostgreSQL reales en Docker) | ✅ |
| **E2E** | **Playwright** (multi-browser, auto-wait, tracing) | ✅ |

#### Decisiones Clave
- **Unit**: > 80% coverage en `client/src/main/services/`
- **Integration**: Testcontainers para Nakama + PostgreSQL reales
- **E2E**: 3 flujos críticos (host directo, join directo, relay manual)
- **CI**: GitHub Actions ejecuta todo en PR

#### Riesgos y Mitigación
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Flakiness E2E | Media | Alto | Retries, waitFor selectors, test isolation |
| Testcontainers lento | Alta | Medio | Reuse containers, parallel execution |
| CI timeout | Media | Alto | Timeouts generosos, cache Docker layers |

---

### MEJORA 8: TypeScript Strict Mode (Incremental)

#### Alternativas Evaluadas
| Estrategia | Pros | Contras | Decisión |
|------------|------|---------|----------|
| **Incremental por paquetes** | Bajo riesgo, progreso medible | Requiere coordinación | ✅ **SELECCIONADA** |
| Big bang (todo a la vez) | Limpio | Alto riesgo, bloquea todo | ❌ |
| Solo strict en nuevo código | Fácil | Legacy sigue sin strict | ❌ |

#### Decisiones Clave
- **Orden**: `packages/ipc-types` (strict día 1) → `packages/main` → `packages/renderer` → `client` root
- **Flags**: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- **Legacy**: `// @ts-expect-error` temporal con issue vinculado
- **Type guards**: Para validación runtime (Zod ya cubre IPC)

---

### MEJORA 9: Config Centralizada (Zod + YAML)

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Zod + YAML** | Validación runtime + compile-time, hot reload, tipos inferidos | YAML parsing | ✅ **SELECCIONADA** |
| JSON + Zod | Nativo Node | Sin comentarios, trailing commas | ❌ |
| TOML + Zod | Mejor para config | Menos tooling | ❌ |
| Env vars only | 12-factor | No estructurado, sin validación compleja | ❌ |

#### Decisiones Clave
- **Schema Zod** → tipos TypeScript inferidos (`z.infer<typeof schema>`)
- **Defaults**: `app.defaults.yaml` (commiteado)
- **User config**: `app.yaml` (gitignored, merge sobre defaults)
- **Hot reload**: `chokidar` watch → recarga → emite evento `config:changed`
- **IPC**: `get-config`, `set-config` (validado con Zod)

---

### MEJORA 10: Electron Forge + Auto-Update

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Electron Forge + Vite plugin** | Oficial, integrado Vite, makers/publishers | Config inicial | ✅ **SELECCIONADA** |
| electron-builder | Maduro, muchos plugins | Config separada Vite | ❌ |
| Manual (electron-packager) | Control total | Mantenimiento alto | ❌ |

#### Decisiones Clave
- **Makers**: `@electron-forge/maker-squirrel` (Windows), `@electron-forge/maker-dmg` (macOS), `@electron-forge/maker-deb` (Linux)
- **Publisher**: `@electron-forge/publisher-github` (GitHub Releases)
- **Auto-update**: `electron-updater` con `autoUpdater.checkForUpdatesAndNotify()`
- **CI/CD**: `.github/workflows/release.yml` en tag push

---

### MEJORA 11: i18n (react-i18next) Español/Inglés

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **react-i18next** | Estándar React, hooks, interpolation, pluralización | Setup inicial | ✅ **SELECCIONADA** |
| lingui | Macros, extracción CLI | Curva aprendizaje | ❌ |
| Custom context | Sin deps | Reimplementar todo | ❌ |

#### Decisiones Clave
- **Detector**: `localStorage` → `navigator.language` → fallback `es`
- **Backend**: Carga JSON estático (no servidor)
- **Locales**: `es.json`, `en.json` en `src/i18n/locales/`
- **Persistencia**: Idioma guardado en config YAML (`app.yaml`)

---

### MEJORA 12: Nakama OpenAPI Codegen (Cliente Tipado)

#### Alternativas Evaluadas
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **openapi-typescript-codegen** | Genera cliente + tipos, axios/fetch, regenerable | Spec Nakama debe estar disponible | ✅ **SELECCIONADA** |
| Manual wrapper | Control total | Mantenimiento alto, drift | ❌ |
| @heroiclabs/nakama-js | Oficial | Tipos limitados, no regenerable | ❌ |

#### Decisiones Clave
- **Spec source**: Nakama OpenAPI spec (GitHub releases o Docker endpoint)
- **Generación**: Script `scripts/generate-nakama-client.ts` en CI
- **Output**: `packages/nakama-client/` (npm workspace)
- **Wrapper**: React Query hooks tipados (`useAuth`, `useMatchmaking`, `useMatch`)

---

## Matriz de Dependencias (Critical Path)

```
MEJORA 1 (Shared IPC Types)
    │
    ├──→ MEJORA 3 (ProcessManager + Servicios) ──→ MEJORA 2 (NetworkContext + React Query)
    │                                                  │
    │                                                  ├──→ MEJORA 4 (Health Checks)
    │                                                  │
    │                                                  └──→ MEJORA 5 (Winston Logger)
    │                                                         │
    ├──→ MEJORA 6 (Error Boundaries + Toast) ←──────────────┘
    │
    ├──→ MEJORA 7 (Tests)
    │
    ├──→ MEJORA 8 (TypeScript Strict)
    │
    ├──→ MEJORA 9 (Config Centralizada)
    │
    ├──→ MEJORA 10 (Electron Forge + Auto-Update)
    │
    ├──→ MEJORA 11 (i18n) ──────────────────────────────────┐ (Paralelo tras 1)
    │
    └──→ MEJORA 12 (Nakama Codegen) ────────────────────────┘ (Paralelo tras 1)
```

---

## Decisiones Arquitectónicas Transversales

### Monorepo Structure
```
emu-latam/
├── packages/
│   ├── ipc-types/          # @emu-latam/ipc-types (MEJORA 1)
│   ├── main/               # @emu-latam/main (MEJORA 3, 4, 5, 9)
│   ├── renderer/           # @emu-latam/renderer (MEJORA 2, 6, 11)
│   └── nakama-client/      # @emu-latam/nakama-client (MEJORA 12)
├── client/                 # Electron app entry (MEJORA 10)
│   ├── src/main/           # Main process (delegates to @emu-latam/main)
│   ├── src/preload/        # Preload (uses @emu-latam/ipc-types validators)
│   └── src/renderer/       # React app (uses @emu-latam/renderer, @emu-latam/ipc-types)
└── scripts/                # Build/generation scripts
```

### IPC Contract (desde @emu-latam/ipc-types)
```typescript
// Canales tipados
const IPC_CHANNELS = {
  // Sistema
  'app:ready': undefined,
  'app:quit': undefined,
  'get-config': ConfigSchema,
  'set-config': ConfigSchema,
  
  // Red
  'health-check': HealthCheckRequest,
  'get-metrics': undefined,
  'launch-game': LaunchGameRequest,
  'start-relay-tunnel': StartRelayTunnelRequest,
  'stop-relay-tunnel': undefined,
  
  // Matchmaking
  'matchmaking:create': CreateMatchRequest,
  'matchmaking:join': JoinMatchRequest,
  'matchmaking:list': undefined,
  
  // Eventos (main → renderer)
  'health:status': HealthStatusEvent,
  'metrics:update': MetricsEvent,
  'log:entry': LogEntryEvent,
  'error:occurred': ErrorPayload,
} as const;
```

---

## Métricas de Éxito (KPIs)

| Métrica | Baseline | Target | Medición |
|---------|----------|--------|----------|
| TypeScript errors | 200+ | 0 | `npm run typecheck` |
| `any` usage | 40%+ | < 5% (legacy only) | ESLint rule |
| Unit test coverage | ~30% | > 80% | Vitest coverage |
| Integration tests | 0 | 5+ (Nakama, PG, Bore) | Testcontainers |
| E2E tests | 0 | 3 flujos críticos | Playwright |
| Build time | Manual | < 5 min CI | GitHub Actions |
| Auto-update success | N/A | > 95% | Telemetría |
| Log rotation working | No | Sí | Verificación manual |
| Config hot reload | No | < 500ms | Test integración |

---

## Riesgos Globales y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Breaking changes en flujos protegidos (Regla 15) | Media | Crítico | Tests E2E obligatorios antes de merge, no tocar handlers legacy |
| Scope creep | Alta | Alto | Checklist atómico (05-Checklist.md), no agregar tareas no planificadas |
| Dependencias circulares monorepo | Media | Alto | Reglas ESLint `no-restricted-imports`, arquitectura en capas |
| Performance regression | Media | Medio | Benchmarks pre/post, CI performance gate |
| Nakama API changes | Baja | Medio | Codegen regenerable, tests integración detectan drift |

---

## Próximos Pasos (Plan Actual)

1. **Inicializar plan-actual** ✅ (este archivo)
2. **Implementar MEJORA 1**: Monorepo + `@emu-latam/ipc-types` con Zod validators
3. **Implementar MEJORA 3**: ProcessManager + Servicios (Proxy, Forwarder, MITM, Bore, GameLauncher)
4. **Implementar MEJORA 2**: NetworkContext + React Query hooks
5. **Implementar MEJORA 4/5**: Health Checks + Winston Logger (paralelo)
6. **Implementar MEJORA 6**: Error Boundaries + Toast
7. **Implementar MEJORA 7**: Tests (Unit → Integration → E2E)
8. **Implementar MEJORA 8**: TypeScript Strict incremental
9. **Implementar MEJORA 9**: Config Centralizada
10. **Implementar MEJORA 10**: Electron Forge + Auto-Update
11. **Implementar MEJORA 11/12**: i18n + Nakama Codegen (paralelo)

---

## Verificación de Flujos Protegidos (Regla 15 AGENTS.md)

Antes de cualquier merge, verificar que estos 3 flujos funcionan **exactamente igual**:

| Flujo | Botón(es) | Handler/IPC | Args RA Esperados |
|-------|-----------|-------------|-------------------|
| Host directo | "HOST DIRECTO (sin bore)" | `launch-game` `useRelay=false` | Host: `--host --port 55435`, Guest: `--connect 127.0.0.1 --port 55435` |
| Host bore manual | "1. HOST GAME (BORE)" + "2. JOIN GAME" | `start-relay-tunnel` V1 + `launch-game` `useRelay=true` | Host: `--host --port 55435`, Guest: `--connect 127.0.0.1` (proxy) |
| Join directo | "2. JOIN GAME" (lee relay file) | `launch-game` `useRelay=true, relayIp=archivo` | Según relayIp: local→directo, externa→proxy+bore |

**Test de verificación**: `npm run test:stable` (35 tests) en `client/test_stable_flows.js`