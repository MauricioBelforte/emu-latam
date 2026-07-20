# 03 - Diseño - Plan de Mejoras (minimax-m3)

## Arquitectura objetivo

```
┌──────────────────────────────────────────────────────────────┐
│                       Renderer (React)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐ │
│  │ App.tsx    │  │ ToastHost  │  │ useToast() │  │ <Header>│ │
│  │ (compone)  │  │ (provider) │  │ (hook)     │  │ status  │ │
│  └─────┬──────┘  └────────────┘  └────────────┘  └─────────┘ │
│        │ window.electron.ipcRenderer (whitelist)              │
└────────┼─────────────────────────────────────────────────────┘
         │ contextBridge
┌────────┼─────────────────────────────────────────────────────┐
│ Preload│ typed IPC (invoke<Req,Res>)                          │
└────────┼─────────────────────────────────────────────────────┘
         │ ipcMain.handle
┌────────▼─────────────────────────────────────────────────────┐
│                       Main Process                            │
│  ┌──────────────────┐  ┌──────────────────────────────────┐  │
│  │ processRegistry  │  │ relayConfigStore (userData/      │  │
│  │ - register       │  │   emu_latam_relay.json)          │  │
│  │ - killAll        │  │ - read()                         │  │
│  │ - list           │  │ - write()                        │  │
│  └──────┬───────────┘  └──────────────────────────────────┘  │
│         │                                                    │
│  ┌──────▼───────────┐  ┌──────────────────────────────────┐  │
│  │ startBoreCore()  │  │ shared/                          │  │
│  │ (unifica v1/v2)  │  │ - waitForPort(port)              │  │
│  └──────────────────┘  │ - assertPortFree(port)           │  │
│                        │ - isPortInUse(port)              │  │
│                        └──────────────────────────────────┘  │
│                                                                │
│  [HANDLERS EXISTENTES] - launch-game, start-relay-tunnel-v1/v2 │
│                         (sin tocar, regla 15)                  │
└──────────────────────────────────────────────────────────────┘
```

## Componentes a crear

### 1. `client/src/main/services/processRegistry.ts`

Registro centralizado de procesos hijos. Expone:

```typescript
type ProcessTag = "nakama" | "bore" | "retroarch" | "mitm-relay" | "forwarder" | "proxy";

interface RegisteredProcess {
  tag: ProcessTag;
  pid?: number;
  startedAt: number;
  kill: () => void;
  meta?: Record<string, unknown>;
}

class ProcessRegistry {
  private processes = new Map<string, RegisteredProcess>();

  register(id: string, proc: RegisteredProcess): void;
  unregister(id: string): void;
  killByTag(tag: ProcessTag): number; // retorna cantidad matada
  killAll(exceptTags?: ProcessTag[]): void;
  list(): RegisteredProcess[];
  heartbeat(): void; // escribe en log cada 60s
}

export const processRegistry = new ProcessRegistry();
```

- **Cleanup garantizado:** se suscribe a `app.on("before-quit")` y `app.on("window-all-closed")` para `killAll()`.
- **Logging:** cada `register/unregister/killByTag` loguea con prefijo `[PROC]`.

### 2. `client/src/main/services/ipcChannels.ts`

Tipos de canales IPC centralizados con union types.

```typescript
export const IPC_CHANNELS = {
  LAUNCH_GAME: "launch-game",
  START_RELAY_TUNNEL: "start-relay-tunnel",
  START_RELAY_TUNNEL_V2: "start-relay-tunnel-v2",
  KILL_RETROARCH: "kill-retroarch",
  START_MITM_LOCAL: "start-mitm-local",
  STOP_MITM_LOCAL: "stop-mitm-local",
  SAVE_RELAY_URL: "save-relay-url",
  GET_RELAY_URL: "get-relay-url",
  GET_NAKAMA_SERVER: "get-nakama-server",
  SET_NAKAMA_SERVER: "set-nakama-server",
  CHECK_NAKAMA_HEALTH: "check-nakama-health",
  GET_TAILSCALE_IP: "get-tailscale-ip",
  TAILSCALE_HOST: "tailscale-host",
  TAILSCALE_GUEST: "tailscale-guest",
  CHECK_PEER_CONNECTIVITY: "check-peer-connectivity",
  // Nuevos
  ASSERT_PORT_FREE: "assert-port-free",
  GET_PROCESS_REGISTRY: "get-process-registry",
  KILL_BY_TAG: "kill-by-tag",
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

export const IPC_WHITELIST: ReadonlySet<string> = new Set(Object.values(IPC_CHANNELS));
```

