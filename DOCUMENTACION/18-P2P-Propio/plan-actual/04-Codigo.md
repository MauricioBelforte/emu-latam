# 04 - Especificación de Código (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-26
> **Versión:** 1.2
> **Cambios:** Archivos involucrados en UPnP + Firewall + fix waitForRelayAck + UI reorder.

---

## 1. Archivos Modificados en esta Sesión

### 1.1 `p2p-module/src/P2PManager.ts` — Fix CRÍTICO

**Bug:** `waitForRelayAck()` escuchaba `transport.on('message', handler)` pero el transporte emite `'raw-message'`.

**Línea 382 (antes):**
```typescript
transport.on('message', handler);
```

**Línea 382 (después):**
```typescript
transport.on('raw-message', handler);
```

**Impacto:** `waitForRelayAck()` NUNCA recibía el evento, siempre timeout a los 8s. Este es el bug que causaba `RELAY_ACK timeout` en todas las conexiones WAN.

**Además:** Se agregó log `[P2P-RELAY] RELAY_REQUEST from {ip}:{port}` en el handler `RELAY_REQUEST` (línea 294) para diagnosticar si el host recibe paquetes del guest.

**Funciones clave:**
- `handlePacket()` (línea 272): maneja todos los tipos de paquete. Caso `RELAY_REQUEST` (línea 292) registra peer + envía RELAY_ACK. Caso `RELAY_ACK` (línea 307) confirma relay en guest.
- `startJoinWan()` (línea 191): flujo WAN completo: hole punch → fallback → RELAY_REQUEST → waitForRelayAck.
- `sendRelayRequest()` (línea 324): envía RELAY_REQUEST al host.
- `waitForRelayAck()` (línea 367): helper que espera RELAY_ACK con timeout 8s.

### 1.2 `client/src/main/services/upnp.ts` — UPnP con IP y puerto privado

**Antes:**
```typescript
export async function tryMapPort(port, protocol, description, ttl=0, localIp?): Promise<boolean> {
  const opts = { public: port, private: port, protocol, description, ttl };
  if (localIp) opts.local = localIp;
  ...
}
```

**Después:**
```typescript
export async function tryMapPort(port, protocol, description, ttl=0, localIp?, privatePort?): Promise<boolean> {
  const opts = { public: port, private: privatePort ?? port, protocol, description, ttl };
  if (localIp) opts.local = localIp;
  ...
}
```

**Parámetros:**
- `port`: Puerto público (detectado por STUN) — se abre en el router
- `privatePort`: Puerto local bound del transporte (diferente del STUN si el NAT no preserva puertos)
- `localIp`: IP LAN real (192.168.x.x, excluye Tailscale 100.x.x.x)

### 1.3 `client/src/main/p2pBridge.ts` — Integración UPnP + Firewall

**handleP2PHost()** (línea 69):
```typescript
// UPnP
const lanIp = candidate.privateIps?.find((ip: string) => !ip.startsWith('100.'));
const localPort = manager.getTransport().port;  // bound real del transporte
upnpOk = await tryMapPort(candidate.publicPort, 'UDP', 'EmuLatam-P2P', 0, lanIp, localPort);
tryOpenWindowsFirewall(localPort, 'UDP', 'EmuLatam-P2P');  // Firewall para puerto bound real
```

**handleP2PGuestWan()** (línea 171): Crea P2PManager con hostCandidate desde IP:puerto manual, llama `startJoinWan()`, crea forwarder.

**tryOpenWindowsFirewall()** (línea 8):
```typescript
function tryOpenWindowsFirewall(port, protocol, name) {
  execSync(`netsh advfirewall firewall add rule name="${name}" dir=in action=allow protocol=${protocol} localport=${port}`, ...);
}
```

### 1.4 `client/src/App.tsx` — UI Reorder

