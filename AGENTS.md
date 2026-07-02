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

Cada componente agregado al sistema Emu Latam se documenta en una subcarpeta numerada cronológicamente:

```
DOCUMENTACION/
├── README.md                          ← Explicación del sistema de carpetas
├── 1-DOCUMENTO-DE-ESPECIFICACIONES-ACTUAL.md
├── 2-DOCUMENTO-DISENO-ACTUAL.md
├── 3-DOCUMENTO-TAREAS-ACTUAL.md
├── 4-DOCUMENTO-EJECUCION-ACTUAL.md
├── Plan Inicial/                      ← Solo origen del proyecto
├── 01-Setup-Electron-Vite/            ← Setup inicial
├── 02-Integracion-Nakama/             ← Matchmaking y Auth
├── 03-Integracion-Bore/               ← Túneles TCP
└── 04-Anti-Lag-RunAhead/              ← Mejoras de latencia
```

Cada componente tiene 5 archivos obligatorios:
| Archivo | Contenido |
|---------|-----------|
| `01-Requerimientos.md` | Problema, objetivos, alcance, restricciones |
| `02-Analisis.md` | Análisis del dominio, alternativas, decisiones |
| `03-Diseno.md` | Arquitectura, diagramas, flujos |
| `04-Codigo.md` | Archivos involucrados, funciones clave, logs relacionados |
| `05-Checklist.md` | Checklist de tareas completadas y pendientes del componente |

### Reglas de actualización
- Al realizar cambios significativos en el código, actualizar los 4 archivos `*-ACTUAL.md`.
- No modificar los archivos dentro de `DOCUMENTACION/Plan Inicial/`.
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

## 10. Protocolo de Comunicación entre Modelos de Lenguaje
Cuando una tarea se bloquee y no se encuentre solución tras múltiples intentos:
1. Crear un archivo en `Mensajes entre modelos/` enumerado secuencialmente.
2. Formato: `N-TIPO-RESUMEN-MODELO.md` (ej: `1-PROBLEMA-tunel-bore-GEMINI.md`).
3. El archivo debe incluir: descripción del problema, contexto, código relevante, intentos fallidos. Esto permite a otro modelo continuar sin perder el contexto.

## 11. Documentación de Nuevos Componentes (DOCUMENTACION)
Al crear un nuevo componente o pipeline (ej: nueva integración con una API):
1. Verificar el próximo número en `DOCUMENTACION/README.md`.
2. Crear carpeta `DOCUMENTACION/{NN}-Nombre/`.
3. Crear los 5 archivos obligatorios (`01-Requerimientos.md`, `02-Analisis.md`, `03-Diseno.md`, `04-Codigo.md`, `05-Checklist.md`).
4. Actualizar `DOCUMENTACION/README.md`.

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
