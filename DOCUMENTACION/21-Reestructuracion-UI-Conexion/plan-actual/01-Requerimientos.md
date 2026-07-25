# Requerimientos - Reestructuración UI de Conexión (PLAN ACTUAL)

## Problema

La pantalla principal tiene 6 botones en 3 secciones redundantes. Además, el flujo verde "CONEXIÓN VÍA P2P" (bootstrap) **no funciona correctamente para la pelea** — GGPO se queda en "connecting..." y RetroArch da error de red. Esto se debe a que el P2P module usa UDP hole-punching que falla entre NATs estrictos en WAN, y el relay TCP↔UDP con segundo bore (implementado en el módulo 20) está sin probar end-to-end.

## Objetivo (en 2 fases)

### Fase A (Prioritaria): Hacer que el flujo verde funcione
- Debuggear y corregir el relay TCP↔UDP + segundo túnel bore para GGPO/RetroArch en WAN
- Probar end-to-end: host crea conexión verde, guest ingresa código, host envía reto por P2P, la pelea se conecta
- Documentar el estado actual de cada componente

### Fase B: Simplificar la UI
- Unificar el botón fucsia "SALA P2P" y el verde "CONEXIÓN VÍA P2P" en una sola sección "SALA P2P" (verde)
- Pantalla principal: 4 botones (Tailscale crear/unirse, P2P crear/unirse)
- MethodPicker dinámico según `salaType` + `engine`
- Eliminar la sección colapsable "OTROS MÉTODOS DE CONEXIÓN"
- Mantener la funcionalidad completa, solo reorganizar visualmente

### Excluido de Fase B
- No se crean nuevas funcionalidades
- No se modifican IPC handlers del main process
- No se modifica el p2p-module
- El toggle GGPO/RetroArch sigue igual

## Priorización

Fase A > Fase B. No tiene sentido simplificar la UI si el flujo subyacente no funciona.
