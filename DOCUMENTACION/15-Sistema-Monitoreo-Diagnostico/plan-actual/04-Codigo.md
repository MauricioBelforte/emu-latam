# Código: Sistema de Monitoreo y Diagnóstico

## Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `client/src/main/cleanupManager.ts` | Registro centralizado de funciones de limpieza |
| `client/src/main/dependencyValidator.ts` | Validación de binarios, puertos y archivos |
| `client/src/main/resourceMonitor.ts` | Monitoreo de memoria, uptime y PIDs activos |
| `client/src/main/logger.ts` | Funciones helper de logging con niveles |
| `client/src/context/StatusContext.tsx` | Contexto React con polling de estado |
| `client/src/components/ErrorBanner.tsx` | Banner de errores con auto-dismiss |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/main/index.ts` | Agregar IPC handlers, integrar cleanupManager, resourceMonitor, logger |
| `client/src/preload/index.ts` | Exponer nuevos canales IPC |

## Funciones clave

### cleanupManager.ts
```typescript
type CleanupFn = () => void | Promise<void>
const cleanups: Map<string, CleanupFn> = new Map()

export function registerCleanup(name: string, fn: CleanupFn): void { ... }
export function unregisterCleanup(name: string): void { ... }
export async function cleanupAll(): Promise<void> { ... }  // orden inverso
export function getRegisteredCleanups(): string[] { ... }
```

### dependencyValidator.ts
```typescript
export interface DepItem { name: string; path: string }
export interface DepResult { name: string; path: string; exists: boolean }

export function validateBinaries(deps: DepItem[]): DepResult[] { ... }
export function validateFile(path: string): boolean { ... }
```

### resourceMonitor.ts
```typescript
export interface MonitoredProcess { name: string; proc: { pid?: number } | null }
export interface SystemMetrics {
  memory: { heapUsed: number; heapTotal: number; rss: number; external: number }
  uptime: number
  processes: { name: string; pid: number | null }[]
}

export function getMetrics(processList: MonitoredProcess[]): SystemMetrics { ... }
```

### logger.ts
```typescript
export function logInfo(module: string, msg: string, ...args: any[]): void { ... }
export function logWarn(module: string, msg: string, ...args: any[]): void { ... }
export function logError(module: string, msg: string, ...args: any[]): void { ... }
export function logDebug(module: string, msg: string, ...args: any[]): void { ... }
```
Formato: `[INFO] [Module] mensaje`

### StatusContext.tsx
```typescript
interface ServiceStatus {
  nakama: 'running' | 'stopped' | 'error'
  bore: 'running' | 'stopped' | 'error'
  retroarch: 'running' | 'stopped' | 'error'
  metrics: SystemMetrics | null
  dependencies: DepResult[]
}

const StatusContext = createContext<ServiceStatus | null>(null)
// Poll cada 2s: electron.getStatus()
// Se provee en App.tsx
```

### ErrorBanner.tsx
```typescript
interface Props {
  message: string
  type?: 'error' | 'warning' | 'info'
  onDismiss: () => void
  autoDismissMs?: number
}
// Render: barra color según type, botón X, auto-dismiss con setTimeout
```

## Logging

Formato de logs emitidos por logger.ts:
```
[INFO] [Cleanup] Limpieza completada: 3 procesos terminados
[WARN] [Validator] Bore.exe no encontrado en backend/bore.exe
[ERROR] [Nakama] Puerto 7350 ocupado después de 3 intentos
[DEBUG] [Monitor] heapUsed: 45MB, procesos activos: 2
```

Los logs se escriben al mismo archivo `logs/main_process.log` mediante la intercepción de console.log/error existente en index.ts.

## Tests asociados

Ver 06-Plan-Testings.md para el plan completo de testing.
