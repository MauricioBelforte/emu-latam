# 02-Analisis.md — Plan de Mejoras Nemotron 3 Ultra

## 1. Análisis del Dominio y Estado Actual

### 1.1 Arquitectura Actual (Resumen)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ELECTRON APP (client/)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  MAIN PROCESS (src/main/)                          RENDERER (src/renderer/) │
│  ┌─────────────────────────────────────────┐    ┌─────────────────────────┐ │
│  │ IPC Handlers (contextBridge)            │◄──►│ React 18 + TypeScript   │ │
│  │  - launch-game                          │    │  - Components           │ │
│  │  - start-relay-tunnel (V1 manual)       │    │  - Hooks (useState)     │ │
│  │  - stop-relay-tunnel                    │    │  - Direct IPC calls     │ │
│  │  - get-lan-ip                           │    │  - No React Query       │ │
│  └─────────────────────────────────────────┘    └─────────────────────────┘ │
│  ┌─────────────────────────────────────────┐    ┌─────────────────────────┐ │
│  │ Services (src/main/services/)           │    │ Shared (src/shared/)    │ │
│  │  - ProxyService (TCP proxy)             │    │  - ipc-types.ts (DUPLICADO)│ │
│  │  - ForwarderService (TCP forwarder)     │    │  - constants.ts         │ │
│  │  - MitmRelayService (MITM básico)       │    │  - logger.ts (console)  │ │
│  │  - NakamaService (matchmaking)          │    └─────────────────────────┘ │
│  │  - BoreService (spawn bore.exe)         │                                 │
│  │  - RetroArchService (spawn retroarch)   │                                 │
│  └─────────────────────────────────────────┘                                 │
│  ┌─────────────────────────────────────────┐                                 │
│  │ Logging: console.log interceptado       │                                 │
│  │ logs/main_process.log (rotación 500KB)  │                                 │
│  └─────────────────────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Puntos de Dolor Identificados

| Área | Problema | Impacto |
|------|----------|---------|
| **Tipos IPC** | Duplicados en 3 lugares (`main`, `preload`, `renderer/shared`), sin validación runtime | Bugs silenciosos, refactoring riesgoso, DX pobre |
| **Estado Red** | `useState` disperso, sin cache, sin reintentos, sin loading/error states unificados | UX inconsistente, race conditions, difícil testing |
| **Servicios Red** | Clases sueltas, sin lifecycle management, health checks inexistentes, cleanup manual | Procesos huérfanos, memory leaks, crashes silenciosos |
| **Logging** | `console.log` con strings, sin niveles, sin contexto, rotación básica 500KB | Debugging producción imposible, logs inutilizables |
| **Errores** | Try/catch dispersos, sin Error Boundaries, sin toasts, crashes Main = app muere | UX rota, soporte imposible, MTTR alto |
| **Testing** | Solo 35 tests unitarios flujos estables, 0 integración, 0 E2E | Regresiones indetectables, miedo a refactor |
| **TypeScript** | `strict: false`, `any` en 40%+ archivos, sin validación tipos IPC | Bugs tipo runtime, refactoring peligroso |
| **Config** | 15+ archivos con puertos/IPs/timeouts hardcodeados | Cambios de entorno = búsqueda/reemplazo manual, errores |
| **Packaging** | Solo `npm run build`, sin installer, sin auto-update, sin signing | Distribución manual, sin updates, seguridad baja |
| **i18n** | Solo español hardcodeado | Mercado Latam (EN/PT-BR) inaccesible |
| **Nakama** | Cliente manual, sin OpenAPI, sin contract testing | Breaking changes indetectables, acoplamiento fuerte |

## 2. Análisis por Mejora

### 2.1 Mejora 1: Paquete Shared IPC Types (`@emu-latam/ipc-types`)

#### Alternativas Evaluadas

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Monorepo npm workspace + paquete interno** | Tipos compartidos reales, versionado independiente, codegen posible | Setup inicial, publish local | ✅ **SELECCIONADA** |
| Archivos compartidos (`../shared/ipc-types.ts`) | Simple, sin build step | Duplicación en build, sin validación runtime, no escalable | ❌ |
| `tsc --composite` + project references | TypeScript nativo, sin npm | Complejo configurar, no valida runtime | ❌ |
| Generar tipos desde OpenAPI/Protobuf | Contrato único, multi-lenguaje | Overkill para IPC interno, Nakama ya usa OpenAPI aparte | ❌ |

