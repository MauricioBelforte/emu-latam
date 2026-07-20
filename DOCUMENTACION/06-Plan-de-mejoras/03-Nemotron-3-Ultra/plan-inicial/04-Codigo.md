# 04-Codigo.md — Archivos, Funciones y Logs Relacionados

## 1. Estructura de Archivos del Proyecto (Post-Mejora 1)

```
emu-latam/
├── package.json                    # Root workspace config (npm workspaces)
├── tsconfig.base.json              # TypeScript base config
├── .github/
│   └── workflows/
│       ├── ci.yml                  # CI: lint, typecheck, test, build
│       └── release.yml             # Electron Forge publish
├── packages/
│   └── ipc-types/                  # MEJORA 1: Paquete compartido
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── channels.ts
│       │   ├── payloads.ts
│       │   ├── validators.ts
│       │   └── errors.ts
│       ├── dist/                   # Build output
│       └── tests/
│           └── validators.test.ts
├── client/                         # Electron + React App
│   ├── package.json
│   ├── electron.vite.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── tsconfig.app.json
│   ├── src/
│   │   ├── main/                   # MAIN PROCESS (Electron)
│   │   │   ├── index.ts            # Entry point
│   │   │   ├── ipc/
│   │   │   │   ├── handlers.ts     # IPC handlers (MEJORA 1, 3, 4, 5)
│   │   │   │   └── channels.ts     # Canal definitions (legacy compat)
│   │   │   ├── services/           # MEJORA 3: Servicios robustos
│   │   │   │   ├── ProcessManager.ts
│   │   │   │   ├── ProxyService.ts
│   │   │   │   ├── ForwarderService.ts
│   │   │   │   ├── MitmRelayService.ts
│   │   │   │   ├── BoreService.ts
│   │   │   │   └── GameLauncher.ts
│   │   │   ├── logger/             # MEJORA 5: Winston logger
│   │   │   │   ├── index.ts
│   │   │   │   ├── transports.ts
│   │   │   │   └── rotation.ts
│   │   │   ├── config/             # MEJORA 9: Config centralizada
│   │   │   │   ├── ConfigService.ts
│   │   │   │   ├── schema.ts       # Zod schema
│   │   │   │   └── defaults.ts
│   │   │   └── utils/
│   │   │       ├── network.ts      # getLanIp(), port checking
│   │   │       └── process.ts      # spawn helpers
│   │   ├── preload/                # PRELOAD SCRIPT
│   │   │   ├── index.ts            # contextBridge + Zod validation (MEJORA 1)
│   │   │   └── ipc-wrappers.ts     # Typed invoke wrappers
│   │   └── renderer/               # RENDERER PROCESS (React)
│   │       ├── src/
│   │       │   ├── main.tsx        # Entry point
│   │       │   ├── App.tsx
│   │       │   ├── providers/
│   │       │   │   └── NetworkProvider.tsx  # MEJORA 2: NetworkContext + React Query
│   │       │   ├── context/
│   │       │   │   └── NetworkContext.tsx
│   │       │   ├── hooks/
│   │       │   │   ├── useHealthCheck.ts
│   │       │   │   ├── useRelayStatus.ts
│   │       │   │   ├── useMatchmaking.ts
│   │       │   │   ├── useLaunchGame.ts
│   │       │   │   └── useRelayTunnel.ts
│   │       │   ├── lib/
│   │       │   │   └── ipc.ts      # Typed window.ipc wrapper
│   │       │   ├── components/
│   │       │   │   ├── ui/         # Shadcn/UI components
│   │       │   │   ├── HostPanel.tsx
│   │       │   │   ├── JoinPanel.tsx
│   │       │   │   ├── RelayPanel.tsx
│   │       │   │   ├── HealthIndicator.tsx
│   │       │   │   ├── ErrorToast.tsx
│   │       │   │   └── ErrorBoundary.tsx  # MEJORA 6
│   │       │   ├── pages/
│   │       │   │   ├── Home.tsx
│   │       │   │   ├── Host.tsx
│   │       │   │   ├── Join.tsx
│   │       │   │   └── Settings.tsx
│   │       │   ├── styles/
│   │       │   │   └── globals.css
│   │       │   └── i18n/           # MEJORA 11
│   │       │       ├── index.ts
│   │       │       └── locales/
│   │       │           ├── es.json
│   │       │           └── en.json
│   │       └── index.html
│   ├── test/                       # MEJORA 7: Tests
│   │   ├── unit/
│   │   │   ├── services/
│   │   │   │   ├── ProxyService.test.ts
│   │   │   │   ├── ForwarderService.test.ts
│   │   │   │   ├── BoreService.test.ts
│   │   │   │   └── ProcessManager.test.ts
│   │   │   ├── ipc/
│   │   │   │   └── validators.test.ts
│   │   │   └── utils/
│   │   │       └── network.test.ts
│   │   ├── integration/
│   │   │   ├── testcontainers/
│   │   │   │   ├── nakama.test.ts
│   │   │   │   └── postgres.test.ts
│   │   │   └── e2e/
│   │   │       ├── playwright/
│   │   │       │   ├── host-flow.spec.ts
│   │   │       │   ├── join-flow.spec.ts
│   │   │       │   └── relay-flow.spec.ts
│   │   │       └── fixtures/
│   │   └── vitest.config.ts
│   ├── forge.config.ts             # MEJORA 10: Electron Forge
│   └── resources/                  # Assets, iconos
├── backend/                        # Nakama + Docker (existente)
│   ├── docker-compose.yml
│   ├── local.yml
│   └── migrate.bat
├── emulator/                       # RetroArch + FBNeo (existente)
├── relay-server/                   # Servidor relay legacy (existente)
├── retroarch/                      # Configs RetroArch (existente)
├── DOCUMENTACION/
│   ├── 06-Plan-de-mejoras/
│   │   └── nemotron 3 ultra/
│   │       ├── plan-inicial/
│   │       │   ├── 01-Requerimientos.md
│   │       │   ├── 02-Analisis.md
│   │       │   ├── 03-Diseno.md
│   │       │   ├── 04-Codigo.md
│   │       │   └── 05-Checklist.md
│   │       └── plan-actual/        # Copia actualizada durante implementación
│   └── ...
├── Logs/                           # Logs rotados (Regla 17)
│   ├── rotated/
│   ├── main_process.log
│   └── ULTIMO_NUMERO.txt
├── Mensajes entre modelos/
└── Obsoletos/                      # Respaldos (Regla 5)
```

