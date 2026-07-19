# Plan de Testings - Automatización de Conexión (Plan Inicial)

## Pruebas Unitarias

- [ ] `publishHostInfo()` escribe en Nakama Storage
- [ ] `fetchHostInfoForUser()` lee Storage de un usuario específico
- [ ] Manejo de errores: sin sesión, usuario sin datos

## Pruebas de Integración

- [ ] Host publica IP automáticamente al crear sala
- [ ] Guest descubre IP al conectarse (vía onlineUsers)
- [ ] Auto-completar campo IP en UI

## Casos Límite

- [ ] No hay host activo
- [ ] Múltiples usuarios online
- [ ] Guest se desconecta y reconecta

## Resultados de Ejecución

- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron

## Fecha de Ejecución: — (plan inicial, no ejecutado)
## Estado: PENDIENTE — Plan original de testing, no ejecutado en esta etapa