#### Decisiones Clave
1. **Estructura monorepo**: `packages/ipc-types/` como workspace npm
2. **Validación runtime**: Zod schemas exportados junto a tipos TS (`z.infer<typeof schema>`)
3. **Codegen**: Script `npm run ipc:generate` que lee handlers IPC y genera tipos (fase 2)
4. **Versionado**: `workspace:*` en `client/package.json`, publish local con `npm pack` para CI

#### Riesgos y Mitigación
- **Riesgo**: Ciclo de dependencias si `ipc-types` importa de `client`
- **Mitigación**: `ipc-types` **cero dependencias** de `client`; solo tipos puros + Zod

---

### 2.2 Mejora 2: NetworkContext + React Query

#### Alternativas Evaluadas

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **TanStack Query v5** | Server state management estándar, cache, retry, dedup, devtools, SSR-ready | Curva aprendizaje, bundle size (~13kb) | ✅ **SELECCIONADA** |
| Redux Toolkit + RTK Query | Integrado con Redux, potente | Overkill para server state, boilerplate | ❌ |
| SWR | Simple, ligero | Menos features (mutations, invalidation), sin devtools oficiales | ❌ |
| Custom hooks + useState/useEffect | Control total | Reinventar rueda, bugs sutiles, sin cache | ❌ |

#### Decisiones Clave
1. **Query keys estructurados**: `['health']`, `['matchmaking', 'list']`, `['relay', 'status']`
2. **Mutations para IPC calls**: `useLaunchGame()`, `useStartRelayTunnel()` → invalidan queries relacionadas
3. **NetworkContext Provider**: Envuelve `QueryClientProvider` + expone `useNetwork()` hook combinado
4. **Persistencia**: `persistQueryClient` a `localStorage` para health check último conocido (opcional)

#### Riesgos y Mitigación
- **Riesgo**: IPC no es HTTP, React Query espera async/await + abort signal
- **Mitigación**: Wrappers `ipcToPromise(channel, args)` con `AbortController` manual + timeout

---

### 2.3 Mejora 3: Arquitectura Proxy/Forwarder/MITM Robusta

#### Análisis de Arquitectura Actual (Flujos Bloqueados - Regla 15)

```
FLUJO 1: Host Directo (SIN bore)
┌─────────────┐     TCP 55435      ┌─────────────┐
│  Host RA    │ ◄─────────────────► │  Guest RA   │
│ --host      │   (LAN directa)    │ --connect   │
│ --port 55435│                    │  IP:55435   │
└─────────────┘                    └─────────────┘
  IPC: launch-game(useRelay=false)

FLUJO 2: Host Bore Manual (V1 - ESTABLE)
┌─────────────┐     TCP 55435      ┌─────────────┐     TCP 55436      ┌──────────┐     bore.pub     ┌─────────────┐
│  Host RA    │ ◄─────────────────► │  Forwarder  │ ◄────────────────► │  Bore    │ ◄─────────────► │  Guest RA   │
│ --host      │   (LAN_IP:55435)   │ 127.0.0.1   │   (127.0.0.1:55436)│  local   │   (público)     │ --connect   │
│ --port 55435│                    │ :55436      │                    │ 55436    │                 │ 127.0.0.1   │
└─────────────┘                    └─────────────┘                    └──────────┘                 │ --port 55435│
       ▲                                                                                          └─────────────┘
       │ IPC: start-relay-tunnel (V1) + launch-game(useRelay=true)
       │ Proxy: 127.0.0.1:55435 → bore.pub:XXXXX (Guest side)
```

#### Decisiones de Diseño para Nueva Arquitectura (Mejora 3)

| Componente | Responsabilidad | Health Check | Lifecycle |
|------------|-----------------|--------------|-----------|
| **ProxyService** | TCP proxy `127.0.0.1:55435` → `bore.pub:port` (Guest side) | TCP connect + handshake byte | Start/Stop/Restart via ProcessManager |
| **ForwarderService** | TCP forwarder `127.0.0.1:55436` → `LAN_IP:55435` (Host side) | TCP connect to LAN_IP:55435 | Start/Stop/Restart via ProcessManager |
| **MitmRelayService** | Intercepta tráfico proxy↔bore, loggea frames length-prefixed | Self-check: buffer no crece indefinido | Start/Stop/Restart via ProcessManager |
| **BoreService** | Spawn `bore.exe local 55436 --to bore.pub`, parsea puerto asignado | HTTP health check a bore.pub API | Start/Stop/Restart via ProcessManager |
| **ProcessManager** | Orquesta todos: spawn, monitor, health check, restart, cleanup | Aggrega health de todos | Singleton en Main Process |

