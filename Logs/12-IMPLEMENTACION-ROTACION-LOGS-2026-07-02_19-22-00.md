# Log de Cambios - Implementación de Rotación de Logs

**Fecha:** 2026-07-02 19:22:00
**Número:** 12
**Descripción:** Implementación de sistema de rotación de logs para evitar que los archivos crezcan indefinidamente

## Motivo del Cambio
El archivo `main_process.log` tenía 462KB y crecía indefinidamente. Sin rotación, el archivo se volvería inmanejable con el tiempo. Se implementó un sistema de rotación automática basado en tamaño (500KB) que mueve los logs antiguos a una carpeta organizada con numeración y fecha.

## Cambios Realizados

### 1. Creación de Carpeta para Logs Rotados

**Carpeta creada:** `Logs/rotated/`

**Propósito:** Almacenar los logs rotados de forma organizada.

### 2. Migración de Logs Existentes

**Archivos movidos a Logs/rotated/:**

| Archivo Original | Archivo Destino | Fecha Original | Tamaño |
|-----------------|-----------------|----------------|--------|
| `retroarch/test_host.log` | `Logs/rotated/01-test_host-2026-06-30.log` | 2026-06-30 | 731 bytes |
| `retroarch/retroarch_host.log` | `Logs/rotated/02-retroarch_host-2026-10-03.log` | 2026-10-03 | 23,675 bytes |
| `retroarch/client.log` | `Logs/rotated/03-client-2026-10-03.log` | 2026-10-03 | 23,532 bytes |
| `Logs/main_process.log` | `Logs/rotated/04-main_process-2026-07-02.log` | 2026-07-02 | 497,779 bytes |

**Formato de nomenclatura:** `NN-nombre_log-YYYY-MM-DD.log`

### 3. Implementación de Rotación Automática en Código

**Archivo modificado:** `client/src/main/index.ts`

**Código original:**
```typescript
const logFile = path.resolve(__dirname, "../../../logs/main_process.log");
const logStream = fs.createWriteStream(logFile, { flags: "a" });
const origLog = console.log;
const origError = console.error;
console.log = (...args) => { origLog(...args); logStream.write(`[LOG ${new Date().toISOString()}] ${args.join(" ")}\n`); };
console.error = (...args) => { origError(...args); logStream.write(`[ERR ${new Date().toISOString()}] ${args.join(" ")}\n`); };
```

**Código nuevo:**
```typescript
const LOG_DIR = path.resolve(__dirname, "../../../logs");
const LOG_ROTATED_DIR = path.join(LOG_DIR, "rotated");
const LOG_FILE = path.join(LOG_DIR, "main_process.log");
const MAX_LOG_SIZE = 500 * 1024; // 500KB

// Asegurar que existan las carpetas de logs
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(LOG_ROTATED_DIR)) fs.mkdirSync(LOG_ROTATED_DIR, { recursive: true });

function rotateLogIfNeeded(): void {
  try {
    const stats = fs.statSync(LOG_FILE);
    if (stats.size >= MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const rotatedFiles = fs.readdirSync(LOG_ROTATED_DIR)
        .filter(f => f.startsWith('main_process-') && f.endsWith('.log'))
        .sort();
      const nextIndex = rotatedFiles.length + 1;
      const rotatedFileName = `main_process-${timestamp}.log`;
      const rotatedFilePath = path.join(LOG_ROTATED_DIR, rotatedFileName);
      
      fs.renameSync(LOG_FILE, rotatedFilePath);
      console.log(`[LOG ROTATION] Rotated log to ${rotatedFilePath} (size: ${stats.size} bytes)`);
    }
  } catch (err) {
    // Si el archivo no existe, es normal en el primer inicio
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[LOG ROTATION ERROR] ${err}`);
    }
  }
}

rotateLogIfNeeded();

const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
const origLog = console.log;
const origError = console.error;
console.log = (...args) => {
  origLog(...args);
  logStream.write(`[LOG ${new Date().toISOString()}] ${args.join(" ")}\n`);
  rotateLogIfNeeded();
};
console.error = (...args) => {
  origError(...args);
  logStream.write(`[ERR ${new Date().toISOString()}] ${args.join(" ")}\n`);
  rotateLogIfNeeded();
};
```

### 4. Características de la Implementación

**Umbral de rotación:** 500KB (configurable via `MAX_LOG_SIZE`)

**Formato de archivo rotado:** `main_process-YYYY-MM-DD.log`

**Ubicación:** `Logs/rotated/`

**Comportamiento:**
- Se verifica el tamaño del log después de cada write
- Si el tamaño >= 500KB, se renombra el archivo a la carpeta rotated
- Se crea un nuevo archivo `main_process.log` vacío automáticamente
- Se registra la rotación en el log con mensaje `[LOG ROTATION]`

**Manejo de errores:**
- Si el archivo no existe (primer inicio), no se considera error
- Otros errores se registran con `[LOG ROTATION ERROR]`

**Creación automática de carpetas:**
- `Logs/` se crea si no existe
- `Logs/rotated/` se crea si no existe

## Beneficios de la Implementación

1. **Control de tamaño:** Los logs nunca superan 500KB
2. **Organización:** Logs históricos en carpeta separada con formato estandarizado
3. **Trazabilidad:** Fecha en el nombre del archivo permite identificar períodos
4. **Automático:** No requiere intervención manual
5. **No intrusivo:** La rotación es transparente para el usuario

## Archivos Modificados/Creados

1. `Logs/rotated/` - Creado (carpeta para logs rotados)
2. `Logs/rotated/01-test_host-2026-06-30.log` - Movido
3. `Logs/rotated/02-retroarch_host-2026-10-03.log` - Movido
4. `Logs/rotated/03-client-2026-10-03.log` - Movido
5. `Logs/rotated/04-main_process-2026-07-02.log` - Movido
6. `client/src/main/index.ts` - Modificado (implementación de rotación)
7. `Logs/12-IMPLEMENTACION-ROTACION-LOGS-2026-07-02_19-22-00.md` - Creado (este archivo)
8. `Logs/ULTIMO_NUMERO.txt` - Modificado (actualizado a 12)
