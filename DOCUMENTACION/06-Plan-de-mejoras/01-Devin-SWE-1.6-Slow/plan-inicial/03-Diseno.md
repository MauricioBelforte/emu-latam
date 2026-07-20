# Diseño - Devin SWE-1.6 Slow: Sistema de Logging y Monitoreo

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │     Logger       │  │ ResourceMonitor  │                 │
│  │  (logger.ts)     │  │(resourceMonitor  │                 │
│  │                  │  │      .ts)        │                 │
│  │ - info()         │  │ - start()        │                 │
│  │ - warn()         │  │ - getMetrics()   │                 │
│  │ - error()        │  │ - stop()         │                 │
│  │ - debug()        │  │                  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│           │                      │                            │
│           ▼                      ▼                            │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │DependencyValidator│  │  CleanupManager  │                 │
│  │(dependencyValidator│  │ (cleanupManager  │                 │
│  │      .ts)        │  │      .ts)        │                 │
│  │ - validate()     │  │ - register()     │                 │
│  │ - checkPostgreSQL│  │ - cleanupAll()   │                 │
│  │ - checkPort()    │  │                  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Child Processes (Nakama, Bore, RA)      │   │
│  │  - stdout → Logger                                   │   │
│  │  - stderr → Logger                                   │   │
│  │  - error → Logger                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │ IPC
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Electron Renderer (React)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  StatusContext  │  │  ErrorBanner    │                 │
│  │  (context.tsx)   │  │  (component)    │                 │
│  │                  │  │                  │                 │
│  │ - nakamaStatus   │  │ - show errors   │                 │
│  │ - boreStatus     │  │ - auto-dismiss  │                 │
│  │ - raStatus       │  │                  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  LoadingSpinner  │  │ MetricsDisplay  │                 │
│  │  (component)    │  │  (component)    │                 │
│  │                  │  │                  │                 │
│  │ - show while     │  │ - memory usage  │                 │
│  │   loading        │  │ - CPU usage     │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. Logger (client/src/main/logger.ts)

```typescript
interface LogLevel {
  INFO: 'INFO';
  WARN: 'WARN';
  ERROR: 'ERROR';
  DEBUG: 'DEBUG';
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  error?: Error;
}

class Logger {
  private logFile: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;
  
  constructor(logDir: string, moduleName: string);
  
  info(message: string, error?: Error): void;
  warn(message: string, error?: Error): void;
  error(message: string, error?: Error): void;
  debug(message: string, error?: Error): void;
  
  private writeLog(entry: LogEntry): Promise<void>;
  private rotateLogFile(): void;
  private formatLog(entry: LogEntry): string;
}
```

**Responsabilidades:**
- Escribir logs a consola y archivo
- Rotar archivos por tamaño
- Formatear logs con timestamp y nivel
- Manejar errores de escritura asíncronamente

### 2. ResourceMonitor (client/src/main/resourceMonitor.ts)

```typescript
interface ResourceMetrics {
  memory: {
    rss: number;        // Resident Set Size
    heapTotal: number;  // Total heap size
    heapUsed: number;   // Used heap size
    external: number;   // External memory
  };
  cpu: {
    user: number;       // User CPU time
    system: number;     // System CPU time
  };
  uptime: number;       // Process uptime in seconds
}

class ResourceMonitor {
  private metrics: ResourceMetrics;
  private interval: number = 5000; // 5s
  
  start(): void;
  stop(): void;
  getMetrics(): ResourceMetrics;
  getProcessMetrics(pid: number): Promise<ResourceMetrics>;
  
  private updateMetrics(): void;
}
```

**Responsabilidades:**
- Monitorear uso de memoria del main process
- Monitorear uso de CPU
- Monitorear uptime
- Exponer métricas vía IPC

### 3. DependencyValidator (client/src/main/dependencyValidator.ts)

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

class DependencyValidator {
  validatePostgreSQL(host: string, port: number): Promise<ValidationResult>;
  validatePort(port: number): Promise<ValidationResult>;
  validateFile(path: string): ValidationResult;
  validateAll(dependencies: Dependency[]): Promise<ValidationResult>;
  
  private checkPostgreSQLConnection(host: string, port: number): Promise<boolean>;
  private checkPortAvailable(port: number): Promise<boolean>;
}
```

**Responsabilidades:**
- Verificar conexión a PostgreSQL
- Verificar puertos no estén ocupados
- Verificar archivos necesarios existan
- Retornar errores específicos con contexto

### 4. CleanupManager (client/src/main/cleanupManager.ts)

```typescript
type CleanupFunction = () => Promise<void>;

class CleanupManager {
  private cleanupFunctions: CleanupFunction[] = [];
  