#### MITM Relay - Diseño de Framing
```
Formato actual (problemático): Stream TCP raw, sin delimitación
Formato nuevo (length-prefixed):
  [4 bytes: uint32BE length][N bytes: payload][4 bytes: length][N bytes: payload]...
  
Ventajas:
- Framing determinista, sin buffering ambiguo
- Backpressure natural (backlog buffer max 1MB)
- Métricas: frames/sec, bytes/sec, latency p50/p99
- Replay posible para debugging
```

#### Riesgos y Mitigación
- **Riesgo**: Puerto 55435 fijo en RetroArch, conflictos si proxy + forwarder + RA host escuchan mismo puerto
- **Mitigación**: Forwarder usa `127.0.0.1:55436` → `LAN_IP:55435` (evita 127.0.0.1:55435 donde proxy escucha). Validado en tests estables (Regla 15).

---

### 2.4 Mejora 4: Health Checks + Resiliencia

#### Análisis de Fallos Actuales

| Componente | Modo Fallo Actual | Detección | Recuperación |
|------------|-------------------|-----------|--------------|
| `bore.exe` | Crasha / bore.pub down / puerto ocupado | Ninguna (silencioso) | Manual: usuario cierra y reabre |
| Proxy TCP | Socket hang up / ECONNREFUSED | Ninguna | Manual |
| Forwarder | LAN IP cambia / Host RA muere | Ninguna | Manual |
| RetroArch | Crash / freeze / netplay desync | Ninguna | Manual |
| MITM Relay | Buffer overflow / memory leak | Ninguna | Manual |

#### Diseño Health Check

```typescript
interface HealthCheckConfig {
  interval: 10_000;      // 10s
  timeout: 3_000;        // 3s TCP connect
  retries: 3;            // 3 fallos = unhealthy
  backoff: 'exponential'; // 2s, 4s, 8s
}

interface ServiceHealth {
  service: 'proxy' | 'forwarder' | 'bore' | 'retroarch' | 'mitm';
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  latencyMs?: number;
  error?: string;
  restartCount: number;
}
```

#### Circuit Breaker Pattern
```
CLOSED (normal) ──5 fallos──► OPEN (bloquea calls, retorna error rápido)
    ▲                              │
    │                              ▼
    └────── 60s timeout ────── HALF-OPEN (permite 1 call test)
```

---

### 2.5 Mejora 5: Logging Estructurado (Winston)

#### Comparativa: Actual vs Objetivo

| Aspecto | Actual (`console.log` interceptado) | Objetivo (Winston) |
|---------|-------------------------------------|-------------------|
| Niveles | Ninguno (todo `log`) | `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly` |
| Formato | String concatenado | JSON estructurado + pretty console |
| Contexto | Ninguno | `{ service, correlationId, pid, timestamp, level }` |
| Rotación | 500KB → rename manual | 10MB, max 30 files, compress, date pattern |
| Query | `grep` en archivo plano | IPC `get-logs` con filtros (level, service, since) |
| Transporte | Solo archivo único | Console + File + Rotated File + (opcional: Loki/Elastic) |

#### Decisiones Clave
1. **Logger singleton** en `client/src/main/logger.ts` inicializado al arranque Main
2. **Correlation ID**: UUID generado por request IPC, propagado via `contextBridge` a renderer
3. **Child loggers**: `logger.child({ service: 'proxy' })` por servicio
4. **Rotación**: `winston-daily-rotate-file` con `maxSize: '10m'`, `maxFiles: '30'`, `zippedArchive: true`

---

### 2.6 Mejora 6: Error Handling + UX

#### Gap Analysis