---

## 2. Archivos Clave por Mejora

### MEJORA 1: Paquete Shared IPC Types (`@emu-latam/ipc-types`)

| Archivo | Función Principal | Responsabilidad |
|---------|-------------------|-----------------|
| `packages/ipc-types/src/channels.ts` | `MainToRendererChannels`, `RendererToMainChannels` | Definición centralizada de nombres de canales IPC |
| `packages/ipc-types/src/payloads.ts` | `LaunchGameArgs`, `StartRelayTunnelArgs`, `HealthCheckResult`, `SystemMetrics`, `ServiceHealth`, `ProxyMetrics`, `ForwarderMetrics`, `MitmMetrics`, `BoreMetrics` | Tipos TypeScript para todos los payloads IPC |
| `packages/ipc-types/src/validators.ts` | `LaunchGameArgsSchema`, `StartRelayTunnelArgsSchema`, `HealthCheckResultSchema`, `validateIpcPayload()` | Esquemas Zod + helper de validación runtime |
| `packages/ipc-types/src/errors.ts` | `ErrorPayload`, `ErrorPayloadSchema` | Error tipado con código, mensaje, contexto, recoverable |
| `packages/ipc-types/src/index.ts` | `export * from './channels'`, etc. | Barrel export público |
| `client/src/preload/index.ts` | `contextBridge.exposeInMainWorld('ipc', {...})` | **Punto crítico**: Validación Zod ANTES de `ipcRenderer.invoke` |
| `client/src/renderer/src/lib/ipc.ts` | `ipc` object tipado | Wrapper TypeScript para `window.ipc` en renderer |

**Funciones Críticas:**
```typescript
// preload/index.ts - Validación runtime obligatoria
launchGame: (args: unknown) => {
  const validated = validateIpcPayload(LaunchGameArgsSchema, args);
  return ipcRenderer.invoke('launch-game', validated);
}

// validators.ts - Helper reutilizable
export function validateIpcPayload<T>(schema: z.ZodSchema<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(`IPC validation failed: ${result.error.message}`);
  }
  return result.data;
}
```

---

### MEJORA 2: NetworkContext + React Query

