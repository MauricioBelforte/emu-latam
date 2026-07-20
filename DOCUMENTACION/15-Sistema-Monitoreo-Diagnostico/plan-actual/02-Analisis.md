# Análisis: Sistema de Monitoreo y Diagnóstico

## Análisis del dominio

### Logger actual
El sistema actual intercepta `console.log`/`console.error` y los escribe en `logs/main_process.log` con rotación automática a 500KB (implementado en `index.ts:17-63`). Es simple pero funcional. No tiene niveles (toda la salida es "LOG" o "ERR") ni tagging por módulo.

### Estado actual de la limpieza
En `index.ts:806-815` existe un handler `before-quit` que mata nakamaProcess, boreProcess y mitmRelayProcess manualmente. No es extensible: si se agrega un nuevo proceso (ej: fcadefbneo para GGPO), hay que modificar el handler a mano.

### Estado actual de validación
Existe `checkNakamaHealth()` que verifica vía HTTP si Nakama responde. No hay validación de que los binarios existan en disco antes de intentar lanzarlos.

### Estado actual del monitoreo
No existe monitoreo de recursos. No hay forma de saber cuánta RAM usa Nakama o si RetroArch consume CPU en exceso.

## Alternativas evaluadas

| Alternativa | Logger | Cleanup | Monitoreo | Veredicto |
|-------------|--------|---------|-----------|-----------|
| Winston + Pino | ✅ Logger profesional con niveles y transporte | ❌ No cubre | ❌ No cubre | ❌ Demasiado peso para lo que necesitamos |
| **Módulos ligeros propios** (elegido) | ✅ Niveles + tagging ligero | ✅ Registry extensible | ✅ Métricas básicas | ✅ **Elegido** — sin dependencias externas |
| node-pidusage | ❌ Solo CPU | ❌ No cubre | ✅ CPU/mem por PID | ❌ Dependencia externa innecesaria |
| electron-monitor | ❌ No cubre | ❌ No cubre | ✅ CPU/mem proceso padre | ❌ Solo proceso principal |

## Decisiones

1. **Logger**: No reemplazar el sistema actual. Agregar funciones helper `logInfo()`, `logWarn()`, `logError()`, `logDebug()` que envuelven `console.log` con formato estructurado `[LEVEL] [Module] mensaje`.
2. **CleanupManager**: Patrón Registry (registro/desregistro de funciones). Las funciones se registran al crear procesos y se ejecutan en orden inverso.
3. **DependencyValidator**: Función simple que toma un array de `{name, path}` y retorna `{name, path, exists}`. Se integra en los handlers IPC que lanzan procesos.
4. **ResourceMonitor**: Usa `process.memoryUsage()` del proceso padre + lista de PIDs hijos. Sin dependencias externas.
5. **StatusContext**: React Context con polling `setInterval(2000)` que llama `electron.getStatus()`. No usa librería externa.
6. **ErrorBanner**: Componente React puro con estado local. Auto-dismiss con `setTimeout(5000)`.
