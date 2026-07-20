# Resultados de Testings - Integracion-Nakama

## Resumen de Ejecución
- **Fecha:** 2026-07-19
- **Pruebas totales:** 24
- **Pruebas pasadas:** 10 (42%)
- **Pruebas parciales:** 11 (46%)
- **Pruebas falladas:** 3 (12%)
- **Estado:** COMPLETADO CON PROBLEMAS (requiere mejoras en logging, cleanup y UI)

## Problemas Encontrados

### Problema 1: Logs de Nakama ignorados
**Prueba afectada:** Verificar que los logs de Nakama se escriben correctamente
**Archivo:** `client/src/main/index.ts`
**Línea:** 170
**Código problemático:**
```typescript
nakamaProcess = spawn(nakamaPath, ["--config", "local.yml"], { cwd: nakamaDir, windowsHide: true, stdio: "ignore" });
```
**Descripción detallada:** El parámetro `stdio: "ignore"` hace que los logs de Nakama no se capturen en ningún lugar. Esto dificulta la depuración cuando Nakama tiene problemas. Los logs de Nakama son críticos para diagnosticar errores de conexión, problemas de PostgreSQL, y otros fallos del servidor.
**Solución propuesta:**
```typescript
// Crear archivo de logs para Nakama
const nakamaLogPath = path.join(nakamaDir, "nakama.log");
const nakamaLogStream = fs.createWriteStream(nakamaLogPath, { flags: 'a' });

nakamaProcess = spawn(nakamaPath, ["--config", "local.yml"], { 
  cwd: nakamaDir, 
  windowsHide: true, 
  stdio: ['ignore', nakamaLogStream, nakamaLogStream] // stdout y stderr al archivo
});

// Cerrar el stream cuando el proceso termine
nakamaProcess.on('close', () => {
  nakamaLogStream.end();
});
```

### Problema 2: Catch vacío al matar proceso Nakama
**Prueba afectada:** Verificar que el proceso de Nakama se mata correctamente (child.kill)
**Archivo:** `client/src/main/index.ts`
**Línea:** 205
**Código problemático:**
```typescript
try { nakamaProcess?.kill(); } catch {}
```
**Descripción detallada:** El bloque catch está vacío, lo que significa que si hay un error al intentar matar el proceso (por ejemplo, si el proceso ya no existe), el error se ignora silenciosamente. Esto puede ocultar problemas de sincronización o race conditions.
**Solución propuesta:**
```typescript
try { 
  if (nakamaProcess) {
    nakamaProcess.kill();
    console.log("[NAKAMA] Proceso matado exitosamente");
  }
} catch (e) {
  console.error("[NAKAMA] Error al matar proceso:", e);
}
```

### Problema 3: No hay cleanup explícito al cerrar aplicación
**Prueba afectada:** Verificar que Nakama se detiene correctamente al cerrar la aplicación
**Archivo:** `client/src/main/index.ts`
**Línea:** No encontrado (falta handler)
**Código problemático:**
```typescript
// No hay app.on('quit') o app.on('before-quit')
```
**Descripción detallada:** No hay un handler explícito para limpiar recursos cuando la aplicación se cierra. Esto puede dejar el proceso de Nakama corriendo después de cerrar la aplicación, causando problemas al reiniciar.
**Solución propuesta:**
```typescript
app.on('before-quit', () => {
  nakamaKilledIntentionally = true;
  if (nakamaProcess) {
    try {
      nakamaProcess.kill();
      console.log("[NAKAMA] Proceso detenido al cerrar aplicación");
    } catch (e) {
      console.error("[NAKAMA] Error al detener proceso:", e);
    }
  }
  if (nakamaHealthTimer) {
    clearInterval(nakamaHealthTimer);
  }
  if (nakamaRestartTimer) {
    clearTimeout(nakamaRestartTimer);
  }
});
```