| Archivo | Función Principal | Responsabilidad |
|---------|-------------------|-----------------|
| `client/src/renderer/src/providers/NetworkProvider.tsx` | `NetworkProvider`, `queryClient` | Provider raíz con QueryClient configurado |
| `client/src/renderer/src/context/NetworkContext.tsx` | `useNetwork()`, `NetworkContext` | Context + hooks tipados para queries/mutations |
| `client/src/renderer/src/hooks/useHealthCheck.ts` | `useHealthCheck()` | Query `['health']` con refetch 10s |
| `client/src/renderer/src/hooks/useRelayStatus.ts` | `useRelayStatus()` | Query `['relay-status']` con refetch 5s |
| `client/src/renderer/src/hooks/useLaunchGame.ts` | `useLaunchGame()` | Mutation `launch-game` con toast success/error |
| `client/src/renderer/src/hooks/useRelayTunnel.ts` | `useStartRelayTunnel()`, `useStopRelayTunnel()` | Mutations para túnel relay |
| `client/src/renderer/src/lib/ipc.ts` | `ipc` object | Wrapper tipado sobre `window.ipc` |

**Query Keys Estándar:**
```typescript
// Health check - refetch cada 10s
queryKey: ['health']
queryFn: () => ipc.healthCheck()
refetchInterval: 10_000

// Relay status - refetch cada 5s (solo si enabled)
queryKey: ['relay-status']
queryFn: () => ipc.getRelayStatus()
refetchInterval: 5_000
enabled: false // Se habilita cuando hay túnel activo

// Métricas - refetch cada 15s
queryKey: ['metrics']
queryFn: () => ipc.getMetrics()
refetchInterval: 15_000

// Matchmaking - enabled por matchId
queryKey: ['matchmaking', matchId]
queryFn: () => ipc.getMatchmakingStatus(matchId)
enabled: !!matchId
```

---

### MEJORA 3: Servicios Proxy/Forwarder/MITM/Bore + ProcessManager

| Archivo | Clase Principal | Métodos Clave | Métricas Expuestas |
|---------|-----------------|---------------|-------------------|
| `client/src/main/services/ProcessManager.ts` | `ProcessManager` | `startService()`, `stopService()`, `restartService()`, `getStatus()`, `getAllStatus()`, `setupHealthCheck()` | `ServiceStatus[]` |
| `client/src/main/services/ProxyService.ts` | `ProxyService` | `start()`, `stop()`, `healthCheck()`, `handleConnection()`, `getMetrics()` | `ProxyMetrics { connectionsTotal, connectionsActive, bytesProxied, errors }` |
| `client/src/main/services/ForwarderService.ts` | `ForwarderService` | `start()`, `stop()`, `healthCheck()`, `handleConnection()`, `getMetrics()` | `ForwarderMetrics { connectionsTotal, connectionsActive, bytesForwarded, errors }` |
| `client/src/main/services/MitmRelayService.ts` | `MitmRelayService` | `start()`, `stop()`, `healthCheck()`, `getMetrics()`, `emit('frame', ParsedFrame)` | `MitmMetrics { connectionsTotal, connectionsActive, framesIntercepted, bytesIntercepted, errors }` |
| `client/src/main/services/BoreService.ts` | `BoreService` | `start()`, `stop()`, `healthCheck()`, `getMetrics()`, `emit('connected', port)`, `emit('disconnected')` | `BoreMetrics { connected, assignedPort, restarts, uptimeMs, lastError }` |
| `client/src/main/services/GameLauncher.ts` | `GameLauncher` | `launch(args: LaunchGameArgs)`, `stop(pid)`, `getStatus(pid)` | `GameStatus { pid, running, core, gamePath }` |

