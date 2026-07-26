# 62-Investigacion-WAN-P2P-UPnP-Firewall-Fix-waitForRelayAck_2026-07-26_18-00-00.md

## Descripción
Investigación de conexión WAN desde datos celulares usando P2P propio + UPnP + Windows Firewall. Se encontraron y corrigieron 4 bugs. Se determinó que el router ISP no aplica UPnP.

---

## Archivos Modificados

### `p2p-module/src/P2PManager.ts`
- **Línea 382:** `waitForRelayAck()` escuchaba `transport.on('message', handler)` —**BUG**— el transporte emite `'raw-message'`. Cambiado a `transport.on('raw-message', handler)`.
- **Línea 294:** Agregado `console.log('[P2P-RELAY] RELAY_REQUEST from ...')` para diagnóstico.

**Código original (bug):**
```typescript
function waitForRelayAck(transport: UDPTransport, timeoutMs: number): Promise<void> {
  transport.on('message', handler);
}
```

**Código corregido:**
```typescript
  transport.on('raw-message', handler);
```

### `client/src/main/services/upnp.ts`
- **Línea 11:** `tryMapPort()` ahora acepta `localIp?: string` y `privatePort?: number`.
- **Línea 16:** `private: privatePort ?? port` — usa puerto bound real si se pasa.

**Antes:**
```typescript
const opts: any = { public: port, private: port, protocol, description, ttl };
```

**Después:**
```typescript
const opts: any = { public: port, private: privatePort ?? port, protocol, description, ttl };
if (localIp) opts.local = localIp;
```

### `client/src/main/p2pBridge.ts`
- **Línea 94:** Extrae IP LAN real (excluye Tailscale `100.x.x.x`).
- **Línea 96:** Extrae `transport.port` (bound real) para UPnP private port.
- **Línea 99:** Firewall usa `localPort` (bound real) en vez de `candidate.publicPort`.

**Antes:**
```typescript
upnpOk = await tryMapPort(candidate.publicPort, 'UDP', 'EmuLatam-P2P', 0);
tryOpenWindowsFirewall(candidate.publicPort, 'UDP', 'EmuLatam-P2P');
```

**Después:**
```typescript
const lanIp = candidate.privateIps?.find((ip: string) => !ip.startsWith('100.'));
const localPort = manager.getTransport().port;
upnpOk = await tryMapPort(candidate.publicPort, 'UDP', 'EmuLatam-P2P', 0, lanIp, localPort);
tryOpenWindowsFirewall(localPort, 'UDP', 'EmuLatam-P2P');
```

### `client/src/App.tsx`
- Reorden de secciones en `joinMode === null`:
  - Antes: Tailscale → P2P fucsia → Bootstrap verde
  - Ahora: Tailscale → Bootstrap verde → P2P fucsia

---

## Bugs Encontrados

| Bug | Síntoma | Solución |
|:---|:---|:---|
| `waitForRelayAck` escucha evento incorrecto | Siempre timeout 8s | `'raw-message'` en vez de `'message'` |
| UPnP local IP = Tailscale | Router reenvía a IP virtual inexistente | Filtrar IPs `100.x.x.x` |
| UPnP private port = STUN port | Router reenvía a puerto no escuchado | Usar `transport.port` |
| Firewall regla para STUN port | Firewall no permite el bound real | Usar `localPort` |

---

## Estado Final
- **LAN:** ✅ Funcional (broadcast + directo)
- **WAN (celular):** ❌ Router ISP no aplica UPnP (puerto cerrado)
- **waitForRelayAck:** ✅ Corregido (si el router cooperara, ahora funcionaría)
- **UPnP + Firewall:** ✅ Configurados correctamente
- **UI:** ✅ Reordenada

## Commits
- `9c64b80` — UPnP local IP = LAN real
- `089d698` — UPnP private port = bound real + Firewall port fix
- `8a8b177` — Fix waitForRelayAck (raw-message)
- `db64d6b` — UI reorder

## Para Retomar
1. Verificar router ISP (UPnP habilitado?)
2. Probar con port forwarding manual
3. Probar en otro ISP
4. Considerar VPS como relay UDP si el ISP no coopera
