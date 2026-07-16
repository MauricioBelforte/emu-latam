# 04 - Código - Automatización de Conexión (Plan Inicial)

## Estado: ⏳ No implementado aún

Este documento describe el código que se **planea** escribir. Se actualizará cuando se comience la implementación.

## Archivos que se modificarán

| Archivo | Cambio planeado |
|---------|-----------------|
| `client/src/main/index.ts` | Nuevos IPC handlers: `publish-connection-info`, `fetch-connection-info` |
| `client/src/preload/index.ts` | Exponer nuevos handlers via contextBridge (si no usa ya exposición genérica) |
| `client/src/App.tsx` | Auto-completar IP del guest al conectar, publicar IP al crear sala |

## Funciones planeadas

### `publishConnectionInfo(ip, mode)` (index.ts)
- Llama a Nakama REST API (`POST /v2/storage`).
- Guarda `{ ip, mode, timestamp }` en colección `emu_latam`, clave `connection_info`.
- Permiso de lectura: público (2), escritura: solo owner (1).

### `fetchConnectionInfo(hostIpOrUserId)` (index.ts)
- Llama a Nakama REST API (`GET /v2/storage/...`).
- Retorna `{ ip, mode }` si existe, o `null`.

### UI (App.tsx)
- En `handleJoinSession` (o equivalente): después de conectar a Nakama, llamar `fetchConnectionInfo`.
- Si hay datos, auto-completar `tailscaleHostIp` y mostrar mensaje "IP detectada automáticamente".
- Opcional: disparar `handleTailscaleGuest` automáticamente.

## Logs relacionados
- (Pendiente — se creará al implementar)