**Flujo de Datos en Main Process:**
```typescript
// ipc/handlers.ts - Orquestación
ipcMain.handle('start-relay-tunnel', async (_event, args) => {
  // 1. Validar args con Zod (ya validado en preload, defensa en profundidad)
  const validated = validateIpcPayload(StartRelayTunnelArgsSchema, args);
  
  // 2. Iniciar Bore → obtiene puerto dinámico
  const bore = new BoreService({ localPort: validated.localPort, boreHost: 'bore.pub' });
  const borePort = await bore.start();
  
  // 3. Iniciar Proxy (55435 → bore.pub:borePort)
  const proxy = new ProxyService({ listenPort: 55435, targetHost: 'bore.pub', targetPort: borePort });
  await proxy.start();
  
  // 4. Iniciar Forwarder (55436 → LAN_IP:55435)
  const forwarder = new ForwarderService({ listenPort: validated.localPort, targetPort: 55435 });
  await forwarder.start();
  
  // 5. Iniciar MITM (opcional, debugging)
  const mitm = new MitmRelayService({ listenPort: 55437, targetHost: 'bore.pub', targetPort: borePort });
  await mitm.start();
  
  // 6. Registrar en ProcessManager para health checks
  processManager.startService({ name: 'proxy', ..., healthCheck: { check: () => proxy.healthCheck() } });
  processManager.startService({ name: 'forwarder', ..., healthCheck: { check: () => forwarder.healthCheck() } });
  processManager.startService({ name: 'bore', ..., healthCheck: { check: () => bore.healthCheck() } });
  
  // 7. Guardar referencias para cleanup
  relayServices = { proxy, forwarder, mitm, bore };
  
  // 8. Notificar a renderer
  mainWindow?.webContents.send('relay:status', { connected: true, port: borePort });
  
  return { success: true, port: borePort };
});
```

---

### MEJORA 4: Health Checks + Auto-Restart + Circuit Breaker

**Implementado en:** `ProcessManager.ts` (ver sección MEJORA 3)

**Configuración por Defecto:**
```typescript
const DEFAULT_HEALTH_CHECK: HealthCheckConfig = {
  intervalMs: 10_000,    // Cada 10 segundos
  timeoutMs: 3_000,      // Timeout 3s por check
  retries: 3,            // 3 fallos consecutivos = unhealthy
  check: () => Promise.resolve(true), // Override por servicio
};

const DEFAULT_RESTART_POLICY: RestartPolicy = {
  maxRetries: 3,                    // Máximo 3 reintentos
  backoffMs: [2000, 4000, 8000],    // Backoff exponencial: 2s, 4s, 8s
  resetAfterMs: 60_000,             // Circuit breaker reset tras 60s sano
};
```

**Estados de Servicio:**
```
stopped → starting → running → unhealthy → restarting → running
                    ↘ stopping → stopped
```

**Eventos Emitidos (para IPC a renderer):**
- `service:started` - Servicio iniciado correctamente
- `service:stopped` - Servicio detenido
- `service:restarted` - Reinicio automático ejecutado
- `service:circuit-open` - Circuit breaker abierto (max retries)
- `health:status` - Health check agregado (cada 10s)

---

### MEJORA 5: Winston Logger Estructurado + Rotación

| Archivo | Responsabilidad |
|---------|-----------------|
| `client/src/main/logger/index.ts` | `logger` singleton, `createLogger()` |
| `client/src/main/logger/transports.ts` | Console (pretty) + File (JSON) transports |
| `client/src/main/logger/rotation.ts` | Rotación 10MB, max 30 archivos, compresión gzip |

**Configuración:**
```typescript
// logger/index.ts
import winston from 'winston';
import { consoleTransport } from './transports';
import { fileTransport } from './transports';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'main', 
    pid: process.pid,
    appVersion: process.env.APP_VERSION 
  },
  transports: [
    consoleTransport,  // Pretty print en desarrollo
    fileTransport,     // JSON en archivo rotado
  ],
});

// transports.ts
export const fileTransport = new winston.transports.File({
  filename: 'logs/main_process.log',
  maxsize: 10 * 1024 * 1024,      // 10MB
  maxFiles: 30,                    // 30 archivos
  tailable: true,
  zippedArchive: true,             // Comprimir .gz
  format: winston.format.json(),
});

// Uso en servicios
logger.info({ service: 'proxy', port: 55435 }, 'Proxy started');
logger.warn({ service: 'bore', stderr: output }, 'Bore warning');
logger.error({ service: 'forwarder', error: err.message, stack: err.stack }, 'Forwarder failed');
```

**Correlation IDs para Tracing:**
```typescript
// En handlers IPC
const correlationId = crypto.randomUUID();
logger.info({ correlationId, args }, 'Starting relay tunnel');
// Todos los logs subsiguientes incluyen correlationId
```

---

### MEJORA 6: Error Boundaries + Toast + ErrorPayload Tipado