| Capacidad | Actual | Objetivo |
|-----------|--------|----------|
| Error Boundaries React | ❌ | ✅ Class component `ErrorBoundary` |
| Global Error Handler Main | ❌ | ✅ `process.on('uncaughtException')` + logger |
| IPC Error Payload | ❌ (raw Error) | ✅ `ErrorPayload` tipado (Zod) |
| User Feedback (Toasts) | ❌ | ✅ `react-hot-toast` |
| Retry UX | ❌ | ✅ Toast con botón "Reintentar" para errores recuperables |
| Error Reporting | ❌ | ✅ Log estructurado + (futuro: Sentry) |

#### Taxonomía de Errores (ErrorPayload.code)
```typescript
enum ErrorCode {
  // Red
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
  BORE_TUNNEL_FAILED = 'BORE_TUNNEL_FAILED',
  PROXY_CONNECTION_FAILED = 'PROXY_CONNECTION_FAILED',
  FORWARDER_CONNECTION_FAILED = 'FORWARDER_CONNECTION_FAILED',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  
  // Nakama
  NAKAMA_AUTH_FAILED = 'NAKAMA_AUTH_FAILED',
  NAKAMA_MATCHMAKE_FAILED = 'NAKAMA_MATCHMAKE_FAILED',
  NAKAMA_RELAY_FAILED = 'NAKAMA_RELAY_FAILED',
  
  // RetroArch
  RETROARCH_SPAWN_FAILED = 'RETROARCH_SPAWN_FAILED',
  RETROARCH_NETPLAY_FAILED = 'RETROARCH_NETPLAY_FAILED',
  
  // Sistema
  IPC_VALIDATION_FAILED = 'IPC_VALIDATION_FAILED',
  CONFIG_INVALID = 'CONFIG_INVALID',
  PROCESS_MANAGER_FAILED = 'PROCESS_MANAGER_FAILED',
  
  // Genérico
  UNKNOWN = 'UNKNOWN',
  INTERNAL = 'INTERNAL',
}
```

---

### 2.7 Mejora 7: Tests Integración + E2E

#### Estrategia de Testing (Pirámide Adaptada Electron)

```
                    ┌─────────────────┐
                    │   E2E (Playwright)  │  ← 5-10 tests críticos (flujos usuario)
                    │   Electron + Web    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │ Integration│ │ Integration│ │ Integration│
       │  (Main)    │ │ (Renderer) │ │  (IPC)     │
       │ TestContain│ │  (Vitest)  │ │  (Vitest)  │
       └────────────┘ └────────────┘ └────────────┘
              ▲              ▲              ▲
              └──────────────┼──────────────┘
                             │
                    ┌────────┴────────┐
                    │   Unit Tests    │  ← 35 existentes + nuevos (utils, validators, hooks)
                    │   (Vitest)      │
                    └─────────────────┘
```

#### TestContainers para Nakama
```yaml
# docker-compose.test.yml
services:
  nakama:
    image: heroiclabs/nakama:3.21.0
    environment:
      DATABASE_ADDRESS: "postgres:5432"
      REDIS_ADDRESS: "redis:6379"
    depends_on: [postgres, redis]
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: nakama
      POSTGRES_PASSWORD: localdev
  redis:
    image: redis:7-alpine
```

#### Playwright E2E - Flujos Críticos
1. **Happy Path Host Directo**: Click "HOST DIRECTO" → RA inicia → Health check OK → UI muestra "Esperando jugador"
2. **Happy Path Bore Manual**: Click "HOST BORE" → Tunnel up → Proxy up → Forwarder up → RA host → Guest join → Frame exchange
3. **Error Recovery**: Kill bore.exe → Health check detecta → Auto-restart → UI muestra "Reconectando..." → Recuperado

---

### 2.8 Mejora 8: TypeScript Strict Mode

