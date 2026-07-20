# Código - Devin SWE-1.6 Slow: Sistema de Logging y Monitoreo

## Archivos Involucrados

### Archivos Nuevos a Crear

1. **client/src/main/logger.ts**
   - Módulo central de logging
   - Funciones: info(), warn(), error(), debug()
   - Rotación de archivos por tamaño
   - Escritura asíncrona a archivo

2. **client/src/main/resourceMonitor.ts**
   - Monitoreo de recursos (memoria, CPU)
   - Intervalo configurable (default 5s)
   - Exposición de métricas vía IPC

3. **client/src/main/dependencyValidator.ts**
   - Validación de dependencias
   - Verificación de PostgreSQL
   - Verificación de puertos ocupados
   - Verificación de archivos

4. **client/src/main/cleanupManager.ts**
   - Registro de funciones de cleanup
   - Ejecución de cleanup al cerrar app
   - Cleanup específico por servicio

5. **client/src/context/StatusContext.tsx**
   - Contexto de React para estado de servicios
   - Polling de estado vía IPC
   - Exposición de estado a componentes

6. **client/src/components/ErrorBanner.tsx**
   - Componente de banner de errores
   - Auto-dismiss configurable
   - Agrupación de errores

7. **client/src/components/LoadingSpinner.tsx**
   - Componente de spinner de carga
   - Tamaño configurable
   - Mensaje opcional

### Archivos a Modificar

8. **client/src/main/index.ts**
   - Integrar Logger en lugar de console.log/console.error
   - Modificar spawn de Nakama para capturar logs
   - Agregar handlers de cleanup en app.on('before-quit')
   - Agregar IPC handlers para métricas y estado
   - Integrar DependencyValidator antes de iniciar servicios

9. **client/src/preload/index.ts**
   - Exponer funciones IPC para estado y métricas
   - Exponer funciones para validación de dependencias

10. **client/src/App.tsx**
    - Integrar StatusContext
    - Agregar ErrorBanner
    - Agregar LoadingSpinner
    - Deshabilitar botones basado en estado

## Funciones Clave

### Logger (client/src/main/logger.ts)

```typescript
class Logger {
  constructor(logDir: string, moduleName: string)
  
  // Niveles de log
  info(message: string, error?: Error): void
  warn(message: string, error?: Error): void
  error(message: string, error?: Error): void
  debug(message: string, error?: Error): void
  
  // Funciones internas
  private writeLog(entry: LogEntry): Promise<void>
  private rotateLogFile(): void
  private formatLog(entry: LogEntry): string
}
```

**Uso:**
```typescript
const logger = new Logger('Logs', 'Nakama');
logger.info('Nakama iniciado');
logger.error('Error al conectar a PostgreSQL', error);
```

### ResourceMonitor (client/src/main/resourceMonitor.ts)

```typescript
class ResourceMonitor {
  start(): void
  stop(): void
  getMetrics(): ResourceMetrics
  getProcessMetrics(pid: number): Promise<ResourceMetrics>
}
```

**Uso:**
```typescript
const monitor = new ResourceMonitor();
monitor.start();
const metrics = monitor.getMetrics();
console.log(`Memory: ${metrics.memory.heapUsed}MB`);
```

### DependencyValidator (client/src/main/dependencyValidator.ts)

```typescript
class DependencyValidator {
  validatePostgreSQL(host: string, port: number): Promise<ValidationResult>
  validatePort(port: number): Promise<ValidationResult>
  validateFile(path: string): ValidationResult
  validateAll(dependencies: Dependency[]): Promise<ValidationResult>
}
```

**Uso:**
```typescript
const validator = new DependencyValidator();
const result = await validator.validatePostgreSQL('127.0.0.1', 5432);
if (!result.valid) {
  console.error('PostgreSQL no disponible:', result.errors);
}
```

### CleanupManager (client/src/main/cleanupManager.ts)

```typescript
class CleanupManager {
  register(fn: CleanupFunction): void
  async cleanupAll(): Promise<void>
  async cleanupNakama(): Promise<void>
  async cleanupBore(): Promise<void>
  async cleanupRetroArch(): Promise<void>
}
```

**Uso:**
```typescript
const cleanup = new CleanupManager();
cleanup.register(() => nakamaProcess?.kill());
cleanup.register(() => boreProcess?.kill());
await cleanup.cleanupAll();
```

