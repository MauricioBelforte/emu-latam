# 03 - Diseño del Sistema P2P Propio (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-26
> **Versión:** 1.3
> **Cambios:** Documentación de la integración UPnP + Firewall. Estado real de WAN. Reorden de UI (Tailscale → Bootstrap → P2P fucsia).

---

## 1. Arquitectura General

### Componentes Existente en `p2p-module/`

```
p2p-module/src/
├── index.ts              ← Entry point
├── protocol/
│   ├── types.ts          ← Tipos (NatType, PacketType, PeerCandidate, etc.)
│   └── packet.ts         ← encode/decode binario
├── UDPTransport.ts       ← Wrapper dgram + bind(0)
├── NatDetector.ts        ← STUN en 2 servidores Google, clasifica Cone/Symmetric
├── HolePuncher.ts        ← 3 intentos con backoff (400/800/1600ms)
├── RelayServer.ts        ← Relay UDP, socket dedicado por guest
├── KeepAliveService.ts   ← Keepalive 18s, 3 strikes (~54s)
├── StateMachine.ts       ← Máquina de estados
└── P2PManager.ts         ← Orquestador: host/guest flows + WAN manual + RELAY_REQUEST/ACK
```

### Integración Electron

```
client/src/main/
├── p2pBridge.ts          ← Bridge P2P: handleP2PHost, handleP2PGuest, handleP2PGuestWan
│                           Incluye UPnP + Windows Firewall + forwarder management
├── ggpoP2PBridge.ts      ← Bridge GGPO+P2P (módulo 19, no tocar)
├── services/
│   └── upnp.ts           ← tryMapPort, tryUnmapPort, getExternalIp, cleanupAllMappings
└── index.ts              ← IPC handlers registrados
```

### UI (React)

```
client/src/App.tsx
├── Modo autenticado: Sala creada con IP pública + UPnP status
├── Crear Sala P2P → handleP2PHost (UPnP + Firewall + broadcast)
├── Unirse Sala P2P → broadcast LAN o input manual IP:puerto
├── Orden de secciones: 1. Tailscale 2. Bootstrap verde 3. P2P fucsia
```

---

## 2. Flujo WAN Manual (Implementado)

### Host
```
[CREAR SALA P2P]
  → P2PManager.startHost()
    → UDPTransport.bind(0) → puerto bound: localPort
    → NatDetector.detect (STUN) → publicIp + publicPort + natType
    → Crea localCandidate con { publicIp, publicPort, privateIps, natType }
  → UPnP: tryMapPort(publicPort, 'UDP', 'EmuLatam-P2P', 0, lanIp, localPort)
    → Router acepta mapping (publicPort → lanIp:localPort)
  → Firewall: tryOpenWindowsFirewall(localPort, 'UDP', 'EmuLatam-P2P')
    → netsh crea regla de entrada para localPort
  → UI muestra: IP pública + IP LAN + estado UPnP (✅/⚠️)
  → Compartir IP:puerto con amigo
```

### Guest (WAN manual)
```
[UNIRSE A SALA → no hay broadcast → input manual IP:puerto]
  → Parsear "198.12.40.29:53084" → { ip, port }
  → Construir PeerCandidate mínimo: { publicIp, publicPort, privateIps:[], ... }
  → P2PManager.startJoinWan(candidate)
    → UDPTransport.bind(0)
    → NatDetector.detect (STUN) → publicIp + publicPort + natType
    → Crea localCandidate
    → Intenta hole punching (3 rounds: 400/800/1600ms)
      ├── ✅ Éxito → direct_connected → modo directo
      └── ❌ Fracaso → sendRelayRequest()
        → Envía RELAY_REQUEST a hostCandidate.publicIp:publicPort
        → waitForRelayAck(transport, 8000)
          ├── ✅ Recibe RELAY_ACK → relay_connected
          └── ❌ Timeout 8s → Error("RELAY_ACK timeout")
  → Si conecta: crea forwarder local para RetroArch
```

### Host recibe RELAY_REQUEST
```
P2PManager.handlePacket(RELAY_REQUEST)
  → if (role !== 'host') break
  → Log: [P2P-RELAY] RELAY_REQUEST from rinfo.address:rinfo.port
  → guestId = `wan-${rinfo.address}-${rinfo.port}`
  → remoteAddr = rinfo.address, remotePort = rinfo.port
  → relayToken = Math.random() * 65535
  → relay.registerPeer(guestId, relayToken)
  → Envía RELAY_ACK a rinfo.address:rinfo.port
  → callbacks.onConnected(guestId, 'relay')
  → emitStatus(relay_connected)
```

---

## 3. Protocolo de Paquetes

### Packet Types