### Problema 4: No hay validación de puerto ocupado
**Prueba afectada:** Verificar comportamiento cuando el puerto de Nakama está ocupado
**Archivo:** `client/src/main/index.ts`
**Línea:** 158
**Código problemático:**
```typescript
const running = await checkNakamaHealth(cfg.host, cfg.port);
if (running) {
  console.log("Nakama ya está corriendo.");
  nakamaRestartAttempts = 0;
  return;
}
```
**Descripción detallada:** El código verifica si Nakama está corriendo, pero no distingue entre Nakama corriendo correctamente y otro proceso ocupando el puerto. Si otro proceso usa el puerto 7350, Nakama no se iniciará sin un mensaje claro de error.
**Solución propuesta:**
```typescript
const running = await checkNakamaHealth(cfg.host, cfg.port);
if (running) {
  // Verificar si es realmente Nakama o otro proceso
  try {
    const response = await fetch(`http://${cfg.host}:${cfg.port}/`);
    const text = await response.text();
    if (text.includes("Nakama")) {
      console.log("Nakama ya está corriendo.");
      nakamaRestartAttempts = 0;
      return;
    } else {
      console.error(`Puerto ${cfg.port} ocupado por otro proceso (no Nakama)`);
      return;
    }
  } catch (e) {
    console.error("Error verificando puerto:", e);
    return;
  }
}
```

### Problema 5: No hay manejo de errores de PostgreSQL
**Prueba afectada:** Verificar comportamiento cuando PostgreSQL no está disponible
**Archivo:** `client/src/main/index.ts`
**Línea:** No encontrado (falta validación)
**Código problemático:**
```typescript
// No hay validación de conexión a PostgreSQL
```
**Descripción detallada:** Nakama requiere PostgreSQL para funcionar, pero el código no valida que PostgreSQL esté disponible antes de iniciar Nakama. Si PostgreSQL no está corriendo, Nakama fallará silenciosamente o con logs no capturados.
**Solución propuesta:**
```typescript
async function checkPostgreSQL(): Promise<boolean> {
  const pgPort = 5432;
  return await waitForPort(pgPort, 3000);
}

async function launchNakama(): Promise<void> {
  const cfg = getNakamaConfig();
  if (cfg.host !== "127.0.0.1" && cfg.host !== "localhost") {
    console.log(`Nakama remoto configurado: ${cfg.host}:${cfg.port}. No se inicia localmente.`);
    return;
  }
  
  // Verificar PostgreSQL antes de iniciar Nakama
  const pgRunning = await checkPostgreSQL();
  if (!pgRunning) {
    console.error("PostgreSQL no está disponible. Nakama no puede iniciarse.");
    return;
  }
  
  // ... resto del código de launchNakama
}
```

### Problema 6: No hay logging a archivo main_process.log
**Prueba afectada:** Verificar que los errores se registran en main_process.log
**Archivo:** `client/src/main/index.ts`
**Línea:** No encontrado (falta logging a archivo)
**Código problemático:**
```typescript
console.error("Error al iniciar Nakama:", err); // Solo a consola
```
**Descripción detallada:** Los errores solo se muestran en la consola del main process, que no es fácilmente accesible para el usuario. No hay logging persistente a archivo para auditoría y depuración.
**Solución propuesta:**
```typescript
const LOG_DIR = path.join(getProjectRoot(), "Logs");
const MAIN_LOG_PATH = path.join(LOG_DIR, "main_process.log");

function logToMainProcess(message: string, level: 'INFO' | 'ERROR' | 'WARN'): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  fs.appendFileSync(MAIN_LOG_PATH, logEntry);
  console.log(logEntry.trim());
}

// Uso:
logToMainProcess("Nakama iniciado", "INFO");
logToMainProcess("Error al iniciar Nakama: " + err.message, "ERROR");
```

### Problema 7: No se encontró código de polling en React
**Prueba afectada:** Verificar que el estado de Nakama se actualiza en la UI de React
**Archivo:** `client/src/App.tsx` (no encontrado)
**Código problemático:**
```typescript
// No se encontró useEffect para polling de estado Nakama
```
**Descripción detallada:** Aunque el handler IPC `check-nakama-health` existe, no se encontró código en React que haga polling periódico del estado de Nakama para actualizar la UI. El usuario no verá el estado actual de Nakama.
**Solución propuesta:**
```typescript
// En App.tsx
const [nakamaStatus, setNakamaStatus] = useState<'checking' | 'ready' | 'error'>('checking');