| Archivo | Componente | Responsabilidad |
|---------|------------|-----------------|
| `client/src/renderer/src/components/ErrorBoundary.tsx` | `ErrorBoundary` | Catch errors en árbol React, fallback UI, log a Sentry/consola |
| `client/src/renderer/src/components/ErrorToast.tsx` | `useErrorToast()` | Hook para mostrar toasts tipados desde `ErrorPayload` |
| `client/src/renderer/src/hooks/useErrorHandler.ts` | `useErrorHandler()` | Handler global para errores de mutations React Query |

**ErrorPayload (desde `@emu-latam/ipc-types`):**
```typescript
interface ErrorPayload {
  code: string;           // 'LAUNCH_FAILED', 'TUNNEL_TIMEOUT', 'HEALTH_CHECK_FAILED'
  message: string;        // Human readable
  context?: Record<string, unknown>; // Debug info
  recoverable: boolean;   // Mostrar botón "Reintentar"
  timestamp: number;
  correlationId?: string; // Para logs
}
```

**Integración React Query:**
```typescript
// NetworkContext.tsx - mutation default options
mutations: {
  onError: (error: Error) => {
    // Error ya viene tipado como ErrorPayload si backend lo envía así
    const payload = error as unknown as ErrorPayload;
    toast.error(payload.message, { 
      id: payload.correlationId,
      action: payload.recoverable ? { label: 'Reintentar', onClick: () => mutate() } : undefined
    });
  },
}
```

---

### MEJORA 7: Tests (Unit + Integration + E2E)

| Archivo | Tipo | Qué Testea |
|---------|------|------------|
| `client/test/unit/services/ProxyService.test.ts` | Unit | Proxy TCP: conexiones, métricas, health check |
| `client/test/unit/services/ForwarderService.test.ts` | Unit | Forwarder: LAN IP resolution, pipe bidireccional |
| `client/test/unit/services/BoreService.test.ts` | Unit | Bore: spawn, puerto parsing, reconexión |
| `client/test/unit/services/ProcessManager.test.ts` | Unit | Lifecycle, restart policy, circuit breaker |
| `client/test/unit/ipc/validators.test.ts` | Unit | Zod schemas: valid/invalid payloads |
| `client/test/unit/utils/network.test.ts` | Unit | `getLanIp()`, `waitForPort()` |
| `client/test/integration/testcontainers/nakama.test.ts` | Integration | Nakama Docker: matchmaking, auth |
| `client/test/integration/e2e/playwright/host-flow.spec.ts` | E2E | Flujo completo Host → Launch Game |
| `client/test/integration/e2e/playwright/join-flow.spec.ts` | E2E | Flujo Join → Connect |
| `client/test/integration/e2e/playwright/relay-flow.spec.ts` | E2E | Host Bore + Join con relay |

**Comandos de Test:**
```json
// client/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

### MEJORA 8: TypeScript Strict Mode

**Archivos de Configuración:**
| Archivo | Cambio |
|---------|--------|
| `client/tsconfig.json` | `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true` |
| `client/tsconfig.node.json` | Hereda strict, main process |
| `client/tsconfig.app.json` | Hereda strict, renderer process |
| `packages/ipc-types/tsconfig.json` | Strict desde el inicio |

**Migración Incremental (por paquetes):**
1. `packages/ipc-types` → Strict desde día 1
2. `client/src/main` → Strict + fixes
3. `client/src/preload` → Strict + fixes  
4. `client/src/renderer` → Strict + fixes (más complejo, último)

**Patrones de Fix Comunes:**
```typescript
// Antes (any)
const handleData = (data: any) => { ... }

// Después (unknown + type guard)
const handleData = (data: unknown) => {
  if (isValidData(data)) { ... }
}

