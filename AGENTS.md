# Reglas Globales para la IA (Emu Latam)

## 1. Idioma
- Todas las comunicaciones deben realizarse **estrictamente en español**.

## 2. Verificación inicial en proyectos
Antes de ejecutar cualquier tarea en un repositorio o proyecto:
1. Verificar siempre si existe un archivo `AGENTS.md` en la **raíz del proyecto**.
2. Si existe, leerlo completo y **priorizar sus instrucciones** sobre cualquier regla global.

## 3. Estructura de Documentación del Proyecto

La documentación vive dentro de `DOCUMENTACION/`. La raíz del proyecto solo contiene `AGENTS.md`, `README.md`, y configuraciones generales.

### DOCUMENTACION/ — Raíz de la carpeta (documentación general vigente)

En la raíz de `DOCUMENTACION/` están los 4 documentos generales que reflejan el estado actual del sistema y deben ser consultados/modificados durante el desarrollo:

| Archivo | Contenido |
|---------|-----------|
| `1-DOCUMENTO-DE-ESPECIFICACIONES-ACTUAL.md` | Especificaciones técnicas vigentes |
| `2-DOCUMENTO-DISENO-ACTUAL.md` | Diseño detallado vigente |
| `3-DOCUMENTO-TAREAS-ACTUAL.md` | Checklist de tareas con estado actual |
| `4-DOCUMENTO-EJECUCION-ACTUAL.md` | Código de ejecución vigente |

### DOCUMENTACION/Plan Inicial/ — Solo el origen del proyecto

Esta carpeta contiene la documentación original del proyecto. **No refleja el estado actual del código.** Solo debe consultarse como referencia histórica. ⚠️ No debe modificarse.

### DOCUMENTACION/ — Documentación por Componentes

Cada componente agregado al sistema Emu Latam se documenta en una subcarpeta numerada cronológicamente. **Cada componente tiene DOS carpetas obligatorias:**

```
DOCUMENTACION/
├── README.md                          ← Explicación del sistema de carpetas
├── 1-DOCUMENTO-DE-ESPECIFICACIONES-ACTUAL.md
├── 2-DOCUMENTO-DISENO-ACTUAL.md
├── 3-DOCUMENTO-TAREAS-ACTUAL.md
├── 4-DOCUMENTO-EJECUCION-ACTUAL.md
├── Plan Inicial/                      ← Solo origen del proyecto (no modificar)
├── 01-Setup-Electron-Vite/
│   ├── plan-inicial/                  ← Documentación original del componente (NO MODIFICAR)
│   │   ├── 01-Requerimientos.md
│   │   ├── 02-Analisis.md
│   │   ├── 03-Diseno.md
│   │   ├── 04-Codigo.md
│   │   ├── 05-Checklist.md
│   │   ├── 06-Plan-Testings.md
│   │   └── 07-Resultados-Testings.md
│   └── plan-actual/                   ← Documentación vigente del componente (ACTUALIZAR AQUÍ)
│       ├── 01-Requerimientos.md
│       ├── 02-Analisis.md
│       ├── 03-Diseno.md
│       ├── 04-Codigo.md
│       ├── 05-Checklist.md
│       ├── 06-Plan-Testings.md
│       └── 07-Resultados-Testings.md
├── 02-Integracion-Nakama/
│   ├── plan-inicial/
│   └── plan-actual/
├── 03-Integracion-Bore/
│   ├── plan-inicial/
│   └── plan-actual/
└── 04-Anti-Lag-RunAhead/
    ├── plan-inicial/
    └── plan-actual/
```

### Archivos Obligatorios por Carpeta (plan-inicial y plan-actual)

Cada carpeta (`plan-inicial/` y `plan-actual/`) debe contener exactamente estos 7 archivos:

| Archivo | Contenido |
|---------|-----------|
| `01-Requerimientos.md` | Problema, objetivos, alcance, restricciones |
| `02-Analisis.md` | Análisis del dominio, alternativas, decisiones |
| `03-Diseno.md` | Arquitectura, diagramas, flujos |
| `04-Codigo.md` | Archivos involucrados, funciones clave, logs relacionados |
| `05-Checklist.md` | Checklist de tareas completadas y pendientes del componente |
| `06-Plan-Testings.md` | Plan de testings profesional para identificar bugs y fallos antes de la primera prueba manual |
| `07-Resultados-Testings.md` | Resultados detallados de la ejecución de tests con referencias al código y soluciones propuestas |

