# Plan de Mejoras — DeepSeek V4 Flash Free

> Propuesta generada por DeepSeek V4 Flash Free el 04/07/2026.
> Este documento presenta un análisis independiente y recomendaciones estratégicas para la evolución del proyecto Emu Latam.

---

## Resumen Ejecutivo

Emu Latam es un launcher de escritorio (Electron + React) para jugar KOF '98 online mediante RetroArch, con integración de túnel Bore, backend Nakama y soporte Tailscale. El proyecto tiene una base sólida con flujos blindados verificados, pero presenta oportunidades significativas en 5 dimensiones clave.

---

## Las 5 Dimensiones de Mejora

### Dimensión 1: Arquitectura y Modularidad

**Problema:** `client/src/main/index.ts` concentra 610+ líneas con 10 IPC handlers, proxy TCP, forwarder, logging, rotación, manejo de procesos y más. Esto dificulta el mantenimiento, testing unitario y escalabilidad.

**Propuesta:** Refactorizar en módulos independientes:
- `ipc-handlers.ts` — Todos los handlers IPC (separados por dominio)
- `tcp-proxy.ts` — Lógica de proxy y forwarder
- `process-manager.ts` — Spawn/kill de procesos (Nakama, Bore, RetroArch)
- `logging.ts` — Sistema de logging con rotación
- `config.ts` — Constantes, rutas, puertos

**Impacto:** Mantenibilidad ++ | Testabilidad +++ | Escalabilidad ++

---

### Dimensión 2: Seguridad y Tipado

**Problema:** El preload expone `ipcRenderer.invoke` sin whitelist de canales, hay 6+ `@ts-expect-error` en el renderer, y `window.electron` no está tipado. Comandos shell como `taskkill` no sanitizan entrada.

**Propuesta:**
1. Tipar `window.electron` con interfaces TypeScript dedicadas
2. Implementar whitelist de canales IPC en el preload
3. Sanitizar comandos shell (escapar argumentos)
4. Externalizar secrets de Nakama a variables de entorno o archivo .env

**Impacto:** Seguridad +++ | Calidad código ++ | DevX ++

---

### Dimensión 3: Rendimiento y UX

**Problema:** Health check loop permanente (cada 1s) consume CPU incluso tras autenticación. Sin lazy loading de componentes. Sin sistema de notificaciones toast. Spinners básicos o inexistentes.

**Propuesta:**
1. Detener health check al autenticarse, reanudar solo al reconectar
2. Implementar `React.lazy` + `Suspense` para modales/componentes pesados
3. Sistema de notificaciones (toast) con cola, tipos (success/error/info), auto-dismiss
4. Componente reutilizable de spinner/loader con estados descriptivos
5. Cachear resultados de `getLanIp()` y `getTailscaleIp()` con invalidación por evento

**Impacto:** UX +++ | Rendimiento ++ | Consistencia visual ++

---

### Dimensión 4: Infraestructura Cloud y Despliegue

**Problema:** Fase 2 del plan original (VPS Nakama, Bore propio, base de datos remota) completamente pendiente. Sin CI/CD. Sin empaquetado probado con electron-builder.

**Propuesta:**
1. Dockerizar Nakama + PostgreSQL con docker-compose para VPS
2. Servidor Bore propio Go (o usar el oficial) en el mismo VPS
3. Script de deploy automatizado (rsync + docker-compose up)
4. CI/CD con GitHub Actions: lint → test → build → release
5. electron-builder config para Windows (NSIS), Linux (AppImage), macOS (DMG)

**Impacto:** Despliegue +++ | Automatización +++ | Distribución +++

---

### Dimensión 5: Tests y Calidad

**Problema:** Solo 35 tests de flujos blindados. Sin tests unitarios para contextos React, servicios, o handlers IPC. Sin integración en pipeline.

**Propuesta:**
1. Tests unitarios con Vitest para: AuthContext, SocialContext, ChallengeContext
2. Tests de integración para IPC handlers con `electron-mock-ipc` o similar
3. Tests de snapshots para componentes UI (ChatBox, ChallengeModal, Header)
4. Husky + lint-staged para pre-commit: eslint + prettier + type-check
5. Ampliar test_stable_flows.js con casos edge (timeout, reconexión, errores de red)

**Impacto:** Confiabilidad +++ | Regresión --- | Calidad ++

---

## Matriz de Priorización

| Dimensión | Esfuerzo | Impacto | Urgencia | Prioridad |
|-----------|----------|---------|----------|-----------|
| 1. Arquitectura | 3 (alto) | 3 (alto) | 2 (media) | **Alta** |
| 2. Seguridad | 2 (medio) | 3 (alto) | 3 (alta) | **Crítica** |
| 3. Rendimiento/UX | 2 (medio) | 2 (medio) | 2 (media) | **Media** |
| 4. Infraestructura | 3 (alto) | 3 (alto) | 1 (baja) | **Media** |
| 5. Tests | 2 (medio) | 3 (alto) | 2 (media) | **Alta** |

---

## Roadmap Sugerido

### Fase 0 — Correcciones Críticas (1-2 semanas)
- [ ] Tipar `window.electron` y eliminar `@ts-expect-error`
- [ ] Whitelist de canales IPC en preload
- [ ] Detener health check loop al autenticar
- [ ] Cachear `getLanIp()` / `getTailscaleIp()`

### Fase 1 — Refactor Arquitectura (2-4 semanas)
- [ ] Dividir `index.ts` en módulos
- [ ] Extraer constantes a `config.ts`
- [ ] Separar lógica de red de ChallengeContext a nuevos IPC handlers
- [ ] Consolidar archivos duplicados (preloads)

### Fase 2 — UX y Calidad (2-3 semanas)
- [ ] Sistema de notificaciones toast
- [ ] Spinners/loaders reutilizables
- [ ] Tests unitarios para contextos y servicios
- [ ] Husky + lint-staged

### Fase 3 — Infraestructura Cloud (3-5 semanas)
- [ ] Dockerizar Nakama + PostgreSQL
- [ ] Servidor Bore propio
- [ ] Scripts de deploy
- [ ] CI/CD con GitHub Actions

### Fase 4 — Features Avanzadas (4-8 semanas)
- [ ] Salas privadas con invitación directa
- [ ] Ranking/estadísticas vía Nakama leaderboards
- [ ] Matchmaking automatizado por skill
- [ ] Soporte para múltiples ROMs/juegos
- [ ] Grabación y replay de partidas

---

## Principios Guía

1. **No romper lo que funciona** — Los flujos blindados (host directo, host bore, join directo) NO deben modificarse. Cualquier nuevo flujo debe ser un handler IPC paralelo.
2. **Documentation-first** — Todo cambio significativo debe precederse de actualización en `DOCUMENTACION/`.
3. **UX visible** — Toda operación de red debe mostrar progreso visual al usuario.
4. **Desacoplamiento** — La lógica pesada vive en main process; React solo llama IPC.
5. **Un solo archivo, una sola responsabilidad** — Llevar `index.ts` de 610 líneas a módulos enfocados.

---

## Archivos Clave Identificados para Modificación

| Archivo | Acción |
|---------|--------|
| `client/src/main/index.ts` | Refactorizar en módulos |
| `client/src/preload/index.ts` | Agregar whitelist IPC + tipos |
| `client/src/renderer/App.tsx` | Optimizar health check, lazy loading |
| `client/src/renderer/context/ChallengeContext.tsx` | Mover lógica de red a main |
| `client/electron/preload.ts` | Eliminar (duplicado obsoleto) |
| `backend/local.yml` | Externalizar secrets |
| `client/package.json` | Agregar scripts lint-staged, CI |
