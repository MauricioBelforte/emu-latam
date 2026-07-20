# 03-Diseno — DeepSeek V4 Flash Free

## Arquitectura de Módulos Propuesta

### Diagrama de Módulos (Main Process)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        index.ts (orquestador)                        │
│                                                                      │
│  app.whenReady() → initLogging() → launchNakama() → createWindow()   │
│  registerHandlers()  ← ipc-handlers.ts                               │
└──────┬──────────────────────────────────────────────────────────┬────┘
       │                                                          │
       ▼                                                          ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│  ipc-handlers.ts │  │ process-        │  │  tcp-proxy.ts           │
│                  │  │ manager.ts      │  │                         │
│  • launchGame()  │  │                 │  │  • startProxy()         │
│  • relayTunnel() │──▶ • launchNakama()│  │  • stopProxy()          │
│  • mitmLocal()   │  │ • launchRA()    │  │  • startForwarder()     │
│  • killRA()      │  │ • launchBore()  │  │  • stopForwarder()      │
│  • tailscale()   │  │ • killRA()      │  │                         │
│  • getLanIp()    │  │ • killBore()    │  └─────────────────────────┘
└─────────────────┘  └─────────────────┘
                              │
                              ▼
┌─────────────────┐  ┌─────────────────┐
│  config.ts      │  │  network-utils   │
│                 │  │  .ts            │
│  • PUERTOS      │  │                 │
│  • RUTAS        │  │  • getLanIp()   │
│  • TIMEOUTS     │  │  • getTSIp()    │
│  • SECRETS (.env)│  │  • waitForPort()│
└─────────────────┘  └─────────────────┘
```

### Diagrama de Comunicación (Renderer → Main)

```
┌──────────────────────────────┐
│        RENDERER (React)       │
│                               │
│  window.electron.invoke(      │
│    "launch-game",             │
│    { mode: "host", ... }      │
│  )                            │
└──────────┬───────────────────┘
           │ ipcRenderer.invoke()
           ▼
┌──────────────────────────────┐
│        PRELOAD (tipado)       │
│                               │
│  ALLOWED_CHANNELS whitelist   │
│  → valida canal               │
│  → type-check args            │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│    MAIN PROCESS (ipc-handlers)│
│                               │
│  handleLaunchGame(args)       │
│  → processManager.launchRA()  │
│  → tcpProxy.startProxy()      │
└──────────────────────────────┘
```

## Diseño UX: Sistema de Notificaciones

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────┐│
│  │ ✅ Reto aceptado                        ││
│  │    Conectando con jugador...            ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │ ❌ Error al conectar                   ││
│  │    No se pudo establecer el túnel       ││
│  └─────────────────────────────────────────┘│
│                      ┌─────┐               │
│                      │ OK  │               │
│                      └─────┘               │
└─────────────────────────────────────────────┘
```

### Componentes UI Propuestos

```
src/renderer/components/
├── ui/
│   ├── Toast/                    # Sistema de notificaciones
│   │   ├── ToastContainer.tsx     # Contenedor (portal)
│   │   ├── Toast.tsx              # Notificación individual
│   │   └── useToast.ts           # Hook para disparar toasts
│   ├── Spinner/
│   │   └── LoadingSpinner.tsx    # Spinner reutilizable con texto
│   └── StatusBar/
│       └── ConnectionStatus.tsx   # Estado de conexión global
├── layout/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Shell.tsx
└── chat/
    └── ChatBox.tsx
```

## Diseño de Infraestructura Cloud

```
┌─────────────────────────────────────────────────┐
│                   VPS (Linux)                     │
│                                                    │
│  ┌───────────────────────┐  ┌──────────────────┐   │
│  │ Docker Compose        │  │ Bore Server      │   │
│  │                       │  │ (Go binary)      │   │
│  │  ┌─────┐  ┌────────┐ │  │                  │   │
│  │  │NAKAMA│  │Postgres│ │  │ puerto 55436     │   │
│  │  │:7350 │  │:5432   │ │  │ → público        │   │
│  │  └─────┘  └────────┘ │  └──────────────────┘   │
│  └───────────────────────┘                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ nginx (reverse proxy)                        │  │
│  │ nakama.domain.com → localhost:7350           │  │
│  │ bore.domain.com → localhost:55436            │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

## Flujo de CI/CD Propuesto

```
Git Push → GitHub Actions
  ├── Lint (eslint + tsc --noEmit)
  ├── Test (vitest + npm run test:stable)
  ├── Build (electron-vite build)
  ├── Release (electron-builder)
  │    ├── Windows → .exe (NSIS)
  │    ├── Linux → .AppImage
  │    └── macOS → .dmg
  └── Deploy (SSH + docker-compose up)
       └── VPS Nakama + Bore Server
```

## Estrategia de Cacheo de IPs

```typescript
// network-utils.ts
let cachedLanIp: string | null = null;
let cachedTailscaleIp: string | null = null;
let lastNetworkCheck = 0;
const CACHE_TTL = 30_000; // 30 segundos

export function getLanIp(): string {
  if (cachedLanIp && (Date.now() - lastNetworkCheck) < CACHE_TTL) {
    return cachedLanIp;
  }
  cachedLanIp = computeLanIp(); // lógica original
  lastNetworkCheck = Date.now();
  return cachedLanIp;
}

// Forzar invalidación al detectar cambio de red
export function invalidateNetworkCache(): void {
  cachedLanIp = null;
  cachedTailscaleIp = null;
  lastNetworkCheck = 0;
}
```

## Plan de Migración Gradual

### Paso 1: Tipado y Seguridad (semana 1)
1. Crear `src/shared/types.ts` con interfaces para cada canal IPC
2. Actualizar preload con whitelist y tipos
3. Refactorizar renderer para usar tipos (eliminar `@ts-expect-error`)
4. Sanitizar comandos shell en `process-manager.ts`

### Paso 2: Módulos (semana 2-3)
1. Extraer `config.ts` (constantes)
2. Extraer `logging.ts` (con rotación)
3. Extraer `network-utils.ts` (con cacheo)
4. Extraer `tcp-proxy.ts` (proxy + forwarder)
5. Extraer `process-manager.ts` (spawn/kill)
6. Extraer `ipc-handlers.ts` (handlers IPC)
7. `index.ts` queda como orquestador (~50 líneas)

### Paso 3: UX (semana 3-4)
1. Implementar `useToast` hook + `ToastContainer`
2. Implementar `LoadingSpinner` reutilizable
3. Optimizar health check loop
4. Lazy loading de modales

### Paso 4: Infraestructura y CI/CD (semana 5-8)
1. Dockerizar Nakama + PostgreSQL
2. Desplegar en VPS
3. Configurar GitHub Actions
4. Configurar electron-builder

### Paso 5: Tests (semana 5-8, paralelo con paso 4)
1. Configurar Vitest
2. Tests para contextos React
3. Tests para módulos del main process
4. Husky + lint-staged
