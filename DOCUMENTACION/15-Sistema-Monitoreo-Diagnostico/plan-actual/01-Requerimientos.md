# Requerimientos: Sistema de Monitoreo y Diagnóstico

## Problema
Emu Latam carece de visibilidad sobre el estado de sus servicios internos (Nakama, Bore, RetroArch). Cuando algo falla, los errores van solo a console.log sin estructura, no hay monitoreo de recursos (CPU/memoria), no hay validación de dependencias al inicio, y la limpieza de procesos al cerrar la app es manual e incompleta.

## Objetivo
Implementar un sistema centralizado de monitoreo y diagnóstico que incluya:
- Logger estructurado con niveles (INFO/WARN/ERROR/DEBUG) y rotación por tamaño
- Monitoreo de recursos (CPU, memoria, uptime) de los procesos hijos
- Validación de dependencias al inicio (binarios, puertos, archivos)
- Gestión de limpieza (cleanup) de procesos al cerrar la app
- Contexto de estado en React con polling periódico
- Banner de errores en la UI

## Alcance
- Crear módulo `cleanupManager.ts` para registro centralizado de funciones de limpieza
- Crear módulo `dependencyValidator.ts` para validar binarios/puertos/archivos al inicio
- Crear módulo `resourceMonitor.ts` para monitoreo de CPU/memoria/uptime
- Crear contexto `StatusContext.tsx` en React con polling al main process
- Crear componente `ErrorBanner.tsx` para mostrar errores en la UI
- Agregar IPC handlers: `get-status`, `get-metrics`, `validate-dependencies`
- Exponer nuevos handlers en preload

## Fuera de alcance
- Modificar el logger existente (console.log interception en index.ts) — se mantiene como está
- Modificar flujos estables de RetroArch, Bore o Nakama (AGENTS.md §14-15)
- Reemplazar el sistema de logging por Winston/Pino — se mantiene el sistema actual con mejoras
- Agregar UI de métricas en tiempo real (solo contexto interno, sin panel visible)

## Restricciones
- Los nuevos módulos deben ser independientes y no romper flujos existentes
- El polling de StatusContext no debe exceder 1 request cada 2s
- El monitoreo de recursos debe tener overhead mínimo (< 1ms por ciclo)
- La limpieza debe ejecutarse en `before-quit` y ser idempotente
- Los IPC handlers nuevos deben agregarse sin modificar handlers existentes

## Criterios de aceptación
1. `cleanupManager` registra y ejecuta N funciones de cleanup secuencialmente
2. `dependencyValidator` detecta si Nakama, Bore, RetroArch existen antes de usarlos
3. `resourceMonitor` expone métricas de memoria, uptime y PIDs activos
4. StatusContext en React expone estado de servicios con polling automático
5. ErrorBanner muestra errores con auto-dismiss a los 5s
6. Todos los IPC handlers responden sin errores
7. `npm run build` compila sin errores tras los cambios
