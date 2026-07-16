# 03 - Diseño - Automatización de Conexión (Plan Inicial)

## Arquitectura propuesta: Solución A (Storage de Nakama)

```
┌────────────────────┐         ┌────────────────────┐
│       PC1 (HOST)   │         │      PC2 (GUEST)   │
│                    │         │                    │
│  CREAR SALA        │         │  CONECTAR          │
│    ↓               │         │    ↓               │
│  getTailscaleIp()  │         │  Leer Storage      │
│    ↓               │         │  Nakama: GET       │
│  Guardar Storage   │         │  host_ip           │
│  Nakama: POST      │         │    ↓               │
│  { ip, mode, ts }  │◄───►    │  Auto-completar IP │
│                    │ Nakama  │  + JOIN automático │
└────────────────────┘         └────────────────────┘
```

## Flujo detallado

### Host (PC1)
1. Usuario clickea **CREAR SALA**.
2. App inicia Nakama local, loguea ghost.
3. `getTailscaleIp()` detecta IP de Tailscale.
4. `POST /v2/storage` guarda `{ ip: "100.x.x.x", mode: "tailscale", modeDetailed: "host", timestamp: ... }`.
5. La IP se muestra en el banner SALA CREADA (como ahora).
6. Si la IP cambia (auto-refresh cada 30s), se actualiza el Storage automáticamente.

### Guest (PC2)
1. Usuario abre la app.
2. Click **UNIRSE A SALA**.
3. Ingresa la IP del host manualmente (o selecciona de una lista de hosts disponibles).
4. `GET /v2/storage` con `user_id = hostUserId` → obtiene `{ ip, mode }`.
5. Auto-completa el campo **IP del servidor**.
6. Auto-completa el campo **JOIN VÍA TAILSCALE**.
7. Opcional: dispara JOIN automáticamente si `mode === "tailscale"`.

## APIs de Nakama

### Write storage (host)
```
POST /v2/storage
Body: [{
  "collection": "emu_latam",
  "key": "connection_info",
  "value": "{\"ip\":\"100.98.148.11\",\"mode\":\"tailscale\",\"modeDetailed\":\"host\"}",
  "permission_read": 2,
  "permission_write": 1
}]
```

### Read storage (guest)
```
GET /v2/storage/emu_latam/connection_info?user_id={hostUserId}
Response: { "value": "{\"ip\":\"100.98.148.11\",\"mode\":\"tailscale\",\"modeDetailed\":\"host\"}" }
```

## Modificaciones necesarias

### index.ts (main process)
- Nuevo IPC handler: `publish-connection-info` — llama a Nakama REST API para escribir storage.
- Nuevo IPC handler: `fetch-connection-info` — llama a Nakama REST API para leer storage.
- `hostUserId` debe ser accesible (el userId del ghost logueado en la PC host).

### App.tsx (renderer)
- Al CREAR SALA exitoso → llamar `publish-connection-info`.
- Al CONECTAR exitoso (guest) → llamar `fetch-connection-info` del host, auto-completar IP.

### preload/index.ts
- Exponer los nuevos handlers vía contextBridge.

## Variables clave
- `hostUserId`: el `userId` de Nakama del host. Debe ser conocido por el guest.
  - Simplificación: el guest ingresa manualmente la IP (como ahora), y la app usa esa IP para buscar el storage. Pero necesitamos el `userId`, no la IP.
  - Alternativa: usar una clave fija (sin user_id) y asumir que solo hay un host activo.
  - Alternativa 2: el host guarda en el storage con `permission_read = 2` (lectura pública) y el guest puede leer sin userId.

### Simplificación máxima
Si usamos `permission_read = 2` (público), el guest puede leer el storage sin conocer el userId:
```
GET /v2/storage/emu_latam/connection_info
```
Esto requiere que solo haya un host activo a la vez (o usar una clave por sala).

### Opción aún más simple
No usar Storage de Nakama directamente. En vez de eso, usar el sistema de **presencia** de Nakama:
- El host se une a un chat/room con nombre fijo (ej: `"sala_activa"`).
- El guest se une al mismo chat y recibe un mensaje de presencia del host con la IP.
- El guest extrae la IP del mensaje de presencia.
