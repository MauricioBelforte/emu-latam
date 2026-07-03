# Estado de Trabajo en Paralelo

Este archivo coordina los agentes que trabajan en paralelo. **Leerlo siempre antes de empezar cualquier tarea**, y actualizarlo al reclamar, iniciar, bloquear o completar una tarea.

## Reglas

1. **Leer antes de tocar código**: Verificar qué archivos están siendo modificados por otro agente.
2. **No pisarse**: Si otro agente tiene `reclamado` o `en progreso` sobre un archivo, no modificarlo.
3. **Reclamar primero**: Antes de empezar, agregar entrada con estado `reclamado`.
4. **Firmar cada entrada**: Cada agente se identifica con su nombre/modelo (ej: `Claude`, `GPT-4`, `Gemini`, `DeepSeek`).
5. **Timestamp**: Usar formato `YYYY-MM-DD HH:MM` (24h, zona horaria local).
6. **Archivos involucrados**: Listar rutas exactas separadas por coma.

---

## Tareas activas

| Tarea | Agente | Archivos | Estado | Inicio | Fin |
|-------|--------|----------|--------|--------|-----|
| MITM relay - handshake con RA real | DeepSeek | `relay-server/mitm-relay.js`, `client/src/main/index.ts`, `retroarch/netplay_mitm.cfg` | en progreso | 2026-07-02 18:55 | - |
| Reestructuración documentación - plan-inicial/plan-actual | Claude | `DOCUMENTACION/*/plan-inicial/*`, `DOCUMENTACION/*/plan-actual/*`, `AGENTS.md` | completado | 2026-07-02 19:05 | 2026-07-02 19:07 |

---

## Historial de tareas completadas

| Tarea | Agente | Archivos | Estado | Inicio | Fin |
|-------|--------|----------|--------|--------|-----|
| - | - | - | - | - | - |

---

## Cambios de Modalidad de Trabajo

**Fecha:** 2026-07-02 19:07
**Agente:** Claude
**Descripción:** Se reestructuró el sistema de documentación para tener traza completa del avance del proyecto.

### Nueva Estructura de Documentación
- Cada componente ahora tiene DOS carpetas: `plan-inicial/` y `plan-actual/`
- `plan-inicial/`: Documentación original del componente (NO MODIFICAR) - referencia histórica
- `plan-actual/`: Documentación vigente del componente (ACTUALIZAR AQUÍ) - refleja estado actual
- Ambas carpetas contienen los 5 archivos obligatorios: 01-Requerimientos.md, 02-Analisis.md, 03-Diseno.md, 04-Codigo.md, 05-Checklist.md

### Componentes Reestructurados
- 01-Setup-Electron-Vite
- 02-Integracion-Nakama
- 03-Integracion-Bore
- 04-Anti-Lag-RunAhead

### Actualización de AGENTS.md
- Sección 3 actualizada con nueva estructura de carpetas
- Sección 11 actualizada con pasos para crear nuevos componentes
- Reglas claras sobre qué modificar (plan-actual) y qué no (plan-inicial)

### Objetivo
Tener traza completa desde lo original hasta lo actual, combinado con los logs en `Logs/`, para saber qué no repetir y qué errores se cometieron anteriormente.