**Orden de secciones en `joinMode === null`:**
1. Sala Tailscale (accent primary) — primero
2. Conexión Vía P2P verde (accent #0f0) — segundo
3. Sala P2P fucsia (accent #f0f) — tercero

**Vista de Sala Creada:** Muestra IP pública + IP LAN + estado UPnP ✅/⚠️ + botón COPIAR + CERRAR SALA.

**Vista Guest WAN:** Cuando no hay broadcast LAN, muestra input IP:puerto + CONECTAR + VOLVER.

### 1.5 `client/src/main/services/ipcChannels.ts`

Agregado: `P2P_GUEST_WAN = "p2p-guest-wan"`

### 1.6 `client/src/main/index.ts`

Registrado: IPC handler `p2p-guest-wan` importando `handleP2PGuestWan` de `p2pBridge.ts`.

---

## 2. Archivos Nuevos

### 2.1 `client/src/main/services/upnp.ts` (NUEVO — 25-Jul-2026)

Módulo UPnP completo:
- `tryMapPort(port, protocol, description, ttl?, localIp?, privatePort?)` → abre puerto en router
- `tryUnmapPort(port, protocol)` → cierra puerto en router
- `getExternalIp()` → consulta IP pública vía UPnP
- `cleanupAllMappings()` → cierra todos los mappings registrados

### 2.2 `client/src/main/services/upnp.ts` modificado con `privatePort` (26-Jul-2026)

---

## 3. Dependencias Agregadas

```json
{
  "dependencies": {
    "nat-upnp": "^1.1.1"
  }
}
```

Instalado el 25-Jul-2026 para abrir puertos automáticamente en el router vía UPnP.

---

## 4. Funciones Clave por Archivo

### `p2p-module/src/P2PManager.ts`

| Función | Línea | Propósito |
|:---|:---:|:---|
| `startHost()` | 77 | Inicia como host: bind + STUN + candidate |
| `startJoinWan(hostCandidate)` | 191 | Guest WAN: hole punch → RELAY_REQUEST → espera ACK |
| `sendRelayRequest()` | 324 | Envía RELAY_REQUEST al host |
| `waitForRelayAck()` | 367 | Espera RELAY_ACK con timeout 8s (⚠️ fix: 'raw-message' no 'message') |
| `handlePacket()` | 272 | Dispatcher de paquetes. Maneja RELAY_REQUEST (host) y RELAY_ACK (guest) |

### `client/src/main/p2pBridge.ts`

| Función | Línea | Propósito |
|:---|:---:|:---|
| `handleP2PHost()` | 69 | Host: UPnP + Firewall + broadcast + candidate |
| `handleP2PGuest()` | 120 | Guest: broadcast LAN + Nakama candidate |
| `handleP2PGuestWan(hostAddress)` | 171 | Guest WAN manual: IP:puerto → startJoinWan |
| `handleP2PDisconnect()` | 239 | Cleanup: cierra forwarder + UPnP unmapping |
| `tryOpenWindowsFirewall()` | 8 | Crea regla Windows Firewall para puerto |

### `client/src/main/services/upnp.ts`

| Función | Línea | Propósito |
|:---|:---:|:---|
| `tryMapPort()` | 11 | Mapping UPnP en router |
| `tryUnmapPort()` | 34 | Remove UPnP mapping |
| `getExternalIp()` | 52 | Consulta IP pública vía UPnP IGD |
| `cleanupAllMappings()` | 64 | Cleanup completo al salir |

---

## 5. Logs Relevantes

### Host (éxito)
```
[P2P-HOST] NAT: cone → 198.12.40.29:53084
[UPnP] Puerto 53084/UDP abierto: EmuLatam-P2P (local: 192.168.1.14) (private: 53084)
[FIREWALL] Regla creada: EmuLatam-P2P (53084/UDP)
[P2P-HOST] Started on port 53084, local IPs: 100.98.148.11,192.168.1.14, UPnP: OK
```

### Guest (error, antes del fix)
```
App.tsx:1211 Uncaught Error: Error invoking remote method 'p2p-guest-wan': Error: RELAY_ACK timeout
```

### Host cuando guest conecta (después del fix, si el router coopera)
```
[P2P-RELAY] RELAY_REQUEST from <guest_ip>:<guest_port>
```

---

## 6. Commits Relacionados

| Commit | Fecha | Descripción |
|:---|:---|:---|
| `9c64b80` | 26-Jul | UPnP: local IP usa LAN real (no Tailscale) |
| `089d698` | 26-Jul | UPnP: private port = bound real del transporte |
| `8a8b177` | 26-Jul | **Fix crítico**: waitForRelayAck escucha 'raw-message' |
| `db64d6b` | 26-Jul | UI: reorden de botones (Tailscale → Bootstrap → P2P fucsia) |