useEffect(() => {
  const checkNakama = async () => {
    try {
      const isHealthy = await window.electron.checkNakamaHealth();
      setNakamaStatus(isHealthy ? 'ready' : 'error');
    } catch (e) {
      setNakamaStatus('error');
    }
  };
  
  checkNakama();
  const interval = setInterval(checkNakama, 2000); // Polling cada 2s
  
  return () => clearInterval(interval);
}, []);
```

### Problema 8: No se encontró código de habilitación de botón
**Prueba afectada:** Verificar que el botón "INSERT COIN" se habilita solo cuando Nakama está listo
**Archivo:** `client/src/App.tsx` (no encontrado)
**Código problemático:**
```typescript
// No se encontró lógica para deshabilitar botón basado en estado Nakama
```
**Descripción detallada:** El botón "INSERT COIN" debería estar deshabilitado hasta que Nakama esté listo, pero no se encontró código que implemente esta lógica. Esto puede causar que el usuario intente conectarse antes de que Nakama esté listo.
**Solución propuesta:**
```typescript
// En App.tsx
const isNakamaReady = nakamaStatus === 'ready';

<button 
  disabled={!isNakamaReady}
  onClick={handleInsertCoin}
  className={isNakamaReady ? 'enabled' : 'disabled'}
>
  INSERT COIN
</button>
```

### Problema 9: No hay UI de error cuando Nakama falla
**Prueba afectada:** Verificar que la UI muestra estado de error cuando Nakama falla
**Archivo:** `client/src/App.tsx` (no encontrado)
**Código problemático:**
```typescript
// No se encontró componente de error para estado Nakama
```
**Descripción detallada:** Cuando Nakama falla o no está disponible, no hay indicación visual en la UI. El usuario no sabrá por qué no puede conectarse.
**Solución propuesta:**
```typescript
// En App.tsx
{nakamaStatus === 'error' && (
  <div className="error-banner">
    ⚠️ Nakama no está disponible. Verifica que el servidor esté corriendo.
  </div>
)}

{nakamaStatus === 'checking' && (
  <div className="loading-banner">
    🔍 Verificando estado de Nakama...
  </div>
)}
```

### Problema 10: No hay medición de tiempo de inicio
**Prueba afectada:** Verificar tiempo de inicio de Nakama (< 5 segundos)
**Archivo:** `client/src/main/index.ts`
**Línea:** 170
**Código problemático:**
```typescript
console.log("Lanzando Nakama (modo oculto)...");
nakamaProcess = spawn(nakamaPath, ["--config", "local.yml"], { cwd: nakamaDir, windowsHide: true, stdio: "ignore" });
```
**Descripción detallada:** No hay medición del tiempo que tarda Nakama en iniciarse. Esto dificulta detectar problemas de rendimiento o regresiones en el tiempo de inicio.
**Solución propuesta:**
```typescript
console.log("Lanzando Nakama (modo oculto)...");
const startTime = Date.now();
nakamaProcess = spawn(nakamaPath, ["--config", "local.yml"], { cwd: nakamaDir, windowsHide: true, stdio: "ignore" });

nakamaProcess.on('spawn', () => {
  const spawnTime = Date.now() - startTime;
  console.log(`Nakama spawn completado en ${spawnTime}ms`);
});

