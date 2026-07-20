# Diseño: Sistema de Monitoreo y Diagnóstico

## Arquitectura

```
[Renderer - React]                    [Main Process - Electron]
┌─────────────────────┐              ┌──────────────────────────────────┐
│  StatusContext       │──IPC get──▶  │  resourceMonitor.ts             │
│  (poll cada 2s)      │              │  - getMetrics() → CPU/mem/PIDs  │
│                      │              │                                  │
│  ErrorBanner         │              │  cleanupManager.ts              │
│  (auto-dismiss 5s)   │              │  - register(name, fn)           │
│                      │              │  - cleanupAll() → ejecuta todas │
│  App (consume status)│              │                                  │
│                      │              │  dependencyValidator.ts         │
│                      │◂──IPC──────  │  - validateAll(deps[]) → bool[] │
└─────────────────────┘              │                                  │
                                      │  index.ts (modificado)          │
                                      │  - Nuevos IPC handlers          │
                                      │  - Cleanup integrado            │
                                      │  - Logger helper functions      │
                                      └──────────────────────────────────┘
```

## Módulos

### cleanupManager.ts
```
registerCleanup(name: string, fn: CleanupFn): void
unregisterCleanup(name: string): void
cleanupAll(): Promise<void>          ← ejecuta en orden inverso
getCleanups(): string[]              ← lista nombres registrados
```

**Flujo:**
1. Al crear un proceso (Nakama, Bore, etc.) se registra: `registerCleanup('nakama', () => nakamaProcess?.kill())`
2. En `before-quit` se llama `cleanupAll()` que ejecuta todas en orden inverso
3. Cada función tiene try/catch individual para que una no bloquee las demás

### dependencyValidator.ts
```
validateBinaries(deps: DepItem[]): DepResult[]
validatePort(port: number, host?: string): Promise<boolean>
validateFile(path: string): boolean
```

**DepItem:** `{ name: string; path: string }`
**DepResult:** `{ name: string; path: string; exists: boolean }`

### resourceMonitor.ts
```
getMetrics(processList: MonitoredProcess[]): SystemMetrics
```

**SystemMetrics:**
```typescript
{
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number }
  uptime: number
  processes: { name: string; pid: number | null }[]
}
```

### StatusContext.tsx
```typescript
interface ServiceStatus {
  nakama: 'running' | 'stopped' | 'error'
  bore: 'running' | 'stopped' | 'error'
  retroarch: 'running' | 'stopped' | 'error'
  metrics: SystemMetrics | null
  dependencies: DepResult[]
}
```

Polling automático cada 2000ms vía `electron.getStatus()`.

### ErrorBanner.tsx
```typescript
interface ErrorBannerProps {
  message: string
  type: 'error' | 'warning' | 'info'
  onDismiss: () => void
  autoDismissMs?: number  // default 5000
}
```

## IPC Handlers (nuevos en index.ts)

| Channel | Input | Output | Descripción |
|---------|-------|--------|-------------|
| `get-status` | — | `ServiceStatus` | Estado actual de servicios |
| `get-metrics` | — | `SystemMetrics` | Métricas de recursos |
| `validate-dependencies` | — | `DepResult[]` | Validación de binarios |
| `report-error` | `{ message, type }` | `void` | Envía error al frontend |

## Preload (modificado)

```typescript
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: { ... },  // existente
  getStatus: () => ipcRenderer.invoke('get-status'),
  getMetrics: () => ipcRenderer.invoke('get-metrics'),
  validateDependencies: () => ipcRenderer.invoke('validate-dependencies'),
  onError: (callback) => ipcRenderer.on('report-error', (_, data) => callback(data)),
})
```

## Flujo de integración en index.ts

```
app.whenReady() :── registerCleanup('nakama', ...)
                :── registerCleanup('bore', ...)
                :── registerCleanup('forwarder', ...)
                :── ipcMain.handle('get-status', ...)
                :── ipcMain.handle('get-metrics', ...)
                :── ipcMain.handle('validate-dependencies', ...)

before-quit :── cleanupAll()
           :── (limpia Nakama, Bore, RetroArch, forwarders)
```
