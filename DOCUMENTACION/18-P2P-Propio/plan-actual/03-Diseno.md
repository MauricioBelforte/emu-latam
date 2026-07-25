# 03 - Diseño del Sistema P2P Propio (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-25
> **Versión:** 1.2

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
└── P2PManager.ts         ← Orquestador: host/guest flows
```

### Integración Electron

```
client/src/main/
├── p2pBridge.ts          ← Bridge P2P para LAN (broadcast) y WAN (IP manual)
├── ggpoP2PBridge.ts      ← Bridge GGPO+P2P (módulo 19, no tocar)
└── index.ts              ← IPC handlers
```

---

## 2. Flujo WAN Manual (NUEVO)

### Host
```
[CREAR SALA P2P]
  → P2PManager.startHost()
    → UDPTransport.bind(0)
    → NatDetector.detect (STUN) → publicIp + publicPort + natType
    → Crea localCandidate
  → Muestra en UI: ${publicIp}:${publicPort}
  → Compartir IP con amigo (WhatsApp/Discord)
```

### Guest
```
[Ingresar IP:puerto del host]
  → Construir PeerCandidate mínimo: { publicIp, publicPort }
  → P2PManager.startJoin(candidate)
    → UDPTransport.bind(0)
    → NatDetector.detect (STUN) → publicIp + publicPort + natType
    → Intenta hole punching (3 rounds: 400/800/1600ms)
      ├── ✅ Éxito → direct_connected → modo directo
      └── ❌ Fracaso → relay_request (PacketType.RELAY_REQUEST)
        → Host registra peer + envía RELAY_ACK
        → relay_connected → datos via relay del host
  → Retorna forwarderPort para RetroArch/GGPO
```

### Host recibe RELAY_REQUEST
```
P2PManager.handlePacket(RELAY_REQUEST)
  → Decodifica payload con candidate info + token
  → relay.registerPeer(guestId, token)
  → Envía RELAY_ACK
  → callbacks.onConnected(guestId, 'relay')
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
| RELAY_REQUEST | 0x07 | guest → host | sessionToken(2) + payload |
| RELAY_ACK | 0x08 | host → guest | sessionToken(2) |

### Header (4 bytes)
```
version(1) | type(1) | sessionToken(2) | payload(N)
```

---

## 4. Manejo de Conexión desde Datos Móviles

- El guest en 4G/5G solo necesita **salida UDP** (outbound)
- Las redes móviles típicamente tienen NAT simétrica → hole punching falla
- Si falla punching → RELAY_REQUEST → host reenvía datos → funciona
- El host necesita **puerto UDP abierto** (UPnP o forwarding manual en el router)
- Si el host no tiene puerto abierto → solo funciona en LAN (broadcast) o si host y guest están en redes sin NAT restrictiva

---

## 5. Criterios de Aceptación WAN

| ID | Escenario | Éxito |
|:---|:---|:---|
| CA-WAN-01 | Host con puerto abierto + guest en WiFi → hole punch directo ≤ 3s | ✅ |
| CA-WAN-02 | Host con puerto abierto + guest en 4G → relay fallback ≤ 5s | ✅ |
| CA-WAN-03 | Host sin puerto abierto + guest en 4G → falla con mensaje claro | ⚠️ |
| CA-WAN-04 | Misma LAN + broadcast → sigue funcionando (sin cambios) | ✅ |
| CA-WAN-05 | No rompe Tailscale ni bootstrap verde | ✅ |