  register(fn: CleanupFunction): void;
  async cleanupAll(): Promise<void>;
  async cleanupNakama(): Promise<void>;
  async cleanupBore(): Promise<void>;
  async cleanupRetroArch(): Promise<void>;
}
```

**Responsabilidades:**
- Registrar funciones de cleanup
- Ejecutar cleanup al cerrar app
- Limpiar child processes
- Limpiar servidores TCP
- Limpiar file streams

### 5. StatusContext (client/src/context/StatusContext.tsx)

```typescript
interface ServiceStatus {
  name: string;
  status: 'starting' | 'ready' | 'error' | 'stopped';
  message?: string;
  lastUpdate: number;
}

interface StatusContextType {
  nakama: ServiceStatus;
  bore: ServiceStatus;
  retroarch: ServiceStatus;
  refreshStatus(): Promise<void>;
}

const StatusContext = createContext<StatusContextType>(null);
```

**Responsabilidades:**
- Mantener estado de servicios
- Hacer polling de estado vía IPC
- Exponer estado a componentes React
- Manejar errores de polling

### 6. ErrorBanner (client/src/components/ErrorBanner.tsx)

```typescript
interface ErrorBannerProps {
  errors: Error[];
  onDismiss: (index: number) => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ errors, onDismiss, autoDismiss, autoDismissDelay }) => {
  // Muestra errores con botón de dismiss
  // Auto-dismiss después de delay si está habilitado
};
```

**Responsabilidades:**
- Mostrar errores visuales
- Permitir dismiss manual
- Auto-dismiss opcional
- Agrupar errores similares

### 7. LoadingSpinner (client/src/components/LoadingSpinner.tsx)

```typescript
interface LoadingSpinnerProps {
  loading: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ loading, message, size }) => {
  // Muestra spinner animado cuando loading=true
  // Muestra mensaje opcional
};
```

**Responsabilidades:**
- Mostrar spinner durante operaciones asíncronas
- Mostrar mensaje de progreso
- Tamaño configurable

## Flujos de Datos

### Flujo de Logging
```
Child Process stdout/stderr
    ↓
Logger.info/warn/error/debug()
    ↓
FormatLog (timestamp + nivel + mensaje)
    ↓
WriteLog (async)
    ↓
Archivo de log (rotación por tamaño)
```

### Flujo de Monitoreo
```
ResourceMonitor.start()
    ↓
setInterval (5s)
    ↓
updateMetrics() (process.memoryUsage, process.cpuUsage)
    ↓
IPC Handler (get-metrics)
    ↓
React Context (MetricsDisplay)
```

### Flujo de Validación
```
DependencyValidator.validateAll()
    ↓
validatePostgreSQL() + validatePort() + validateFile()
    ↓
ValidationResult (valid + errors)
    ↓
UI muestra errores si !valid
    ↓
Usuario corrige o cancela
```

### Flujo de Cleanup
```
app.on('before-quit')
    ↓
CleanupManager.cleanupAll()
    ↓
Ejecutar todas las funciones registradas
    ↓
Esperar cleanup completado
    ↓
app.quit()
```

## IPC Handlers

### Main Process → Renderer
- `get-status`: Retorna estado de todos los servicios
- `get-metrics`: Retorna métricas de recursos
- `get-logs`: Retorna logs recientes (opcionalmente filtrados)

### Renderer → Main Process
- `refresh-status`: Solicita actualización de estado
- `validate-dependencies`: Solicita validación de dependencias

## Configuración

### Configuración de Logger
```typescript
const loggerConfig = {
  logDir: 'Logs',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  logLevel: 'INFO', // DEBUG, INFO, WARN, ERROR
  enableConsole: true,
  enableFile: true,
};
```

### Configuración de ResourceMonitor
```typescript
const resourceMonitorConfig = {
  interval: 5000, // 5s
  enableMemory: true,
  enableCPU: true,
  enableUptime: true,
};
```

### Configuración de StatusContext
```typescript
const statusContextConfig = {
  pollingInterval: 2000, // 2s
  autoRefresh:true,
  maxErrors: 10,
};
```

## Consideraciones de Seguridad

1. **Sanitización de logs:** No loggear información sensible (passwords, tokens)
2. **Permisos de archivos:** Logs deben ser legibles solo por el usuario
3. **IPC validation:** Validar todos los mensajes IPC
4. **Rate limiting:** Limitar frecuencia de polling para evitar DoS

## Consideraciones de Performance

1. **Logging asíncrono:** Escribir logs en background para no bloquear
2. **Buffer de escritura:** Acumular logs y escribir en batches
3. **Debouncing de polling:** No hacer polling excesivo
4. **Memoización en React:** Evitar re-renders innecesarios