- En `preload/index.ts`: validar que el canal esté en `IPC_WHITELIST` antes de invocar.
- En `main/index.ts`: importar `IPC_CHANNELS` en vez de usar strings literales.

### 3. `client/src/main/services/relayConfigStore.ts`

```typescript
import { app } from "electron";
import fs from "fs";
import path from "path";

interface RelayConfig {
  url: string;
  setAt: number;
  setBy: string; // "host" | "manual"
}

const legacyPath = (): string =>
  path.join(/* getProjectRoot() */, "relay-server", "active_relay.txt");

const newPath = (): string =>
  path.join(app.getPath("userData"), "emu_latam_relay.json");

export const relayConfigStore = {
  read(): RelayConfig | null { /* userData primero, fallback legacy */ },
  write(url: string, setBy: string): void { /* escribe en userData Y mantiene legacy como espejo */ },
  clear(): void { /* borra ambos */ },
};
```

- **No rompe nada:** ambos archivos se mantienen en sync; el legacy queda como espejo por si userData está en una unidad de sólo lectura.

### 4. `client/src/main/services/shared/portUtils.ts`

```typescript
export function isPortInUse(port: number, host = "127.0.0.1"): Promise<boolean>;
export function assertPortFree(port: number): Promise<void>; // throw si está en uso
export function assertPortsFree(ports: number[]): Promise<void>;
```

- `assertPortFree(55435)` se llamaría en `launch-game` antes de spawn, **sin modificar** el handler existente: se agrega un wrapper `launch-game-safe` que sí lo hace. Cumple RF-01 y regla 15.

### 5. `client/src/renderer/hooks/useToast.ts`

Hook minimalista sin dependencias externas.

```typescript
interface Toast {
  id: string;
  kind: "info" | "success" | "warning" | "error";
  message: string;
  durationMs: number;
}

export function useToast(): {
  toasts: Toast[];
  show: (msg: string, kind?: Toast["kind"], durationMs?: number) => void;
  dismiss: (id: string) => void;
};
```

- Implementado con `useState` + cola FIFO.
- Máximo 3 toasts simultáneos visibles (los viejos se descartan).

### 6. `client/src/renderer/components/ToastHost.tsx`

- Lee el contexto (o usa directamente `useToast()` desde un `<ToastProvider>`).
- Estilo consistente con el theme arcade (bordes neón, fuente monoespaciada).
- Posición: top-right, animaciones con `keyframes` de styled-components.

## Cambios al `App.tsx` (sin romper flujos)

- Reemplazar `alert(...)` por `toast.show(...)`.
- Extraer `handleDirectHost`, `handleDirectJoin`, `handleTailscaleHost`, `handleTailscaleGuest` a hooks `useHostingActions()` para reducir el `App.tsx` a composición.
- Agregar un botón "Cancelar" para detener bore y limpiar forwarder (cambia `loading.bore` + llama a un nuevo `stop-bore` IPC).

## Decisión sobre la duplicación de `start-relay-tunnel` (v1) y `start-relay-tunnel-v2`

- Extraer lógica común a `boreCore.ts` con parámetro `host: "bore.pub" | string` (ya sea hostname o IP resuelta).
- `start-relay-tunnel` v1 → wrapper que pasa `bore.pub` (hostname).
- `start-relay-tunnel-v2` → wrapper que resuelve DNS a IP primero.
- **No se elimina ninguno de los dos handlers** (regla 15). La deduplicación es interna.

## Diagrama de secuencia: nueva limpieza al cerrar

```
[Usuario cierra ventana]
    │
    ▼
[Electron: before-quit]
    │
    ▼
[ProcessRegistry.killAll(except: [])]
    │
    ├──► taskkill /f /im bore.exe
    ├──► taskkill /f /im retroarch.exe
    ├──► mitmRelayProcess?.kill()
    ├──► forwarderServers.forEach(s => s.close())
    ├──► proxyServers.forEach(s => s.close())
    └──► nakamaProcess?.kill()
    │
    ▼
[app.quit()]
```

## Validación

- Tests unitarios en `test_stable_flows.js` extendidos:
  - `should kill all registered processes on before-quit` (mock de `app.on`).
  - `should reject IPC channels not in whitelist` (mock de `ipcRenderer.invoke`).
  - `should return error from assertPortFree when port busy`.
- Tests manuales: levantar 2 instancias de RetroArch, cerrar ventana → confirmar `tasklist` limpio.

## Criterios de no-regresión

- `npm run test:stable` debe pasar 100%.
- `npm run lint` debe pasar 100%.
- `npm run dev` debe levantar sin warnings nuevos.
- `npm run package` debe generar el EXE con los recursos nuevos copiados.