// Type guards
function isValidData(data: unknown): data is ValidData {
  return typeof data === 'object' && data !== null && 'field' in data;
}
```

---

### MEJORA 9: Config Centralizada (Zod + YAML)

| Archivo | Responsabilidad |
|---------|-----------------|
| `client/src/main/config/schema.ts` | `ConfigSchema` (Zod), `Config` type inferido |
| `client/src/main/config/defaults.ts` | Valores por defecto |
| `client/src/main/config/ConfigService.ts` | `load()`, `get()`, `set()`, `save()`, `watch()` |
| `client/config/app.yaml` | Config usuario (gitignored) |
| `client/config/app.defaults.yaml` | Defaults commiteados |

**Schema Zod:**
```typescript
// schema.ts
export const ConfigSchema = z.object({
  netplay: z.object({
    port: z.number().int().positive().default(55435),
    relayPort: z.number().int().positive().default(55436),
    mitmPort: z.number().int().positive().default(55437),
  }),
  bore: z.object({
    host: z.string().default('bore.pub'),
    port: z.number().int().positive().default(443),
    authToken: z.string().optional(),
  }),
  retroarch: z.object({
    executablePath: z.string().min(1),
    coresPath: z.string().min(1),
    configPath: z.string().min(1),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    fileEnabled: z.boolean().default(true),
  }),
  ui: z.object({
    language: z.enum(['es', 'en']).default('es'),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

---

### MEJORA 10: Electron Forge + Auto-Update

| Archivo | Responsabilidad |
|---------|-----------------|
| `client/forge.config.ts` | Configuración Electron Forge (maker: squirrel, dmg, deb) |
| `client/src/main/autoUpdater.ts` | `electron-updater` setup, checkForUpdates, eventos |
| `.github/workflows/release.yml` | CI: build → sign → publish to GitHub Releases |

**forge.config.ts (extracto):**
```typescript
import { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'resources/icon',
    executableName: 'emu-latam',
  },
  makers: [
    { name: '@electron-forge/maker-squirrel', config: { name: 'emu-latam' } },
    { name: '@electron-forge/maker-dmg', config: { name: 'Emu Latam' } },
    { name: '@electron-forge/maker-deb', config: { name: 'emu-latam' } },
  ],
  plugins: [
    { name: '@electron-forge/plugin-vite', config: { build: [{ entry: 'src/main/index.ts', config: 'vite.main.config.ts' }, { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts' }], renderer: [{ name: 'main', config: 'vite.renderer.config.ts' }] } },
  ],
  publishers: [
    { name: '@electron-forge/publisher-github', config: { repository: { owner: 'ANTIGRAVITY', name: 'emu-latam' }, prerelease: false } },
  ],
};

export default config;
```

---

### MEJORA 11: i18n (react-i18next)

| Archivo | Responsabilidad |
|---------|-----------------|
| `client/src/renderer/src/i18n/index.ts` | `i18n` instance, init, detector |
| `client/src/renderer/src/i18n/locales/es.json` | Traducciones español |
| `client/src/renderer/src/i18n/locales/en.json` | Traducciones inglés |

**Claves Principales:**
```json
// es.json
{
  "app": { "name": "Emu Latam", "tagline": "Retro gaming multiplayer" },
  "host": { "direct": "Host Directo", "bore": "Host con Bore", "launch": "Iniciar Juego" },
  "join": { "title": "Unirse a Partida", "relayFile": "Archivo de Relay", "connect": "Conectar" },
  "relay": { "starting": "Iniciando túnel...", "started": "Túnel activo en puerto {{port}}", "stopped": "Túnel detenido" },
  "health": { "healthy": "Saludable", "degraded": "Degradado", "unhealthy": "No saludable" },
  "errors": { "launchFailed": "Error al iniciar juego", "tunnelTimeout": "Timeout conectando túnel", "retry": "Reintentar" }
}
```

---

### MEJORA 12: Nakama OpenAPI + Codegen

| Archivo | Responsabilidad |
|---------|-----------------|
| `packages/nakama-client/` | Paquete generado (npm workspace) |
| `backend/nakama/openapi.yaml` | Spec OpenAPI 3.0 de Nakama |
| `scripts/generate-nakama-client.ts` | Script codegen (openapi-typescript-codegen) |
| `client/src/renderer/src/lib/nakama.ts` | Wrapper tipado para uso en React |

**Flujo Codegen:**
```bash
# 1. Obtener spec de Nakama (o usar local)
curl http://localhost:7350/openapi.json > backend/nakama/openapi.json

# 2. Generar cliente TypeScript
npx openapi-typescript-codegen -i backend/nakama/openapi.json -o packages/nakama-client/src -c axios

# 3. Publicar localmente (npm pack + file: dependency)
cd packages/nakama-client && npm pack
cd ../.. && npm install ./packages/nakama-client/nakama-client-1.0.0.tgz
```

---

## 3. Logs Relacionados (Regla 17 - Rotación)

### Archivos de Log Actuales
| Archivo | Contenido | Rotación |
|---------|-----------|----------|
| `Logs/main_process.log` | Logs main process (Winston JSON) | 10MB, 30 archivos, gzip |
| `Logs/rotated/main_process-YYYY-MM-DD.log` | Logs históricos rotados | N/A (solo lectura) |
| `Logs/dev_output.txt` | Stdout/stderr desarrollo | Manual |
| `Logs/ULTIMO_NUMERO.txt` | Contador para nomenclatura logs | N/A |

### Estructura de Log Entry (Winston JSON)
```json
{
  "level": "info",
  "message": "Proxy started",
  "timestamp": "2026-07-04 15:30:45.123",
  "service": "proxy",
  "pid": 12345,
  "appVersion": "1.2.0",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "port": 55435
}
```

### Logs de Debugging Clave por Flujo

**Flujo Host Directo (Protegido - Regla 15):**
```
[main] launch-game invoked { useRelay: false, isHost: true, gamePath: "...", core: "fbneo_libretro.dll" }
[main] GameLauncher.spawn retroarch -L fbneo_libretro.dll --host --port 55435 "rom.zip"
[proxy] healthCheck OK { latencyMs: 2 }
[forwarder] healthCheck OK { latencyMs: 1 }
```

**Flujo Host con Bore (Protegido - Regla 15):**
```
[main] start-relay-tunnel invoked { localPort: 55436 }
[bore] spawned bore local 55436 --to bore.pub
[bore] stdout "listening on bore.pub:38472"
[main] borePort=38472
[proxy] started { listenPort: 55435, target: bore.pub:38472 }
[forwarder] started { listenPort: 55436, target: 192.168.1.50:55435 }
[mitm] started { listenPort: 55437, target: bore.pub:38472 }
[main] relay:status emitted { connected: true, port: 38472 }
```

**Flujo Join Directo (Protegido - Regla 15):**
```
[main] launch-game invoked { useRelay: true, relayIp: "192.168.1.50", isHost: false }
[main] relayIp es LAN IP → conexión directa
[proxy] healthCheck OK (no usado en join directo)
[forwarder] healthCheck OK (no usado en join directo)
[main] GameLauncher.spawn retroarch -L fbneo_libretro.dll --connect 192.168.1.50 --port 55435 "rom.zip"
```

---

## 4. Puntos de Entrada Críticos (Main Process)

| Archivo | Función | Descripción |
|---------|---------|-------------|
| `client/src/main/index.ts` | `main()` | Bootstrap: logger, ProcessManager, IPC handlers, window creation |
| `client/src/main/ipc/handlers.ts` | `registerIpcHandlers()` | Registra todos los `ipcMain.handle` |
| `client/src/main/services/ProcessManager.ts` | `ProcessManager` | Singleton para lifecycle de servicios |
| `client/src/preload/index.ts` | `exposeIpc()` | `contextBridge` + validación Zod |

---

## 5. Puntos de Entrada Críticos (Renderer)

| Archivo | Componente | Descripción |
|---------|------------|-------------|
| `client/src/renderer/src/main.tsx` | `root.render()` | Bootstrap React + QueryClientProvider + NetworkProvider + i18n |
| `client/src/renderer/src/App.tsx` | `App` | Routing, layout, ErrorBoundary raíz |
| `client/src/renderer/src/providers/NetworkProvider.tsx` | `NetworkProvider` | Proveedor NetworkContext + React Query |
| `client/src/renderer/src/pages/Host.tsx` | `HostPage` | UI Host: botones directo, relay, launch game, health indicator |
| `client/src/renderer/src/pages/Join.tsx` | `JoinPage` | UI Join: relay file picker, connect, health indicator |

---

## 6. Scripts de Desarrollo y Build

```json
// client/package.json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "lint": "eslint . --ext ts,tsx",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "forge:make": "electron-forge make",
    "forge:publish": "electron-forge publish",
    "generate:ipc-types": "cd packages/ipc-types && npm run build",
    "generate:nakama": "ts-node scripts/generate-nakama-client.ts"
  }
}
```

---

## 7. Variables de Entorno Relevantes

| Variable | Descripción | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Nivel Winston | `info` |
| `APP_VERSION` | Versión para logs/updater | `package.json version` |
| `NAKAMA_HOST` | Host Nakama server | `localhost` |
| `NAKAMA_PORT` | Puerto Nakama | `7350` |
| `BORE_HOST` | Host bore.pub | `bore.pub` |
| `BORE_PORT` | Puerto bore | `443` |
| `RETROARCH_PATH` | Path ejecutable RetroArch | Config YAML |
| `NODE_ENV` | Entorno | `development` |