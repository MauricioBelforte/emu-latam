# 03 - Diseño - Integración Tailscale (Plan Inicial)

## Arquitectura
```
[PC1 - Host]          Tailscale VPN          [PC2 - Guest]
  RA --host :55435  ←────── 100.x.x.x ──────→ RA --connect 100.x.x.x:55435
```

Sin proxy, sin forwarder, sin bore, sin relay. Tailscale provee la red virtual.

## Flujo de Conexión

### Host (PC1)
1. Usuario hace click en "HOST TAILSCALE"
2. App detecta IP Tailscale (100.x.x.x) via `os.networkInterfaces()`
3. App spawn: `retroarch.exe -L core.dll rom.zip --host --port 55435 --appendconfig netplay_optimized.cfg`
4. App muestra IP Tailscale al usuario ("Compartí esta IP con tu amigo: 100.x.x.x")
5. waitForPort(55435) para confirmar que RA está listo
6. Al cerrar: taskkill retroarch.exe

### Guest (PC2)
1. Usuario pega la IP del host (100.x.x.x) o la recibe automáticamente
2. App spawn: `retroarch.exe -L core.dll rom.zip --connect 100.x.x.x --port 55435 --appendconfig netplay_optimized.cfg`
3. Al cerrar: taskkill retroarch.exe

## Detección de IP Tailscale
```javascript
function getTailscaleIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.address.startsWith("100.") && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null; // Tailscale no instalado o no conectado
}
```

## IPC Handlers (index.ts) — Nuevos, paralelos, no tocan flujos blindados

| Handler | Args | Acción |
|---------|------|--------|
| `tailscale-host` | (ninguno) | Detecta IP → spawn RA --host → devuelve IP |
| `tailscale-guest` | `{ hostIp }` | Spawn RA --connect hostIp |
| `stop-tailscale` | (ninguno) | taskkill retroarch.exe |

## UI (App.tsx) — Botones nuevos

| Botón | Handler | Estado |
|-------|---------|--------|
| "HOST VÍA TAILSCALE" | `tailscale-host` | `isHostingTailscale` |
| "JOIN VÍA TAILSCALE" | `tailscale-guest` | `isJoiningTailscale` |

- Input de texto para pegar IP del host en modo guest
- Si Tailscale no está instalado (getTailscaleIp() == null), mostrar mensaje con link de descarga
- Spinner mientras se inicia RA
- Botones deshabilitados durante operación