#### Estado Actual (tsconfig.base.json inferido)
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "strictFunctionTypes": false,
    "noImplicitReturns": false,
    "noFallthroughCasesInSwitch": false,
    "noUncheckedIndexedAccess": false,
    "exactOptionalPropertyTypes": false
  }
}
```

#### Plan de Migración Incremental

| Fase | Flags Activados | Archivos Objetivo | Esfuerzo Estimado |
|------|-----------------|-------------------|-------------------|
| 1 | `strict: true`, `noImplicitAny: true` | `packages/ipc-types/`, `client/src/shared/` | 2 días |
| 2 | `strictNullChecks: true` | `client/src/main/services/`, `client/src/preload/` | 3 días |
| 3 | `strictFunctionTypes`, `noImplicitReturns` | `client/src/renderer/src/hooks/`, `components/` | 2 días |
| 4 | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Todo el codebase | 2 días |
| 5 | ESLint `typescript-eslint/strict-type-checked` | Config + fix auto | 1 día |

**Total estimado**: 10 días distribuidos en 2-3 semanas.

---

### 2.9 Mejora 9: Configuración Externalizada (Zod)

#### Inventario de Hardcoded Values (Muestra)

| Archivo | Valores Hardcodeados |
|---------|---------------------|
| `client/src/main/services/ProxyService.ts` | `55435`, `55436`, `'127.0.0.1'` |
| `client/src/main/services/ForwarderService.ts` | `55435`, `55436`, `getLanIp()` |
| `client/src/main/services/BoreService.ts` | `'bore.pub'`, `55436`, timeout 30s |
| `client/src/main/services/RetroArchService.ts` | `'retroarch'`, `'-L'`, `'-c'`, puerto 55435 |
| `client/src/main/services/NakamaService.ts` | `'http://localhost:7350'`, `'defaultkey'`, socket timeout |
| `client/src/renderer/src/components/NetplayPanel.tsx` | `'127.0.0.1'`, `55435`, timeouts UI |
| `client/src/renderer/src/hooks/useRelay.ts` | `55435`, `55436`, retry delays |

#### Schema Zod Propuesto
```typescript
// client/src/shared/config/schema.ts
export const ConfigSchema = z.object({
  ports: z.object({
    retroarchNetplay: z.number().default(55435),
    proxy: z.number().default(55436),
    forwarder: z.number().default(55436),
    mitmRelay: z.number().default(55437),
  }),
  network: z.object({
    boreHost: z.string().default('bore.pub'),
    boreLocalPort: z.number().default(55436),
    healthCheckIntervalMs: z.number().default(10_000),
    healthCheckTimeoutMs: z.number().default(3_000),
    maxRestartAttempts: z.number().default(3),
    restartBackoffBaseMs: z.number().default(2_000),
  }),
  nakama: z.object({
    host: z.string().url().default('http://localhost:7350'),
    serverKey: z.string().default('defaultkey'),
    socketTimeoutMs: z.number().default(5_000),
  }),
  retroarch: z.object({
    executable: z.string().default('retroarch'),
    configPath: z.string(),
    corePath: z.string(),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
    maxFileSize: z.string().default('10m'),
    maxFiles: z.number().default(30),
  }),
  ui: z.object({
    language: z.enum(['es', 'en', 'pt-BR']).default('es'),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

---

### 2.10 Mejora 10: Packaging + Distribución

#### Electron Forge vs electron-builder

| Criterio | Electron Forge | electron-builder |
|----------|----------------|------------------|
| **Makers nativos** | ✅ Squirrel (Windows), DMG (macOS), DEB/RPM (Linux) | ✅ Igual + más opciones |
| **Auto-update** | ✅ `electron-updater` integrado | ✅ `electron-updater` integrado |
| **Code Signing** | ✅ Config en `forge.config.ts` | ✅ Config en `package.json` build |
| **TypeScript** | ✅ Nativo | ✅ Requiere config extra |
| **Monorepo support** | ✅ Workspaces | ⚠️ Limitado |
| **Comunidad/Documentación** | ✅ Oficial Electron | ✅ Muy maduro |

**Decisión**: **Electron Forge** (recomendado por Electron, mejor TS, monorepo friendly).

#### Pipeline CI/CD (GitHub Actions)

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*']
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - name: Install deps
        run: npm ci
      - name: Build
        run: npm run build
      - name: Make (Forge)
        run: npm run make
        env:
          # Windows signing
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          # macOS notarization
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
      - name: Publish
        run: npx electron-forge publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### 2.11 Mejora 11: Internacionalización (i18n)

#### Análisis de Mercado Latam
| País | Idioma | Población | Prioridad |
|------|--------|-----------|-----------|
| México | Español (ES-419) | 128M | ✅ Base |
| Colombia | Español (ES-CO) | 52M | ✅ Base |
| Argentina | Español (ES-AR) | 46M | ✅ Base |
| Brasil | Portugués (PT-BR) | 215M | 🔴 **Crítico** |
| USA (Latino) | Inglés (EN-US) | 62M | 🟡 Importante |

#### Decisiones Técnicas
- **Librería**: `react-i18next` (estándar React, hooks, suspense, namespaces)
- **Estructura**: Namespaces por feature (`common`, `errors`, `network`, `settings`, `netplay`)
- **Detección**: `i18next-browser-languagedetector` (localStorage → navigator → fallback)
- **Extracción**: `i18next-scanner` en CI para detectar strings sin traducir
- **Formato**: JSON por locale/namespace (`public/locales/es/common.json`)

---

### 2.12 Mejora 12: Nakama OpenAPI + Cliente Generado

#### Estado Actual
- Cliente Nakama manual en `client/src/main/services/NakamaService.ts`
- ~500 líneas de fetch wrappers sin tipos
- Cualquier cambio en Nakama = breaking change silencioso

#### Solución: OpenAPI → TypeScript Client

```bash
# 1. Obtener OpenAPI spec de Nakama (3.21+)
curl http://localhost:7350/openapi.json > backend/nakama/openapi.json

# 2. Generar cliente
npx openapi-typescript-codegen \
  -i backend/nakama/openapi.json \
  -o packages/nakama-client/src \
  -c axios \
  --use-options \
  --export-core \
  --export-services \
  --export-schemas
```

#### Estructura Generada
```
packages/nakama-client/
├── package.json
├── tsconfig.json
├── src/
│   ├── api/           # Servicios: AuthApi, MatchmakerApi, SocketApi, etc.
│   ├── models/        # Schemas: Account, Match, MatchmakerTicket, etc.
│   ├── core/          # HttpClient, Config, Errors
│   └── index.ts       # Export barrel
```

#### Contract Testing
- **Pact**: Consumer-driven contracts (client → Nakama)
- **Schemathesis**: Property-based testing contra OpenAPI spec
- **CI**: Ejecutar contra Nakama testcontainer en cada PR

## 3. Matriz de Decisiones Técnicas Consolidada

| Mejora | Tecnología Clave | Patrón Arquitectónico | Complejidad | Riesgo |
|--------|------------------|----------------------|-------------|--------|
| 1. IPC Types | npm workspaces + Zod | Shared Kernel | Baja | Bajo |
| 2. NetworkContext | TanStack Query v5 | Server State Management | Media | Bajo |
| 3. Proxy/Forwarder/MITM | Node net + ProcessManager | Microkernel / Actor-like | Alta | Medio |
| 4. Health Checks | Custom + Circuit Breaker | Observability / Self-healing | Media | Bajo |
| 5. Winston Logging | winston + daily-rotate-file | Structured Logging | Baja | Bajo |
| 6. Error Handling | Error Boundaries + react-hot-toast | Resilient UX | Media | Bajo |
| 7. Tests | TestContainers + Playwright + Vitest | Testing Pyramid | Alta | Medio |
| 8. TS Strict | TypeScript 5.3+ strict flags | Incremental Migration | Media | Bajo |
| 9. Config Zod | Zod + YAML + chokidar | Externalized Configuration | Baja | Bajo |
| 10. Packaging | Electron Forge + electron-updater | CI/CD Pipeline | Media | Medio (signing) |
| 11. i18n | react-i18next | Internationalization | Baja | Bajo |
| 12. Nakama OpenAPI | openapi-typescript-codegen | Contract-First Development | Media | Bajo |

## 4. Conclusiones y Recomendaciones

1. **Orden crítico**: 1 → 3 → 2 → (4||5) → 6 → 7 → 8 → 9 → 10. Las mejoras 11 y 12 son paralelas y de bajo riesgo.
2. **Fundación primero**: Sin Mejora 1 (tipos compartidos), las mejoras 2, 3, 4, 5, 6, 7, 8, 9, 12 tendrán tipos `any` o duplicados.
3. **Arquitectura de red (Mejora 3) es el corazón**: Los health checks (4), logging (5), errores (6), tests (7) dependen de servicios bien definidos.
4. **TypeScript Strict (8) habilita confianza**: Sin él, los tests (7) y config (9) tienen valor limitado.
5. **Packaging (10) al final**: Requiere que todo compile y testee limpio.
6. **i18n (11) y Nakama OpenAPI (12)**: Pueden empezar en paralelo en cualquier momento tras Mejora 1, bajo riesgo.