# Requerimientos: Notificaciones, Utilidades Compartidas y Seguridad IPC

## Problema
Emu Latam carece de feedback visual para acciones del usuario (éxito/error/info). Los errores se muestran en consola o via ErrorBanner (solo para errores del main process), pero acciones exitosas como "Sala creada", "IP copiada", "Conexión establecida" no tienen confirmación visual. Además, los canales IPC se usan como strings literales sin tipado ni validación, y hay código duplicado en helpers de red/puertos.

## Objetivo
Implementar un sistema de notificaciones toast, tipar y validar los canales IPC, y centralizar utilidades compartidas de red/puertos y persistencia de relay config.

## Alcance
- Sistema de notificaciones toast (info/success/warning/error) con cola FIFO, max 3 visibles, auto-dismiss
- Enum `IPC_CHANNELS` para reemplazar strings literales en main process
- Whitelist de canales IPC en preload (rechazar canales no registrados)
- Utilidades compartidas: `isPortInUse()`, `assertPortFree()`
- `relayConfigStore`: persistencia de relay URL en `userData` con fallback a legacy

## Fuera de alcance
- ProcessRegistry (ya cubierto por módulo 15 CleanupManager)
- Refactor de boreCore (toca flujos estables de AGENTS.md §15)
- Hook `useHostingActions` (refactor sin valor funcional)
- Reemplazar el sistema de logging (ya cubierto por módulo 15)

## Restricciones
- No modificar handlers IPC existentes (solo agregar el enum como referencia)
- Los toasts deben tener max 3 visibles para no saturar la UI
- La whitelist en preload debe rechazar canales desconocidos sin romper los existentes
- relayConfigStore debe mantener compatibilidad con legacy `active_relay.txt`

## Criterios de aceptación
1. Toast aparece cuando se invoca `show()` y desaparece después de N ms
2. Más de 3 toasts simultáneos encola los viejos
3. IPC channels tienen un enum centralizado con todos los canales existentes
4. Preload rechaza canales no listados en la whitelist con error legible
5. `assertPortFree(port)` detecta puertos ocupados correctamente
6. `relayConfigStore.read()` funciona con nuevo formato y fallback a legacy