### Reglas de Actualización por Componente

**plan-inicial/**:
- **NO MODIFICAR NUNCA**. Contiene la documentación original del componente tal como fue concebido inicialmente.
- Sirve como referencia histórica para entender el diseño original y compararlo con el estado actual.

**plan-actual/**:
- **ACTUALIZAR AQUÍ** cuando se realicen cambios en el componente.
- Refleja el estado actual del código y la implementación.
- Si se modifica un componente existente, actualizar los archivos en `plan-actual/`.
- Los cambios deben documentarse en `Logs/` con el formato estándar.

### Reglas de Actualización General
- Al realizar cambios significativos en el código, actualizar los 4 archivos `*-ACTUAL.md` en la raíz de `DOCUMENTACION/`.
- No modificar los archivos dentro de `DOCUMENTACION/Plan Inicial/` (raíz).
- Si se requiere crear una nueva funcionalidad, agregarla al `3-DOCUMENTO-TAREAS-ACTUAL.md`.
- **Cuando se agregue un componente nuevo**, ver la sección 11.

## 4. Estándar de Commits (Git)
- **Idioma:** Español.
- **Tiempo verbal:** Pasado descriptivo (pasivo o impersonal). Ejemplo: "Se agregó el loader de Nakama".

## 5. Respaldos ante Cambios Grandes
Antes de realizar modificaciones grandes (como refactorizar el proceso principal de Electron):
1. **Creación de Carpeta:** Verificar la existencia de `Obsoletos/` en la ubicación del archivo.
2. **Respaldo:** Guardar una copia con nomenclatura: `AAAA-MM-DD_HH-MM-SS_nombre_archivo.extension`.

## 6. Registro de Cambios (Logs)
Cada vez que finalices una tarea, genera un informe de cambios:
1. **Carpeta de Logs:** En la carpeta `Logs/` en la raíz.
2. **Numeración Secuencial:** Leer `Logs/ULTIMO_NUMERO.txt` para el próximo número, y actualizarlo.
   - Formato: `NN-DESCRIPCION_BREVE_AAAA-MM-DD_HH-MM-SS.md`.
3. **Contenido Obligatorio:** Detallar código original, nuevo código, y descripción breve de la modificación.

## 7. Seguimiento de Progreso (Checklist)
Cada vez que completes una tarea:
1. Leer `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` (o el equivalente local).
2. Marcar como completado cambiando `[ ]` por `[x]`.

## 8. Progreso Visual Detallado (UX Obligatorio)
Toda tarea de red (conexión a Nakama, inicio de RetroArch, túneles) **DEBE** mostrar progreso visual al usuario en la interfaz de React.
- **Spinners y Loaders:** Por ejemplo, mientras se hace el Health Check de Nakama o se levanta el proceso `bore.exe`.
- **Mensajes de estado:** Textos descriptivos ("Iniciando servidor...", "Creando túnel...", "Sincronizando...").
- **Prevención de clicks rápidos:** Deshabilitar botones como "Insert Coin" o "Join" hasta que el servicio subyacente esté 100% operativo.

## 9. Modularidad y Desacoplamiento (Electron / React)
- **Separación de Procesos:** La lógica pesada de sistema (iniciar procesos de Nakama, Bore, RetroArch) pertenece al **Main Process** de Electron (`client/src/main/`). 
- **Renderer (Frontend):** React (`client/src/renderer/`) solo debe llamar a funciones expuestas vía IPC (`contextBridge` / `preload`).
- No acoplar lógica de sistema operativo directamente en los componentes de React.

## 10. Protocolo de Comunicación entre Modelos de Lenguaje (Chat por Temas)

Cuando una tarea se bloquee o requiera colaboración entre modelos, usar estructura tipo chat con carpetas por tema.

### Estructura
```
Mensajes entre modelos/
├── ESTADO-PARALELO.md                     ← Coordinación (quién trabaja en qué)
├── inputs-direccionales-duplicados/       ← Carpeta por TEMA a resolver
│   ├── 2026-07-04_05-59-00_1-DEEPSEEK-planteo.md
│   ├── 2026-07-04_18-00-00_2-GEMINI-analisis.md
│   ├── 2026-07-04_20-30-00_3-DEEPSEEK-prueba-solucion.md
│   └── documentacion-solucion/           ← Docs adicionales si la solución es extensa
│       └── diagrama-propuesta.md
```

### Reglas
1. **Carpeta por tema:** Cada problema/feature tiene su propia carpeta dentro de `Mensajes entre modelos/`.
2. **Mensajes tipo chat:** Archivos con formato:
   - `YYYY-MM-DD_HH-MM-SS_N-MODELO-descripcion-breve.md`
   - `N` = número secuencial del mensaje en ese hilo
   - `MODELO` = quien escribe (DeepSeek, Gemini, Claude, etc.)
3. **Fecha y hora:** Usar timestamp real en el nombre del archivo.
4. **Firma en el contenido:** Incluir al inicio del archivo:
   ```markdown
   **Modelo:** DeepSeek
   **Fecha:** 2026-07-04 18:00:00
   **Responde a:** `2026-07-04_05-59-00_1-DEEPSEEK-planteo.md`
   ```
5. **Documentación adjunta:** Si una solución requiere documentos extensos, crear una subcarpeta dentro del tema (ej: `documentacion-solucion/`).
6. **No eliminar mensajes anteriores:** El hilo completo debe conservarse para trazabilidad.
7. **ESTADO-PARALELO.md:** Mantener actualizado para saber qué modelo trabaja en cada tema.

## 11. Documentación de Nuevos Componentes (DOCUMENTACION)
Al crear un nuevo componente o pipeline (ej: nueva integración con una API):
1. Verificar el próximo número en `DOCUMENTACION/README.md`.
2. Crear carpeta `DOCUMENTACION/{NN}-Nombre/`.
3. Crear la carpeta `plan-inicial/` dentro del componente.
4. Crear los 7 archivos obligatorios en `plan-inicial/` (`01-Requerimientos.md`, `02-Analisis.md`, `03-Diseno.md`, `04-Codigo.md`, `05-Checklist.md`, `06-Plan-Testings.md`, `07-Resultados-Testings.md`).
5. Crear la carpeta `plan-actual/` dentro del componente (vacía inicialmente).
6. Crear los 7 archivos obligatorios en `plan-actual/` (pueden ser copia de plan-inicial al inicio).
7. Actualizar `DOCUMENTACION/README.md`.

## 12. Verificación y Diagnóstico Post-Tarea
Antes de dar una tarea por terminada:
1. **Verificar el inicio:** Ejecutar `npm run dev` dentro de la carpeta `client`.
2. **Sin Errores en Consola:** Asegurarse de que no haya errores de TypeScript (usar `npm run lint` o validarlo internamente) y de que Vite levante exitosamente.
3. **Flujo Completo:** Si modificaste el lanzamiento de Nakama o Bore, verificar localmente que los child_process estén respondiendo antes de decir que la tarea está finalizada.

## 13. Flujo de Trabajo: Documentación Primero (Documentation-First)

Este es el **flujo de trabajo obligatorio**:

### Para tareas NUEVAS (nuevo componente):
1. **Antes de escribir código:** Crear la carpeta del componente en `DOCUMENTACION/` y sus 5 archivos.
2. Implementar la funcionalidad.
3. Verificar que todo funcione (`npm run dev`).
4. Revisar los 5 archivos iniciales contra el código real y actualizar si hay diferencias.
5. Generar log en `Logs/`.

### Para tareas sobre MÓDULOS EXISTENTES (mejoras, bugfixes):
1. **Antes de escribir código:** Leer los archivos del componente en `DOCUMENTACION/` (o si no existe, usar el plan general).
2. Implementar la modificación.
3. Verificar que funcione.
4. Actualizar los archivos del módulo/documentación para reflejar el cambio.
5. Actualizar los `*-ACTUAL.md` de la raíz si el cambio es significativo (arquitectura, flujos principales).
6. Generar log en `Logs/`.

## 14. Modularización de Flujos Complejos (Nuevo)

Cuando se desarrolle una funcionalidad nueva que comparta lógica con flujos existentes que ya funcionan:

1. **Identificar el flujo nuevo vs existente:** Si el nuevo flujo (ej: desafíos/retos) tiene requisitos diferentes o puede necesitar cambios que afecten a flujos que ya andan (ej: host directo, host con bore manual), se debe crear un módulo/IPC handler/componente separado.
2. **No tocar lo que funciona:** Si el handler `launch-game` ya funciona correctamente para los modos manuales, no modificarlo para el nuevo flujo. En su lugar:
   - Agregar **nuevos IPC handlers** en el main process para el nuevo flujo.
   - El nuevo handler puede REUTILIZAR funciones auxiliares compartidas (ej: `waitForPort`, `startProxy`, `spawn RA`) pero debe tener su propia lógica de orquestación.
   - Esto permite que el nuevo flujo pueda matar procesos, cambiar puertos, o hacer limpieza agresiva sin riesgo de romper los flujos existentes.
3. **Documentar la decisión:** En los archivos del componente (`03-Diseno.md` o `04-Codigo.md`), explicar por qué se optó por un flujo separado y qué comparte con los flujos existentes.

## 15. Flujos Bloqueados (Estables) — NO MODIFICAR

Estos flujos han sido verificados y no deben modificarse. Cualquier cambio debe hacerse en un flujo paralelo nuevo.

| Flujo | Botón(es) | Handler/IPC | Args RA | Arquitectura |
|-------|-----------|-------------|---------|-------------|
| Host directo (sin bore) | "HOST DIRECTO (sin bore)" | `launch-game` con `useRelay=false` | Host: `--host --port 55435`, Guest: `--connect 127.0.0.1 --port 55435` | Directo, sin proxy ni túnel |
| Host con bore manual | "1. HOST GAME (BORE)" + "2. JOIN GAME" | `start-relay-tunnel` (V1) + `launch-game` con `useRelay=true` | Host: `--host --port 55435`, Guest: `--connect 127.0.0.1` | Host: forwarder 55436→LAN_IP:55435, bore `local 55436 --to bore.pub`. Guest: proxy 55435→bore.pub:XXXXX |
| Join directo (lee relay file) | "2. JOIN GAME" | `launch-game` con `useRelay=true, relayIp=del archivo` | Guest: `--connect 127.0.0.1` (con proxy) o `--connect 127.0.0.1 --port 55435` (directo) | Según relayIp: si es IP local → directo, si es externa → proxy + bore |

### Detalle de la arquitectura bore manual
```
[Guest RA] → --connect 127.0.0.1 → proxy:55435 (127.0.0.1) → bore.pub:XXXXX → bore tunnel → forwarder:55436 (127.0.0.1) → LAN_IP:55435 → [Host RA]
```
- **`--port` es ignorado por RetroArch en ambos modos** (host y cliente). Siempre usa 55435.
- El forwarder usa `getLanIp()` (LAN IP, ej: 192.168.x.x) para conectar al host RA y evitar el conflicto con el proxy que escucha en `127.0.0.1:55435`.
- La limpieza de servidores es independiente: `proxyServers[]` se limpia al cerrar guest, `forwarderServers[]` al cerrar host.
- Test de verificación: `npm run test:stable` (35 tests) en `client/test_stable_flows.js`.

## 16. Trabajo en Paralelo entre Agentes

Cuando múltiples agentes trabajen simultáneamente, usar el sistema de chat por temas definido en la sección 10:

1. **Archivo de coordinación obligatorio**: `Mensajes entre modelos/ESTADO-PARALELO.md`.
2. **Leerlo siempre** antes de empezar cualquier tarea (antes de tocar código o archivos).
3. **Actualizarlo** al reclamar, iniciar, bloquear o completar una tarea.
4. **No modificar archivos** que otro agente tenga `reclamado` o `en progreso`.
5. Cada entrada debe incluir: nombre de tarea, agente, archivos involucrados, estado, timestamp.
6. Los agentes se identifican con su nombre/modelo (ej: `Claude`, `GPT-4`, `Gemini`, `DeepSeek`).
7. **Usar carpetas por tema** para cada problema/feature (sección 10.1). Si dos agentes ocupan temas distintos → pueden trabajar en paralelo sin issues.

## 17. Sistema de Rotación de Logs

El proyecto implementa un sistema automático de rotación de logs para evitar que los archivos crezcan indefinidamente.

### Estructura de Logs

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

### Implementación en Código

**Ubicación:** `client/src/main/index.ts` (líneas 11-58)

**Configuración:**
- `MAX_LOG_SIZE = 500KB` - Umbral de rotación
- `LOG_DIR = logs/` - Directorio de logs
- `LOG_ROTATED_DIR = logs/rotated/` - Directorio de logs rotados

**Función `rotateLogIfNeeded()`:**
- Verifica el tamaño del log actual después de cada write
- Si el tamaño >= 500KB, renombra el archivo a `logs/rotated/main_process-YYYY-MM-DD.log`
- Crea automáticamente un nuevo `main_process.log` vacío
- Registra la rotación con mensaje `[LOG ROTATION]`

**Comportamiento:**
- Las carpetas `logs/` y `logs/rotated/` se crean automáticamente si no existen
- La rotación es transparente para el usuario
- Los logs rotados conservan la fecha en el nombre para trazabilidad

### Reglas para Nuevos Logs

Si necesitas agregar logging en el código:
1. **Usar `console.log()` y `console.error()`** - Estos ya están interceptados y escriben al archivo automáticamente
2. **No crear archivos de log adicionales** - Usa el sistema existente
3. **Si necesitas un log separado** (ej: para un componente específico):
   - Implementar rotación similar en el código del componente
   - Usar el mismo formato de nomenclatura: `NN-nombre-YYYY-MM-DD.log`
   - Guardar en `logs/rotated/` cuando se rote

### Formato de Nomenclatura para Logs Rotados

**Formato:** `NN-nombre_log-YYYY-MM-DD.log`

**Ejemplos:**
- `01-test_host-2026-06-30.log`
- `02-retroarch_host-2026-10-03.log`
- `03-client-2026-10-03.log`
- `04-main_process-2026-07-02.log`

**NN** = Número secuencial (se incrementa automáticamente al mover logs existentes)

## 18. Plan de Testings Profesional para Nuevos Módulos

Antes de integrar un nuevo módulo al proyecto y realizar la primera prueba manual del usuario, se debe crear y ejecutar un plan de testings profesional para identificar bugs y fallos.

### Requisitos del Plan de Testings

1. **Tipos de pruebas a incluir:**
   - Pruebas unitarias de cada función/componente
   - Pruebas de integración entre módulos
   - Pruebas de casos límite (edge cases)
   - Pruebas de manejo de errores
   - Pruebas de rendimiento si aplica

2. **Documentación del plan:**
   - Crear archivo `06-Plan-Testings.md` en la carpeta `plan-actual/` del componente
   - Listar todos los escenarios a probar
   - Definir criterios de éxito para cada prueba

3. **Ejecución obligatoria:**
   - Ejecutar todas las pruebas antes de notificar al usuario
   - Documentar resultados (pasaron/fallaron)
   - Corregir fallos encontrados antes de la primera prueba manual

4. **Actualización de checklist:**
   - Agregar items de testing en `05-Checklist.md`
   - Marcar como completado solo cuando todas las pruebas pasen

### Flujo de Testings

1. **Diseñar el plan:** Antes de implementar, definir qué se va a probar
2. **Implementar pruebas:** Crear tests automatizados cuando sea posible
3. **Ejecutar pruebas:** Correr el suite de tests completo
4. **Corregir fallos:** Solucionar bugs encontrados antes de la entrega
5. **Documentar resultados:** Registrar en `06-Plan-Testings.md` qué pruebas pasaron
6. **Notificar al usuario:** Solo cuando el plan de testings esté completado exitosamente

### Contenido de 06-Plan-Testings.md

El archivo debe incluir:

```markdown
# Plan de Testings - [Nombre del Componente]

## Pruebas Unitarias
- [ ] Prueba de función X
- [ ] Prueba de función Y

## Pruebas de Integración
- [ ] Prueba de integración con módulo A
- [ ] Prueba de integración con módulo B

## Casos Límite (Edge Cases)
- [ ] Caso límite 1
- [ ] Caso límite 2

## Manejo deErrores
- [ ] Error cuando X falla
- [ ] Error cuando Y falla

## Pruebas de Rendimiento (si aplica)
- [ ] Prueba de rendimiento 1
- [ ] Prueba de rendimiento 2

## Resultados de Ejecución
- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todos los manejos de errores pasaron
- [ ] Todas las pruebas de rendimiento pasaron

## Fecha de Ejecución: [YYYY-MM-DD]
## Estado: [COMPLETADO/PENDIENTE]
```

### Archivo 07-Resultados-Testings.md

Después de ejecutar las pruebas definidas en `06-Plan-Testings.md`, se debe crear el archivo `07-Resultados-Testings.md` en la carpeta `plan-actual/` del componente.

**Contenido obligatorio:**
- Resultados detallados de cada prueba ejecutada
- Referencias específicas al código que contiene los errores (archivo, línea, función)
- Descripción detallada de cada problema encontrado
- Soluciones propuestas para cada problema
- Enlace cruzado desde `06-Plan-Testings.md` a `07-Resultados-Testings.md` para ver soluciones

**Formato de referencia en 06-Plan-Testings.md:**
```markdown
- [ ] Prueba X ❌ FALLÓ - Ver solución detallada en `07-Resultados-Testings.md`
```

**Estructura de 07-Resultados-Testings.md:**
```markdown
# Resultados de Testings - [Nombre del Componente]

## Resumen de Ejecución
- Fecha: [YYYY-MM-DD]
- Pruebas totales: N
- Pruebas pasadas: N
- Pruebas falladas: N
- Porcentaje de éxito: X%

## Problemas Encontrados

### Problema 1: [Descripción breve]
**Prueba afectada:** [Nombre de la prueba]
**Archivo:** [ruta/archivo.ts]
**Línea:** [número]
**Código problemático:**
```typescript
// Código con error
```
**Descripción detallada:** [Explicación del problema]
**Solución propuesta:**
```typescript
// Código corregido
```

### Problema 2: [Descripción breve]
...
```

## 21. Archivo de Hilos de Chat Resueltos (RESUELTOS)

Cuando un problema analizado en `Mensajes entre modelos/` se considere **sustancialmente resuelto** (aunque pueda tener retoques pendientes):

1. **Crear carpeta `Mensajes entre modelos/RESUELTOS/`** si no existe.
2. **Mover la carpeta del tema** de `Mensajes entre modelos/` a `Mensajes entre modelos/RESUELTOS/`.
3. **Agregar prefijo numérico** al nombre de la carpeta para orden cronológico:
   ```
   Mensajes entre modelos/inputs-direccionales-duplicados/
   → Mensajes entre modelos/RESUELTOS/1-inputs-direccionales-duplicados/
   ```
4. **Mantener el historial intacto:** No se eliminan ni modifican los archivos del hilo.
5. **Se puede retomar después:** Si en el futuro se quiere mejorar o ajustar algo, se puede:
   - Volver a mover la carpeta de `RESUELTOS/` a `Mensajes entre modelos/`
   - Agregar nuevos archivos al hilo existente
   - O crear un hilo nuevo referenciando al anterior
6. **Actualizar `ESTADO-PARALELO.md`:** La tarea se mueve al historial de completadas con la fecha de archivo.

## 22. Empaquetado del EXE (Electron)

Para generar el `.exe` distribuible (sin Node.js):

```bash
cd client
npm run package
```

**Qué hace:**
1. `electron-vite build` — compila main + preload + renderer a `out/`
2. `@electron/packager` — empaqueta Electron + app en `dist/Emu Latam-win32-x64/`
3. Copia `backend/`, `retroarch/`, `relay-server/` a `resources/extraResources/`

**Output:** `client/dist/Emu Latam-win32-x64/Emu Latam.exe` (~688 MB)

**Notas:**
- `electron-builder` NO funciona en este equipo (falla winCodeSign por symlinks). Usar `@electron/packager`.
- F12/DevTools deshabilitado en producción (ver `index.ts:createWindow()`).
- `getProjectRoot()` retorna `process.resourcesPath/extraResources` en modo empaquetado.
- Para distribuir, comprimir toda la carpeta `Emu Latam-win32-x64/` en ZIP.
