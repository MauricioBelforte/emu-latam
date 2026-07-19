# 04 - Código: Automatización de Conexión

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/lib/nakama.ts` | +2 métodos: `publishHostInfo()`, `fetchHostInfoForUser()` |
| `client/src/App.tsx` | + auto-publicación al crear sala + auto-descubrimiento al unirse |

## NakamaService (nakama.ts)

### `publishHostInfo(ip, mode)`
Escribe la IP del host en Nakama Storage con permisos de lectura pública.

```typescript
async publishHostInfo(ip: string, mode: string): Promise<boolean>
```

- **Colección:** `emu_latam_rooms`
- **Key:** `active_host`
- **Valor:** `{ ip, mode, username, userId, timestamp }`
- **Permisos:** `permission_read: 2` (público), `permission_write: 1` (solo owner)
- **Retorna:** `true` si se guardó correctamente, `false` si falla o no hay sesión

### `fetchHostInfoForUser(targetUserId)`
Lee la IP publicada por un usuario específico desde Nakama Storage.

```typescript
async fetchHostInfoForUser(targetUserId: string): Promise<{ ip: string; mode: string; username: string } | null>
```

- Usa `readStorageObjects` con `{ collection: "emu_latam_rooms", key: "active_host", user_id: targetUserId }`
- Retorna `null` si no encuentra datos o si falla la lectura
- El valor se parsea automáticamente (soporta string JSON u objeto)

## App.tsx

### Flujo CREAR SALA (línea ~447)
```typescript
// Después de loginGhost() y get-tailscale-ip:
if (ts.ip) {
  setMyTailscaleIp(ts.ip);
  await nakamaService.publishHostInfo(ts.ip, "tailscale");
}
```

### Auto-descubrimiento del Guest (nuevo useEffect, después de línea 426)
```typescript
useEffect(() => {
  if (!isAuthenticated || isHostingSala || !onlineUsers.length || discoveryDoneRef.current) return;
  const discover = async () => {
    for (const user of onlineUsers) {
      if (user.userId === userId) continue;
      const info = await nakamaService.fetchHostInfoForUser(user.userId);
      if (info && info.ip) {
        discoveryDoneRef.current = true;
        setTailscaleHostIp(info.ip);
        setStatusText(`IP del host detectada automáticamente: ${info.ip}`);
        break;
      }
    }
  };
  discover();
}, [isAuthenticated, isHostingSala, onlineUsers, userId]);
```

### Refresco periódico del Host (línea ~417)
El host re-publica su IP cada 30s (junto con el refresco de Tailscale IP):
```typescript
useEffect(() => {
  if (!isAuthenticated || !isHostingSala) return;
  const refresh = async () => {
    const ts = await (window as any).electron.ipcRenderer.invoke("get-tailscale-ip");
    if (ts.ip) {
      if (ts.ip !== myTailscaleIp) setMyTailscaleIp(ts.ip);
      await nakamaService.publishHostInfo(ts.ip, "tailscale");
    }
  };
  refresh();
  const interval = setInterval(refresh, 30000);
  return () => clearInterval(interval);
}, [isAuthenticated, isHostingSala, myTailscaleIp]);
```

### Control de descubrimiento único
- `discoveryDoneRef` (useRef): evita que el guest intente descubrir la IP múltiples veces
- Se resetea a `false` cuando `isAuthenticated` pasa a `false` (desconexión)
- Se resetea al hacer CREAR SALA

## Flujo Completo

### Host
```
CREAR SALA → loginGhost() → getTailscaleIp() → publishHostInfo(ip, "tailscale")
                                                      ↓
                                              (refresco cada 30s)
```

### Guest
```
UNIRSE A SALA → CONECTAR → loginGhost() → SocialContext.onlineUsers se puebla
                                                ↓
                          useEffect detecta: isAuthenticated=true, !isHostingSala, onlineUsers.length>0
                                                ↓
                          Itera onlineUsers → fetchHostInfoForUser(user.userId)
                                                ↓
                          Si encuentra → setTailscaleHostIp(info.ip) + setStatusText("IP detectada automáticamente")
```

## APIs de Nakama Utilizadas

| API | Propósito |
|-----|-----------|
| `writeStorageObjects` | Host escribe `emu_latam_rooms/active_host` |
| `readStorageObjects` | Guest lee `emu_latam_rooms/active_host` de un userId específico |
