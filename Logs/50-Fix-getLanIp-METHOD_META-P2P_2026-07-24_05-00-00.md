# Log 50 — Fix getLanIp + METHOD_META P2P (24-Jul-2026)

## Cambios Realizados

### 1. Fix: getLanIp() excluye IPs Tailscale
**Archivo:** `client/src/main/index.ts` (líneas 286-300)

**Código original:**
```typescript
function getLanIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}
```

**Problema:** Retornaba la primera IP no-interna, que podía ser Tailscale (100.x.x.x). El broadcast UDP de discovery.ts enviaba la IP de Tailscale en vez de la LAN real.

**Código nuevo:**
```typescript
function getLanIp(): string {
  const nets = os.networkInterfaces();
  let fallback = "127.0.0.1";
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === "IPv4" && !net.internal) {
        const addr = net.address;
        if (!addr.startsWith("100.")) return addr;
        if (fallback === "127.0.0.1") fallback = addr;
      }
    }
  }
  return fallback;
}
```

### 2. Fix: METHOD_META sin entrada "p2p"
**Archivo:** `client/src/components/ui/ChallengeModal.tsx` (línea 174)

**Problema:** `METHOD_META["p2p"]` era undefined al recibir un reto con método "p2p", causando `Cannot read properties of undefined (reading 'accent')`.

**Solución:** Se agregó:
```typescript
p2p: { label: "P2P Automático", accent: "#f0f" },
```

### 3. Documentación actualizada
- `1-DOCUMENTO-DE-ESPECIFICACIONES-ACTUAL.md` — agregada sección P2P Propio
- `2-DOCUMENTO-DISENO-ACTUAL.md` — agregados flujos P2P y getLanIp()
- `3-DOCUMENTO-TAREAS-ACTUAL.md` — marcada integración retos P2P como completada
- `4-DOCUMENTO-EJECUCION-ACTUAL.md` — agregadas secciones discovery, getLanIp, METHOD_META
- `18-P2P-Propio/plan-actual/05-Checklist.md` — agregadas tareas completadas post-MVP

## Tests Ejecutados
- ✅ `p2p-module`: 29/29 tests pasaron
- ✅ `test:stable`: 50/51 tests pasaron (1 fallo conocido: cfg netplay_check_frames)
- ✅ `tsc --noEmit`: Sin errores de TypeScript

## Commits
- `0a7ea73` — Se corrigió getLanIp() para excluir IPs de Tailscale (100.x.x.x)
- `6c87396` — Se agregó 'p2p' a METHOD_META en ChallengeModal

## Estado Actual
- El broadcast UDP ahora envía la IP LAN real (192.168.x.x), no la de Tailscale
- El ChallengeModal ya no crashea al recibir retos con método "p2p"
- Pendiente: probar P2P entre PCs en WAN