| Type | Code | Direction | Payload |
|:---|:---:|:---|:---|
| PUNCH | 0x01 | bidireccional | vacío |
| PUNCH_ACK | 0x02 | bidireccional | vacío |
| KEEPALIVE | 0x03 | bidireccional | vacío |
| KEEPALIVE_ACK | 0x04 | bidireccional | vacío |
| RELAY_DATA | 0x05 | bidireccional | datos de juego |
| DISCONNECT | 0x06 | bidireccional | vacío |
| RELAY_REQUEST | 0x07 | guest → host | sessionToken(2) |
| RELAY_ACK | 0x08 | host → guest | sessionToken(2) |

### Header (4 bytes)
```
version(1) | type(1) | sessionToken(2) | payload(N)
```

---

## 4. UPnP + Windows Firewall

### UPnP (`client/src/main/services/upnp.ts`)

```typescript
async function tryMapPort(
  port: number,            // Puerto público (STUN)
  protocol: 'UDP' | 'TCP',
  description: string,     // "EmuLatam-P2P"
  ttl: number = 0,         // 0 = permanente
  localIp?: string,        // IP LAN real (192.168.x.x, excluye 100.x.x.x)
  privatePort?: number     // Puerto bound real del transporte (no el STUN)
): Promise<boolean>
```

**Importante:** El router puede aceptar el mapping (`return true`) pero no aplicarlo. Verificar con port checker externo.

### Windows Firewall (`p2pBridge.ts`)

```typescript
function tryOpenWindowsFirewall(port: number, protocol: string, name: string) {
  execSync(`netsh advfirewall firewall add rule name="${name}" dir=in action=allow protocol=${protocol} localport=${port}`, ...);
}
```

- Requiere admin. Si no hay admin, falla silenciosamente (try/catch).
- La regla se crea para el `localPort` (bound real), no el puerto STUN.

---

## 5. Manejo de Conexión desde Datos Móviles

- El guest en 4G/5G solo necesita **salida UDP** (outbound)
- Las redes móviles típicamente tienen NAT simétrica → hole punching falla
- Si falla punching → RELAY_REQUEST → host reenvía datos → funciona
- El host necesita **puerto UDP abierto** (UPnP o forwarding manual en el router)
- **Problema real:** El router del ISP no aplica UPnP a pesar de reportar éxito
- **Solución actual:** Mensaje en UI: "Si no funciona, usá Tailscale o Sala Pública"

---

## 6. Arquitectura de UI (Orden de Botones)

A partir del 26-Jul-2026, el orden en la ventana principal (no autenticado) es:

1. **SALA TAILSCALE** (accent primary) — Primero, recomendado
2. **CONEXIÓN VÍA P2P (SIN TAILSCALE)** (accent #0f0, verde) — Bootstrap público, en el medio
3. **SALA P2P (SIN TERCEROS)** (accent #f0f, fucsia) — Al fondo, experimental

---

## 7. Criterios de Aceptación WAN

| ID | Escenario | Éxito |
|:---|:---|:---|
| CA-WAN-01 | Host con puerto abierto + guest en WiFi → hole punch directo ≤ 3s | ✅ |
| CA-WAN-02 | Host con puerto abierto + guest en 4G → relay fallback ≤ 5s | ❌ (router no aplica UPnP) |
| CA-WAN-03 | Host sin puerto abierto + guest en 4G → falla con mensaje claro | ⚠️ |
| CA-WAN-04 | Misma LAN + broadcast → sigue funcionando (sin cambios) | ✅ |
| CA-WAN-05 | No rompe Tailscale ni bootstrap verde | ✅ |

---

## 8. Estado de Conexiones Actual (Jul-2026)

| Método | Estado | Funciona en |
|:---|:---|:---|
| **Tailscale** | ✅ | Cualquier red (WAN/LAN) |
| **P2P Propio LAN** (broadcast) | ✅ | Misma red local |
| **P2P Propio WAN** (IP manual) | ❌ | Solo si router aplica UPnP |
| **Bore (túnel público)** | ⚠️ | Depende de bore.pub |
| **Bootstrap verde** (Sala Pública) | ✅ | Con bore + VPS |

---

## 9. Recomendaciones para Retomar

Si se retoma este módulo en el futuro:

1. **Verificar el router del ISP:** Entrar a 192.168.1.1, verificar que UPnP esté habilitado. Algunos routers tienen UPnP desactivado por defecto.
2. **Probar con forwarding manual:** Configurar port forwarding en el router para el puerto P2P (en vez de UPnP).
3. **Usar un VPS como relay:** Si el ISP bloquea puertos entrantes, la única solución es un relay externo.
4. **Test con waitForRelayAck ya corregido:** El bug del evento `message` vs `raw-message` podría haber sido la razón por la que el guest nunca recibía RELAY_ACK incluso si el paquete llegaba al host.
5. **Si el bug de waitForRelayAck era el único problema** y el UPnP realmente funciona en otro router, la conexión WAN debería funcionar sin más cambios.
