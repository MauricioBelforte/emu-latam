# Plan de Testings - Automatización de Conexión

## Pruebas Unitarias

- [x] `publishHostInfo()` escribe en Nakama Storage correctamente
- [x] `fetchHostInfoForUser()` lee Storage de un usuario específico
- [x] `publishHostInfo()` retorna `false` si no hay sesión activa
- [x] `fetchHostInfoForUser()` retorna `null` si el usuario no tiene datos
- [x] `publishHostInfo()` guarda IP, mode, username, userId y timestamp

## Pruebas de Integración (Host)

- [x] Al crear sala, se publica IP automáticamente en Storage
- [x] La IP se re-publica cada 30s junto con el refresco de Tailscale IP
- [x] Si la IP cambia, se actualiza en Storage
- [x] `discoveryDoneRef` se resetea al crear sala

## Pruebas de Integración (Guest)

- [x] Al conectar a Nakama remoto, se itera onlineUsers
- [x] Se ignora el propio userId en la búsqueda
- [x] Se lee Storage del host y se obtiene la IP
- [x] El campo `tailscaleHostIp` se auto-completa con la IP detectada
- [x] StatusText muestra "IP del host detectada automáticamente"
- [x] `discoveryDoneRef` previene múltiples descubrimientos
- [x] El descubrimiento se resetea al desconectarse

## Casos Límite

- [x] No hay host activo → no se auto-completa nada
- [x] Múltiples usuarios online → se encuentra el que tiene `active_host`
- [x] Nakama Storage sin datos → `fetchHostInfoForUser` retorna null
- [x] Guest se desconecta y reconecta → discovery se re-ejecuta
- [x] Host sin Tailscale → no se publica info (solo si `ts.ip` existe)
- [x] Host con IP Tailscale que cambia → se actualiza en Storage (cada 30s)

## Resultados de Ejecución

- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron

## Fecha de Ejecución: — (ver 07-Resultados-Testings.md)
## Estado: EJECUTADO — Ver resultados detallados en `07-Resultados-Testings.md`
