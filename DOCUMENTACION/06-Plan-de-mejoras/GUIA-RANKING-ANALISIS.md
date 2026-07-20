# Guía de Planes de Mejora — 06-Plan-de-mejoras

> Documento de referencia con el ranking, análisis y recomendaciones de los 7 modelos LLM que aportaron planes de mejora para Emu Latam.
> Creado: 2026-07-20. Revisar antes de decidir qué implementar.

---

## Ranking (de mejor a peor)

### 🥇 01-Devin-SWE-1.6-Slow
**Enfoque:** Sistema integral de logging, monitoreo y diagnóstico
**Estado:** 23/29 tareas completadas. 10/10 tests pasados. ✅ El más avanzado.
**Lo que ya tiene:** Logger con rotación (Winston), ResourceMonitor, DependencyValidator (chequea binarios al inicio), CleanupManager, StatusContext en React vía IPC
**Lo que falta:** 6 tareas pendientes (detalles en su checklist)
**Valor:** Alto. Ya está parcialmente en producción. Completarlo es esfuerzo bajo vs retorno alto.

### 🥈 02-Minimax-M3
**Enfoque:** Gestión de procesos, IPC whitelist, toasts, shared utils
**Estado:** 1/8 pruebas pasadas (formatBytes). El resto sin implementar.
**Lo más valioso:**
- **ProcessRegistry** — Trackea procesos hijos (PID, nombre, startTime). Mata huérfanos. Crítico para GGPO.
- **Toast notifications** — Sistema event-based. Hoy los errores van solo a console.log. ~30 líneas y transforma la UX.
- **IPC Whitelist + channels tipados** — Seguridad. Hoy cualquier channel pasa. Con GGPO agregando handlers, es el momento.
- **Shared utils** (`sleep`, `withTimeout`, etc.) — Elimina código duplicado.
**Valor:** Muy alto. Complementa a Devin (no se solapan). Bajo esfuerzo, alto impacto.

### 🥉 03-Nemotron-3-Ultra
**Enfoque:** Plan estructural más completo (12 áreas de mejora)
**Estado:** 100% documentado, 0% implementado.
**Lo destacable:**
- IPC shared types (`src/shared/ipc.ts`)
- React Query para data fetching (reemplazaría Context en algunos casos)
- Refactor de servicios (`TunnelService`)
- Health checks para Nakama/Bore/forwarder
- Error Boundaries en React
- Vitest para tests unitarios
- AppConfig centralizado
**Valor:** Alto, pero requiere planificar bien para no romper flujos estables. Mejor para una fase de refactor más adelantada.

### 04-Poolside-Laguna-M1
**Enfoque:** Automatización de flujo Host+Bore, escaneo ROMs, persistencia de config, métricas de red
**Estado:** 100% documentado, 0% implementado. Sin tests.
**Lo más valioso:**
- **Auto-host-bore** — Unifica HOST + BORE en 1 botón. Elimina el paso manual de "primero crear sala, luego abrir túnel".
- **NetworkMetricsPanel** — Muestra latencia, packet loss, etc. en la UI.
- **Persistencia de config** — Guarda preferencias del usuario entre sesiones.
**Valor:** Medio-alto. Muy orientado al usuario final. Depende de que los flujos estables existentes no se toquen.

### 05-Gemini-3.5-Flash
**Enfoque:** Optimización de transporte (Tailscale), APIs nativas Nakama, control RetroArch vía UDP
**Estado:** 2/2 pruebas de concepto pasadas (diagnóstico Tailscale, ping RetroArch UDP).
**Lo destacable:**
- Diagnóstico Tailscale via `tailscale status`
- SDK Nakama nativo (`@heroiclabs/nakama-js`) en vez de HTTP manual
- Control RetroArch vía UDP (comandos `/netplay`)
**Valor:** Medio. Buenas ideas técnicas pero varias ya están cubiertas por módulos existentes (Tailscale = módulo 07). El control UDP de RetroArch es interesante pero no prioritario.

### 06-DeepSeek-V4-Flash-Free
**Enfoque:** Análisis holístico: 5 dimensiones (Arquitectura, Seguridad, UX, Infra, Testing)
**Estado:** 100% documentado, 0% implementado.
**Lo destacable:**
- Strict TypeScript global
- Validación de IPC con `zod`
- CI/CD con GitHub Actions
- Code splitting + lazy loading en React
**Valor:** Bajo por ahora. Toquetearía demasiados archivos. Riesgo alto de regresión. Mejor para una versión 2.0.

### 07-Stepfun-Step-3.7-Flash
**Enfoque:** Flujo de retos, anti-lag adaptativo, metrics session, Tailscale fallback
**Estado:** El único sin carpeta plan-actual. 2/33 tareas completadas. Sin tests.
**Problemas:**
- Propone cosas que ya existen (Tailscale fallback, anti-lag)
- Documentación incompleta
- Sin plan de testings
**Valor:** Bajo. Lo descartable de este lote.

---

## Recomendación: Prioridades para implementar

### Fase 1 (ahora — bajo esfuerzo, alto impacto)
1. **Terminar Devin** — 6 tareas pendientes, completar su checklist
2. **Adoptar Minimax** — ProcessRegistry + Toast notifications + IPC whitelist

### Fase 2 (próximo sprint)
3. **Poolside Auto-host-bore** — 1-click simplifica la UX
4. **Nemotron shared types** — Ponerle tipos a los IPC handlers

### Fase 3 (futuro)
5. **Nemotron health checks + Error Boundaries**
6. **Gemini — control UDP RetroArch** (si se necesita)
7. **DeepSeek — CI/CD + strict TS** (solo si el proyecto escala)

### Descartado
- **Stepfun** — No implementar. Lo que propone ya existe o está cubierto por otros módulos.

---

## Solapamientos importantes

| Área | Modelos que la proponen | Decisión |
|------|------------------------|----------|
| Logger | Devin, Nemotron, DeepSeek | **Usar el de Devin** (ya implementado) |
| Tipado IPC | Minimax, Nemotron, DeepSeek | **Unificar criterio**: Minimax whitelist + Nemotron shared types |
| Health checks | Nemotron, Stepfun, Gemini | **Usar el de Nemotron** (más completo) |
| UX/Spinners | Todos | **Ya está en AGENTS.md §8** — mantener lo que hay |

---

## Archivos referenciados

- `DOCUMENTACION/06-Plan-de-mejoras/README.md` — tabla de contenidos actualizada
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` — checklist general del proyecto
- `AGENTS.md` §8 (progreso visual), §14 (modularización), §15 (flujos bloqueados)
