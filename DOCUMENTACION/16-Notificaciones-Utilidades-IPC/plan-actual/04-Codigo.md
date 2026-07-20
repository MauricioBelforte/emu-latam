# Código: Notificaciones, Utilidades Compartidas y Seguridad IPC

## Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `client/src/context/ToastContext.tsx` | Provider + hook useToast para notificaciones |
| `client/src/components/ToastHost.tsx` | Render visual de toasts (top-right) |
| `client/src/main/services/ipcChannels.ts` | Enum IPC_CHANNELS + whitelist Set |
| `client/src/main/services/portUtils.ts` | isPortInUse, assertPortFree |
| `client/src/main/services/relayConfigStore.ts` | Persistencia relay URL en userData |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/main/index.ts` | Usar IPC_CHANNELS enum, agregar handlers assert-port-free/get/set/clear-relay-config |
| `client/src/preload/index.ts` | Validar canal contra IPC_WHITELIST antes de invoke |
| `client/src/main.tsx` | Envolver con <ToastProvider> |
| `client/src/App.tsx` | Renderizar <ToastHost />, reemplazar alert() por toast donde corresponda |

## Funciones clave

### ToastContext.tsx
```typescript
interface Toast {
  id: string
  kind: 'info' | 'success' | 'warning' | 'error'
  message: string
  durationMs: number
}

// Provider mantiene estado de toasts[]
// Hook useToast() expone:
//   toasts: Toast[]
//   show(msg, kind?, durationMs?): void   ← push a cola, auto-dismiss
//   dismiss(id): void                      ← remover manual
// Cola FIFO, max 3 visibles
```

### ToastHost.tsx
```typescript
// Consume ToastContext.toasts
// Render: position fixed, top-right, z-index 10000
// Color según kind:
//   success → #27ae60 (verde)
//   error → #c0392b (rojo)
//   warning → #e67e22 (naranja)
//   info → #2980b9 (azul)
// Animación: slide-in desde derecha (keyframes)
```

### ipcChannels.ts
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
  STOP_TAILSCALE: "stop-tailscale",
  OPEN_FIREWALL_PORT: "open-firewall-port",
  CHECK_PEER_CONNECTIVITY: "check-peer-connectivity",
  READ_NETPLAY_CONFIG: "read-netplay-config",
  WRITE_NETPLAY_CONFIG: "write-netplay-config",
  RESTORE_NETPLAY_CONFIG: "restore-netplay-config",
  GET_STATUS: "get-status",
  GET_METRICS: "get-metrics",
  VALIDATE_DEPENDENCIES: "validate-dependencies",
  ASSERT_PORT_FREE: "assert-port-free",
  GET_RELAY_CONFIG: "get-relay-config",
  SET_RELAY_CONFIG: "set-relay-config",
  CLEAR_RELAY_CONFIG: "clear-relay-config",
} as const

export const IPC_WHITELIST: ReadonlySet<string> = new Set(Object.values(IPC_CHANNELS))
```

### portUtils.ts
```typescript
import net from "net"

export function isPortInUse(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once("error", (err: any) => {
      resolve(err.code === "EADDRINUSE")
    })
    server.once("listening", () => {
      server.close()
      resolve(false)
    })
    server.listen(port, host)
  })
}

export async function assertPortFree(port: number): Promise<void> {
  const inUse = await isPortInUse(port)
  if (inUse) throw new Error(`Port ${port} is already in use`)
}
```

### relayConfigStore.ts
```typescript
interface RelayConfig {
  url: string
  setAt: number
  setBy: "host" | "manual"
}

// read(): RelayConfig | null
//   → 1. userData/emu_latam_relay.json
//   → 2. fallback relay-server/active_relay.txt
// write(url, setBy): void
//   → escribe JSON en userData + espejo en legacy
// clear(): void
//   → borra ambos archivos
```

## IPC Handlers (en index.ts)

```typescript
ipcMain.handle("assert-port-free", async (_e, { port }: { port: number }) => {
  try {
    await assertPortFree(port)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle("get-relay-config", async () => {
  return relayConfigStore.read()
})

ipcMain.handle("set-relay-config", async (_e, { url, setBy }: { url: string; setBy: string }) => {
  relayConfigStore.write(url, setBy)
  return { success: true }
})

ipcMain.handle("clear-relay-config", async () => {
  relayConfigStore.clear()
  return { success: true }
})
```

## Preload (modificado)

```typescript
import { IPC_WHITELIST } from "./main/services/ipcChannels"

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel: string, data?: any) => {
      if (!IPC_WHITELIST.has(channel)) {
        return Promise.reject(new Error(`IPC channel '${channel}' is not in the whitelist`))
      }
      return ipcRenderer.invoke(channel, data)
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    },
  },
  // ... existing getStatus, getMetrics, etc.
})
```

## Dependencias
- Sin dependencias externas. Todo es React puro + Node.js net + Electron APIs.
