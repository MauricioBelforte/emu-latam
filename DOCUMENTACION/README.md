# Sistema de Documentación - Emu Latam

| Carpeta | Componente | Estado | Última Actualización | Tests | Dependencias Principales |
|---------|------------|--------|---------------------|-------|--------------------------|
| 01-Setup-Electron-Vite | Setup inicial del proyecto | ✅ Completado | 2026-06-30 | Manual | Electron, Vite, React, TypeScript |
| 02-Integracion-Nakama | Lanzamiento oculto y Auth | ✅ Completado | 2026-06-30 | Manual (health check) | Nakama, PostgreSQL, Nakama SDK |
| 03-Integracion-Bore | Túneles dinámicos | ✅ Completado | 2026-07-01 | Automatizado (35 tests) | Bore, Node.js TCP |
| 04-Anti-Lag-RunAhead | Mejoras de latencia en RetroArch | ✅ Completado | 2026-07-01 | Manual | RetroArch, netplay_optimized.cfg |
| 05-MITM-to-Transparent-Relay | De MITM relay a forwarder TCP transparente | ✅ Completado | 2026-07-03 | 35/35 | Node.js net module |
| 06-Plan-de-mejoras | Planificación y propuestas de mejoras de LLMs | ✅ Completado | 2026-07-17 | Simulación | Documentación de referencia |
| 06-Plan-de-mejoras/poolside laguna-m1 | Auto-host orquestado + persistencia + métricas | 🔄 Plan inicial | 2026-07-17 | — | Electron IPC, File System |
| 07-Integracion-Tailscale | Conexión P2P directa vía Tailscale | 🔄 Plan inicial | 2026-07-03 | — | Tailscale, WireGuard |
| 08-Sistema-Retos | Sistema de retos con selección de método | 🔄 Plan inicial | 2026-07-09 | — | Nakama, Tailscale, Bore |
| 09-Testing | Módulo centralizado de testing automatizado | ✅ Completado | 2026-07-14 | Automatizado (23 tests UX) | Node.js, net, child_process |
| 10-Automatizacion-Conexion | Automatización de conexión P2P sin compartir IP manualmente | 🔄 Plan inicial | 2026-07-15 | — | Nakama Storage, Tailscale, Retos, Matchmaking |
| 11-Posibles-Fallas | Registro incremental de fallas y soluciones | ✅ Completado | 2026-07-16 | — | Referencia (no contiene código) |
| 12-Test-Latencia-Buffer | Laboratorio de pruebas de latencia, buffer y rollback | 🔄 Pruebas activas | 2026-07-16 | Manual | RetroArch, netplay_optimized.cfg |
