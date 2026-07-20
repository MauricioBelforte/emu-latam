# Sistema de Documentación - Emu Latam

| Carpeta | Componente | Estado | Última Actualización | Tests | Dependencias Principales |
|---------|------------|--------|---------------------|-------|--------------------------|
| 01-Setup-Electron-Vite | Setup inicial del proyecto | ✅ Completado | 2026-06-30 | Manual | Electron, Vite, React, TypeScript |
| 02-Integracion-Nakama | Lanzamiento oculto y Auth | ✅ Completado | 2026-06-30 | Manual (health check) | Nakama, PostgreSQL, Nakama SDK |
| 03-Integracion-Bore | Túneles dinámicos | ✅ Completado | 2026-07-01 | Automatizado (35 tests) | Bore, Node.js TCP |
| 04-Anti-Lag-RunAhead | Mejoras de latencia en RetroArch | ✅ Completado | 2026-07-01 | Manual | RetroArch, netplay_optimized.cfg |
| 05-MITM-to-Transparent-Relay | De MITM relay a forwarder TCP transparente | ✅ Completado | 2026-07-03 | 35/35 | Node.js net module |
| 06-Plan-de-mejoras | Planificación y propuestas de mejoras de LLMs | ✅ Completado | 2026-07-17 | Simulación | Documentación de referencia |
| 06-Plan-de-mejoras/01-Devin-SWE-1.6-Slow | Sistema de logging y monitoreo centralizado | 🔄 Plan inicial | 2026-07-20 | — | Node.js fs, process, React Context |
| 06-Plan-de-mejoras/02-Minimax-M3 | Gestión de procesos, IPC whitelist, toasts, shared utils | 🔄 Plan inicial | 2026-07-15 | — | child_process, IPC, React |
| 06-Plan-de-mejoras/03-Nemotron-3-Ultra | Plan estructural completo: IPC types, React Query, refactor servicios, health checks | 🔄 Plan inicial | 2026-07-20 | — | React Query, Winston, Vitest |
| 06-Plan-de-mejoras/04-Poolside-Laguna-M1 | Auto-host orquestado + persistencia + métricas | 🔄 Plan inicial | 2026-07-17 | — | Electron IPC, File System |
| 06-Plan-de-mejoras/05-Gemini-3.5-Flash | Optimización transporte Tailscale, APIs nativas Nakama, control RA por UDP | 🔄 Plan inicial | 2026-07-05 | — | tailscale CLI, nakama-js, dgram |
| 06-Plan-de-mejoras/06-DeepSeek-V4-Flash-Free | Análisis holístico: strict TS, schemas IPC, CI/CD, testing | 🔄 Plan inicial | 2026-07-09 | — | zod, GitHub Actions, Pino |
| 06-Plan-de-mejoras/07-Stepfun-Step-3.7-Flash | Flujo de retos, anti-lag adaptativo, metrics session, Tailscale fallback | 🔄 Plan inicial | 2026-07-16 | — | Nakama, IPC, Tailscale |
| 07-Integracion-Tailscale | Conexión P2P directa vía Tailscale | 🔄 Plan inicial | 2026-07-03 | — | Tailscale, WireGuard |
| 08-Sistema-Retos | Sistema de retos con selección de método | 🔄 Plan inicial | 2026-07-09 | — | Nakama, Tailscale, Bore |
| 09-Testing | Módulo centralizado de testing automatizado | ✅ Completado | 2026-07-14 | Automatizado (23 tests UX) | Node.js, net, child_process |
| 10-Automatizacion-Conexion | Automatización de conexión P2P sin compartir IP manualmente | 🔄 Plan inicial | 2026-07-15 | — | Nakama Storage, Tailscale, Retos, Matchmaking |
| 11-Posibles-Fallas | Registro incremental de fallas y soluciones | ✅ Completado | 2026-07-16 | — | Referencia (no contiene código) |
| 12-Test-Latencia-Buffer | Laboratorio de pruebas de latencia, buffer y rollback | ✅ Completado | 2026-07-18 | Manual (10 tests) | RetroArch, netplay_optimized.cfg |
| 13-Netplay-Config-Editor | Editor visual de configuración netplay desde Emu Latam | 🔄 Plan inicial | 2026-07-18 | — | RetroArch, netplay_optimized.cfg, IPC |
| 14-Integracion-FBNeo-GGPO | Integración de FBNeo standalone con GGPO (quark:direct) como motor alternativo de netplay | 🔄 Plan inicial | 2026-07-20 | 100 tests planificados (ver 06-Plan-Testings.md) | fightcade-fbneo, VS2015+, quark:direct |
| 15-Sistema-Monitoreo-Diagnostico | Sistema de monitoreo: cleanup manager, dependency validator, resource monitor, logger estructurado, StatusContext, ErrorBanner | ✅ Completado | 2026-07-20 | Build passes | electron, React Context, IPC |
| 16-Notificaciones-Utilidades-IPC | Toast notifications, IPC channels enum + whitelist, port utils, relayConfigStore | 🔄 Plan inicial | 2026-07-20 | — | React, net, userData |
