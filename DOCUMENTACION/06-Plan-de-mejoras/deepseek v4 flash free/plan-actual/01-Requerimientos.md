# 01-Requerimientos — DeepSeek V4 Flash Free

## Problema

Emu Latam tiene una base funcional sólida con flujos blindados verificados, pero presenta deficiencias en:
- **Mantenibilidad:** Un solo archivo (`index.ts`) con 610+ líneas y 10 responsabilidades
- **Seguridad:** IPC sin restricciones, comandos shell sin sanitizar, secrets en texto plano
- **UX:** Health check loop permanente, sin notificaciones, sin spinners consistentes
- **Calidad:** Solo 35 tests de integración, sin tests unitarios, sin CI/CD
- **Despliegue:** Fase 2 (VPS, Docker, CI/CD) completamente pendiente
- **Tipado:** `window.electron` sin tipos, 6+ `@ts-expect-error` en renderer

## Objetivos

1. **Refactorizar la arquitectura** del main process en módulos independientes y testeables
2. **Elevar la seguridad** mediante validación de canales IPC, sanitización y tipado fuerte
3. **Optimizar rendimiento y UX** con lazy loading, health check inteligente y notificaciones
4. **Establecer infraestructura cloud** (VPS Nakama + Bore propio) con CI/CD automatizado
5. **Ampliar cobertura de tests** a unitarios, integración y componentes UI

## Alcance

### Incluye
- Refactor completo de `client/src/main/index.ts` en módulos separados
- Tipado de `window.electron` con interfaces TypeScript
- Whitelist de canales IPC en preload
- Sistema de notificaciones toast
- Componentes reutilizables de spinner/loader
- Cacheo de IPs de red
- Dockerización de Nakama + PostgreSQL
- Servidor Bore propio
- CI/CD con GitHub Actions
- Tests unitarios con Vitest para contextos y servicios
- Husky + lint-staged para pre-commit

### Excluye
- Modificación de flujos blindados (host directo, host bore manual, join directo)
- Migración a otro framework UI (mantener styled-components + React)
- Soporte para juegos adicionales más allá de KOF '98 (decisión de producto)
- Reescritura del backend Nakama (solo dockerización)
- Interfaz móvil o web (Electron solo desktop)

## Restricciones

1. **No modificar flujos blindados** — Los handlers `launch-game`, `start-relay-tunnel` (V1) y sus flujos asociados están verificados y no deben alterarse
2. **Documentation-first** — Todo cambio debe ir precedido de actualización en `DOCUMENTACION/`
3. **UX visible obligatorio** — Toda operación de red debe mostrar progreso visual
4. **Separación procesos** — Lógica pesada en main process, React solo llama IPC
5. **Compatibilidad Windows** — El proyecto targetea Windows, las soluciones deben ser compatibles
6. **RetroArch como emulador** — No hay planes de migrar a otro emulador
