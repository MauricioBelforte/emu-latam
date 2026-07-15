# Log de Cambios - Actualización de AGENTS.md con Rotación de Logs

**Fecha:** 2026-07-02 19:23:00
**Número:** 13
**Descripción:** Actualización de AGENTS.md con sección 17 sobre sistema de rotación de logs para informar a otros agentes

## Motivo del Cambio
Se implementó el sistema de rotación de logs en el código, pero era necesario documentarlo en AGENTS.md para que otros agentes (especialmente DeepSeek que está trabajando en el proyecto) sepan cómo funciona y cómo implementarlo si necesitan agregar logs adicionales.

## Cambios Realizados

### 1. Agregado de Sección 17 en AGENTS.md

**Nueva sección:** "## 17. Sistema de Rotación de Logs"

**Contenido agregado:**

#### Estructura de Logs
```
Logs/
├── rotated/                          ← Logs rotados (históricos)
│   ├── 01-test_host-2026-06-30.log
│   ├── 02-retroarch_host-2026-10-03.log
│   ├── 03-client-2026-10-03.log
│   └── 04-main_process-2026-07-02.log
├── main_process.log                  ← Log actual (siempre < 500KB)
├── dev_output.txt
└── ULTIMO_NUMERO.txt
```

#### Implementación en Código
- **Ubicación:** `client/src/main/index.ts` (líneas 11-58)
- **Configuración:** MAX_LOG_SIZE = 500KB, LOG_DIR = logs/, LOG_ROTATED_DIR = logs/rotated/
- **Función `rotateLogIfNeeded()`:** Verifica tamaño, rota si >= 500KB, registra rotación
- **Comportamiento:** Creación automática de carpetas, rotación transparente, trazabilidad por fecha

#### Reglas para Nuevos Logs
1. Usar `console.log()` y `console.error()` (ya interceptados)
2. No crear archivos de log adicionales
3. Si necesitas log separado: implementar rotación similar, usar formato `NN-nombre-YYYY-MM-DD.log`, guardar en `logs/rotated/`

#### Formato de Nomenclatura
- **Formato:** `NN-nombre_log-YYYY-MM-DD.log`
- **NN** = Número secuencial

## Beneficios de la Documentación

1. **Coordinación entre agentes:** DeepSeek y otros agentes pueden consultar AGENTS.md para entender el sistema de logs
2. **Consistencia:** Reglas claras para agregar nuevos logs
3. **Mantenimiento:** Documentación centralizada de la implementación
4. **Onboarding:** Nuevos agentes pueden entender rápidamente cómo funciona el logging

## Archivos Modificados/Creados

1. `AGENTS.md` - Modificado (agregada sección 17 sobre rotación de logs)
2. `Logs/13-ACTUALIZACION-AGENTS-ROTACION-LOGS-2026-07-02_19-23-00.md` - Creado (este archivo)
3. `Logs/ULTIMO_NUMERO.txt` - Modificado (actualizado a 13)
