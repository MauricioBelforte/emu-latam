# 03 - Diseño - Integración Tailscale (Plan Actual)

## Arquitectura
```
[PC1 - Host]          Tailscale VPN          [PC2 - Guest]
  RA --host :55435  ←────── 100.x.x.x ──────→ RA --connect 100.x.x.x:55435
```

Sin proxy, sin forwarder, sin bore, sin relay.

## Flujo de Conexión

### Host (PC1)
1. Click "HOST TAILSCALE"
2. App detecta IP Tailscale (100.x.x.x)
3. Spawn: `retroarch.exe ... --host --port 55435`
4. App muestra IP al usuario

### Guest (PC2)
1. Usuario pega IP del host
2. Spawn: `retroarch.exe ... --connect 100.x.x.x --port 55435`

## IPC Handlers
| Handler | Args | Acción |
|---------|------|--------|
| `tailscale-host` | (ninguno) | Detecta IP → spawn RA --host → devuelve IP |
| `tailscale-guest` | `{ hostIp }` | Spawn RA --connect |
| `stop-tailscale` | (ninguno) | taskkill retroarch.exe |