// Medir tiempo hasta que responde al health check
setTimeout(async () => {
  const healthStartTime = Date.now();
  const healthy = await checkNakamaHealth(cfg.host, cfg.port);
  const healthTime = Date.now() - healthStartTime;
  console.log(`Nakama health check pasó en ${healthTime}ms`);
}, 1000);
```

### Problema 11: No hay monitoreo de memoria
**Prueba afectada:** Verificar uso de memoria de Nakama en modo headless
**Archivo:** `client/src/main/index.ts`
**Línea:** No encontrado (falta monitoreo)
**Código problemático:**
```typescript
// No hay monitoreo de memoria
```
**Descripción detallada:** No hay monitoreo del uso de memoria de Nakama. Esto dificulta detectar memory leaks o problemas de rendimiento a largo plazo.
**Solución propuesta:**
```typescript
function startNakamaMemoryMonitor(): void {
  setInterval(() => {
    if (nakamaProcess && nakamaProcess.pid) {
      try {
        // En Windows, usar tasklist para obtener memoria
        const { exec } = require('child_process');
        exec(`tasklist /FI "PID eq ${nakamaProcess.pid}" /FO CSV`, (error, stdout) => {
          if (!error) {
            const lines = stdout.split('\n');
            if (lines.length > 1) {
              const parts = lines[1].split(',');
              const memory = parts[4].replace(/"/g, '').replace(' K', '');
              console.log(`[NAKAMA] Memoria: ${memory} KB`);
            }
          }
        });
      } catch (e) {
        console.error("Error monitoreando memoria:", e);
      }
    }
  }, 30000); // Cada 30 segundos
}
```

## Problemas Adicionales (Menores)

### Problema 12: Configuración de Nakama no validada
**Prueba afectada:** Verificar que Nakama se conecta a PostgreSQL correctamente
**Archivo:** `client/src/main/index.ts`
**Línea:** 119-126
**Código problemático:**
```typescript
function getNakamaConfig(): { host: string; port: string } {
  try {
    if (fs.existsSync(NAKAMA_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(NAKAMA_CONFIG_PATH, "utf8"));
    }
  } catch {}
  return { host: "127.0.0.1", port: "7350" };
}
```
**Descripción detallada:** La función no valida que el JSON tenga la estructura correcta. Si el archivo está corrupto, puede causar errores inesperados.
**Solución propuesta:**
```typescript
interface NakamaConfig {
  host: string;
  port: string;
}

function getNakamaConfig(): NakamaConfig {
  try {
    if (fs.existsSync(NAKAMA_CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(NAKAMA_CONFIG_PATH, "utf8"));
      if (config.host && config.port) {
        return config;
      }
      console.warn("Config Nakama inválida, usando defaults");
    }
  } catch (e) {
    console.error("Error leyendo config Nakama:", e);
  }
  return { host: "127.0.0.1", port: "7350" };
}
```

## Recomendaciones Generales

1. **Implementar logging persistente:** Todos los errores y eventos importantes deben escribirse a archivo.
2. **Capturar logs de Nakama:** Cambiar `stdio: "ignore"` a logging a archivo.
3. **Agregar cleanup en app.quit:** Asegurar que todos los procesos se detengan al cerrar.
4. **Implementar polling en React:** Agregar UI que muestre el estado de Nakama en tiempo real.
5. **Validar dependencias:** Verificar PostgreSQL antes de iniciar Nakama.
6. **Agregar monitoreo:** Implementar métricas de tiempo de inicio y uso de memoria.
7. **Mejorar manejo de errores:** Eliminar catch vacíos y agregar logging de errores.
8. **Validar configuración:** Verificar que el JSON de configuración tenga la estructura correcta.

## Archivos Afectados

- `client/src/main/index.ts` (8 problemas)
- `client/src/App.tsx` (3 problemas, código no encontrado)
- `backend/local.yml` (1 problema, configuración PostgreSQL)

## Prioridad de Corrección

1. **Alta:** Problemas 1, 3, 6 (logs, cleanup, logging persistente)
2. **Media:** Problemas 2, 5, 7, 8, 9 (catch vacío, PostgreSQL, polling React, UI)
3. **Baja:** Problemas 4, 10, 11, 12 (puerto ocupado, métricas, validación config)
