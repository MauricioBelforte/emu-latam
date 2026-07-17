# Estado de Trabajo en Paralelo

Este archivo coordina los agentes que trabajan en paralelo. **Leerlo siempre antes de empezar cualquier tarea**, y actualizarlo al reclamar, iniciar, bloquear o completar una tarea.

## Reglas

1. **Leer antes de tocar código**: Verificar qué archivos están siendo modificados por otro agente.
2. **No pisarse**: Si otro agente tiene `reclamado` o `en progreso` sobre un archivo, no modificarlo.
3. **Reclamar primero**: Antes de empezar, agregar entrada con estado `reclamado`.
4. **Firmar cada entrada**: Cada agente se identifica con su nombre/modelo (ej: `Claude`, `GPT-4`, `Gemini`, `DeepSeek`).
5. **Timestamp**: Usar formato `YYYY-MM-DD HH:MM` (24h, zona horaria local).
6. **Archivos involucrados**: Listar rutas exactas separadas por coma.
7. **Chat por temas**: Cada problema/feature usa su propia carpeta en `Mensajes entre modelos/` con archivos tipo chat (formato `YYYY-MM-DD_HH-MM-SS_N-MODELO-descripcion.md`). Ver sección 10 de AGENTS.md.

---

## Tareas activas

### Tarea: Investigar optimización netplay (latencia, desync, audio)
**Agente:** Pendiente (asignar a Gemini/Claude/GPT-4)
**Carpeta:** `Mensajes entre modelos/inputs-retroarch-netplay-latencia-desync-audio/`
**Archivo planteo:** `2026-07-16_21-18-00_1-DEEPSEEK-planteo-investigacion.md`
**Estado:** `disponible` (esperando que otro modelo lo tome)
**Prioridad:** Alta (bloquea experiencia de juego)
**Inicio:** 2026-07-16 21:18

---

## Historial de tareas completadas

| Tarea | Agente | Archivos | Estado | Inicio | Fin |
|-------|--------|----------|--------|--------|-----|
| MITM relay - handshake con RA real | DeepSeek | `relay-server/mitm-relay.js`, `client/src/main/index.ts`, `retroarch/netplay_mitm.cfg` | completado | 2026-07-02 18:55 | 2026-07-02 23:00 |
| Reestructuración documentación - plan-inicial/plan-actual | Claude | `DOCUMENTACION/*/plan-inicial/*`, `DOCUMENTACION/*/plan-actual/*`, `AGENTS.md` | completado | 2026-07-02 19:05 | 2026-07-02 19:07 |
| Fix INSERT COIN + Nakama fallback + execSync timeout | DeepSeek | `client/src/App.tsx`, `client/src/context/AuthContext.tsx`, `client/src/main/index.ts` | completado | 2026-07-04 04:00 | 2026-07-04 05:59 |
| Inputs direccionales duplicados en host | DeepSeek / Gemini | `retroarch/netplay_optimized.cfg`, `RESUELTOS/1-inputs-direccionales-duplicados/` | ✅ Archivado en RESUELTOS | 2026-07-04 05:59 | 2026-07-09 05:31 |

---

## Cambios de Modalidad de Trabajo

**Fecha:** 2026-07-04 06:10
**Agente:** DeepSeek
**Descripción:** Se actualizó el protocolo de comunicación entre modelos (sección 10 de AGENTS.md) para usar chat por temas con carpetas dedicadas.

### Nueva estructura de comunicación
- Cada problema/feature tiene su propia carpeta en `Mensajes entre modelos/`
- Mensajes con formato: `YYYY-MM-DD_HH-MM-SS_N-MODELO-descripcion.md`
- Firma con modelo, fecha, y referencia al mensaje anterior
- Subcarpetas para documentación extensa de soluciones propuestas
