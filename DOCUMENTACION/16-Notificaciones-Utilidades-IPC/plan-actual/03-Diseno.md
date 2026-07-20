# Diseño: Notificaciones, Utilidades Compartidas y Seguridad IPC

## Arquitectura

```
[Renderer - React]                    [Main Process - Electron]
┌─────────────────────────┐          ┌──────────────────────────────┐
│  <ToastProvider>         │          │  ipcChannels.ts              │
│  ┌───────────────────┐   │          │  - IPC_CHANNELS enum         │
│  │ ToastHost (top-right) │         │  - IPC_WHITELIST Set         │
│  │ ┌──┐ ┌──┐ ┌──┐   │   │          │                              │
│  │ │T1│ │T2│ │T3│   │   │          │  portUtils.ts                │
│  │ └──┘ └──┘ └──┘   │   │          │  - isPortInUse(port)         │
│  └───────────────────┘   │          │  - assertPortFree(port)     │
│                          │          │                              │
│  useToast() hook         │──IPC──▶  │  relayConfigStore.ts         │
│  - show(msg, kind)       │          │  - read() / write() / clear()│
│  - dismiss(id)           │          │  - userData + legacy espejo  │
│  - toasts[]              │          │                              │
│                          │          │  index.ts                    │
│  Componentes consumen:   │          │  - usa IPC_CHANNELS enum     │
│  - App.tsx               │          │  - registra cleanups         │
│  - MethodPicker          │          └──────────────────────────────┘
│  - etc.                  │                       ▲
└─────────────────────────┘                       │ whitelist
                                                   │
                                          ┌────────┴──────────┐
                                          │ preload/index.ts   │
                                          │ IPC_WHITELIST check│
                                          └───────────────────┘
```

## Toast System

### ToastContext + useToast
```
Toast { id: string; kind: 'info' | 'success' | 'warning' | 'error'; message: string; durationMs: number }

show(msg, kind='info', durationMs=3000):
  → agregar a cola (FIFO)
  → si > 3 visibles, descartar el más viejo
  → auto-dismiss después de durationMs

dismiss(id):
  → remover de la cola
```

### ToastHost
- Posición: fixed, top-right, z-index: 10000
- Estilo: border neón según kind (verde=success, rojo=error, naranja=warning, azul=info)
- Animación: slide-in desde derecha, fade-out al dismiss
- Máximo 3 toasts visibles

## IPC Channels

### ipcChannels.ts
```typescript
export const IPC_CHANNELS = {
  LAUNCH_GAME: "launch-game",
  START_RELAY_TUNNEL: "start-relay-tunnel",
  START_RELAY_TUNNEL_V2: "start-relay-tunnel-v2",
  KILL_RETROARCH: "kill-retroarch",
  // ... todos los canales existentes
  // + nuevos:
  ASSERT_PORT_FREE: "assert-port-free",
  GET_RELAY_CONFIG: "get-relay-config",
  SET_RELAY_CONFIG: "set-relay-config",
  CLEAR_RELAY_CONFIG: "clear-relay-config",
} as const

export const IPC_WHITELIST: ReadonlySet<string> = new Set(Object.values(IPC_CHANNELS))
```

### Preload whitelist
```typescript
// Antes de invocar, validar canal:
if (!IPC_WHITELIST.has(channel)) {
  throw new Error(`IPC channel '${channel}' not in whitelist`)
}
return ipcRenderer.invoke(channel, data)
```

## Port Utils

### portUtils.ts
```typescript
isPortInUse(port: number, host = "127.0.0.1"): Promise<boolean>
  → net.createServer().listen(port, host)
  → si error EADDRINUSE → true
  → si éxito → close() → false

assertPortFree(port: number): Promise<void>
  → si isPortInUse → throw `Port ${port} is already in use`
```

## relayConfigStore

### relayConfigStore.ts
```typescript
read(): RelayConfig | null
  → 1. intenta userData/emu_latam_relay.json
  → 2. fallback a relay-server/active_relay.txt
  → 3. si ambos faltan → null

write(url: string, setBy: string): void
  → escribe JSON en userData
  → escribe URL plana en legacy (espejo)

clear(): void
  → borra ambos archivos
```

### IPC Handlers (nuevos en index.ts)
```
get-relay-config → relayConfigStore.read()
set-relay-config → relayConfigStore.write(url, setBy)
clear-relay-config → relayConfigStore.clear()
assert-port-free → portUtils.assertPortFree(port)
```