## Logs Relacionados

### Logs del Sistema
- **Logs/main_process.log:** Logs del main process de Electron
- **Logs/nakama.log:** Logs específicos de Nakama
- **Logs/bore.log:** Logs específicos de Bore
- **Logs/retroarch.log:** Logs específicos de RetroArch

### Formato de Logs
```
[2026-07-20T03:10:00.000Z] [INFO] [Nakama] Nakama iniciado (PID: 12345)
[2026-07-20T03:10:05.000Z] [ERROR] [Nakama] Error al conectar a PostgreSQL: connection refused
[2026-07-20T03:10:10.000Z] [WARN] [Bore] Túnel establecido con alta latencia (150ms)
```

## IPC Handlers

### Main Process → Renderer

```typescript
// Handler para obtener estado de servicios
ipcMain.handle('get-status', async () => {
  return {
    nakama: nakamaStatus,
    bore: boreStatus,
    retroarch: retroarchStatus,
  };
});

// Handler para obtener métricas de recursos
ipcMain.handle('get-metrics', async () => {
  return resourceMonitor.getMetrics();
});

// Handler para validar dependencias
ipcMain.handle('validate-dependencies', async () => {
  return await dependencyValidator.validateAll(dependencies);
});
```

### Renderer → Main Process

```typescript
// En preload/index.ts
contextBridge.exposeInMainWorld('electron', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  getMetrics: () => ipcRenderer.invoke('get-metrics'),
  validateDependencies: () => ipcRenderer.invoke('validate-dependencies'),
});
```

## Integración con Módulos Existentes

### Módulo 02-Integracion-Nakama

**Cambios:**
```typescript
// Antes
nakamaProcess = spawn(nakamaPath, ["--config", "local.yml"], { 
  cwd: nakamaDir, 
  windowsHide: true, 
  stdio: "ignore" 
});

// Después
const nakamaLogger = new Logger('Logs', 'Nakama');
nakamaProcess = spawn(nakamaPath, ["--config", "local.yml"], { 
  cwd: nakamaDir, 
  windowsHide: true, 
  stdio: ['ignore', 'pipe', 'pipe'] 
});

nakamaProcess.stdout?.on('data', (data) => {
  nakamaLogger.info(data.toString());
});

nakamaProcess.stderr?.on('data', (data) => {
  nakamaLogger.error(data.toString());
});
```

### Módulo 03-Integracion-Bore

**Cambios:**
```typescript
// Agregar monitoreo de recursos de Bore
const boreMonitor = new ResourceMonitor();
boreMonitor.start();

// Capturar logs de Bore
const boreLogger = new Logger('Logs', 'Bore');
boreProcess.stdout?.on('data', (data) => {
  boreLogger.info(data.toString());
});
```

### Módulo 04-Anti-Lag-RunAhead

**Cambios:**
```typescript
// Validar que config se aplicó correctamente
const validator = new DependencyValidator();
const cfgResult = validator.validateFile('retroarch/netplay_optimized.cfg');
if (!cfgResult.valid) {
  logger.error('Config de RetroArch no válida');
}
```

### Módulo 05-MITM-to-Transparent-Relay

**Cambios:**
```typescript
// Monitorear throughput del forwarder
const relayLogger = new Logger('Logs', 'Relay');
relayLogger.info(`Forwarder iniciado en puerto ${relayPort}`);
```

## Cleanup en app.quit

```typescript
app.on('before-quit', async () => {
  logger.info('Iniciando cleanup al cerrar aplicación');
  
  await cleanupManager.cleanupAll();
  
  resourceMonitor.stop();
  
  logger.info('Cleanup completado');
});
```

## Configuración

### Configuración Global (client/src/main/config.ts)

```typescript
export const loggingConfig = {
  logDir: 'Logs',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  logLevel: 'INFO',
  enableConsole: true,
  enableFile: true,
};

export const monitoringConfig = {
  interval: 5000, // 5s
  enableMemory: true,
  enableCPU: true,
  enableUptime: true,
};

export const uiConfig = {
  pollingInterval: 2000, // 2s
  autoRefresh: true,
  maxErrors: 10,
  autoDismissDelay: 5000, // 5s
};
```
