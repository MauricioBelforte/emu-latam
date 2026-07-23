# 03 - Diseño de Arquitectura (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Versión:** 1.1
> **Cambios:** Header 4 bytes. Keepalive unificado (3-strikes). Relay con socket dedicado por guest. Backoff exponencial. Nakama opcodes 100-103.

---

## 1. Diagrama de Arquitectura General

```
+-----------------------------------------------------------------+
|                  ELECTRON MAIN PROCESS                           |
|                                                                  |
|   React ↔ IPC ↔ P2PManager (orquestador FSM)                    |
|                    |                                              |
|   +-----------------------------------------------------------+  |
|   | SignalingCh  NatDetector  HolePuncher  RelayServer          |  |
|   | KeepAliveSvc PortAllocator LoopbackProxy StateMachine       |  |
|   |                 UDPTransport (dgram, 1 socket externo)      |  |
|   +-----------------------------------------------------------+  |
+-----------------|------------------|--------------------|--------+
                   |                  |                    |
        Nakama:7350|       STUN público|    127.0.0.1:55435|
                   v                  v                    v
            [señalización]   [detección NAT]     [RetroArch]
```

---

## 2. Diagramas de Flujo

### 2.1 Host Crea Sala

```
Host                          Nakama              STUN
 |-- crea match (existente) ->|                   |
 |-- bind(0) socket externo   |                   |
 |-- STUN request #1 ---------------------------> |
 |   <- IP:Puerto A ----------|                   |
 |-- STUN request #2 ---------------------------> |
 |   <- IP:Puerto B ----------|                   |
 |-- compara A.port === B.port? -> Cone/Symmetric |
 |-- publica P2P_CANDIDATE (opcode 100) --------> |
 |   { peerId, publicIp, publicPort,             |
 |     privateIps[], natType, protocolVersion }   |
 |== sala lista ==============|                   |
```

### 2.2 Guest se Conecta (Directo Exitoso)

```
Guest                         Nakama              Host
 |-- join match ------------->|                   |
 |   <- recibe P2P_CANDIDATE -|-----------------> |
 |-- STUN x2 (igual que host) |                   |
 |-- publica P2P_CANDIDATE -->|-----------------> |
 |                             |                   |
 |-- evalúa: misma IP pública? -> NO              |
 |-- evalúa: Symmetric-Symmetric? -> NO           |
 |-- inicia PUNCH (backoff exp) =================>|
 |   PUNCH t=0ms ->|                               |
 |   PUNCH t=400ms ->|                             |
 |  <- PUNCH_ACK t=600ms -|                       |
 |   envía PUNCH_ACK ----->|                       |
 |== DIRECT_CONNECTED =====|                      |
 |-- lanza RetroArch --connect 127.0.0.1:proxy    |
```

### 2.3 Guest se Conecta (Relay)

```
Guest                         Nakama              Host
 |-- ... mismo hasta PUNCH ...                    |
 |   PUNCH t=0ms -> (timeout)                     |
 |   PUNCH t=400ms -> (timeout)                   |
 |   PUNCH t=1600ms -> (timeout)                  |
 |   total ~2.8s, punching falló                  |
 |                                                 |
 |-- publica P2P_READY (opcode 101) ------------->|
 |   host registra relay peer                     |
 |                                                 |
 |== RELAY_CONNECTED ============================>|
 |-- RELAY_DATA (sessionToken) ------------------>|
 |   host: valida token, busca/crea GuestRoute    |
 |   host: reenvía a 127.0.0.1:55435              |
 |<- RELAY_DATA (respuesta RetroArch) ------------|
 |-- lanza RetroArch --connect 127.0.0.1:proxy    |
```

### 2.4 Misma LAN (Carrera de Candidatos)

```
Guest                         Nakama              Host
 |-- intercambian candidatos (igual que 2.2)      |
 |                                                 |
 |-- ¿misma IP pública? -> SI                     |
 |   -- PING privado a 192.168.1.x:port --------->|
 |  <- PONG < 10ms -------------------------------|
 |   -- CANCELA intentos de punching en curso     |
 |== LAN_CONNECTED ==============================>|
```

### 2.5 Keepalive y Detección de Caída

```
Por cada conexión activa:
  cada ~18s:  ---- KEEPALIVE (tipo 0x03) ---->
              <--- KEEPALIVE_ACK (tipo 0x04) ---

  3 KEEPALIVE_ACK perdidos consecutivos (~54s):
    -> DISCONNECTED
    -> cierra socket local dedicado (relay)
    -> elimina GuestRoute
    -> publica P2P_BYE (opcode 103) en Nakama
    -> emite evento IPC a React
```

---

## 3. Protocolo Binario (Header 4 bytes)

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Version (1B) |  Type (1B)    |  Session Token (16-bit)       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Payload (variable)                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

Sin magic bytes. La validación se hace por sessionToken + registro de peer en Nakama.

---

## 4. Módulos y Clases

| Módulo | Responsabilidad |
|:---|:---|
| `P2PManager` | Orquestador. API pública. Mantiene `Map<peerId, PeerConnection>`. |
| `SignalingChannel` | Wrapper sobre Nakama match. Opcodes 100-103. No abre conexión nueva. |
| `NatDetector` | 2 consultas STUN → clasifica Cone/Symmetric |
| `HolePuncher` | Backoff exp 400/800/1600ms. Corta inmediato en Symmetric-Symmetric. |
| `RelayServer` | Tabla de GuestRoutes. Socket dedicado por guest. Validación de token. |
| `KeepAliveService` | Timer por peer. 18s interval. 3-strikes rule. |
| `LoopbackProxy` | Proxy 127.0.0.1:55435 hacia RetroArch |
| `PortAllocator` | `bind(0)` para puerto dinámico |
| `StateMachine` | FSM por conexión con transiciones válidas |
| `UDPTransport` | Wrapper sobre `dgram.Socket` con demux por dirección remota |

---

## 5. Estructura de Archivos

```
src/main/p2p/
├── protocol/
│   ├── types.ts              # Enums, interfaces compartidas
│   └── packet.ts             # encodePacket() / decodePacket()
├── P2PManager.ts             # Orquestador principal
├── SignalingChannel.ts       # Nakama opcodes 100-103
├── NatDetector.ts            # STUN + clasificación
├── HolePuncher.ts            # Hole punching con backoff
├── RelayServer.ts            # GuestRoutes, forwarding
├── KeepAliveService.ts       # Keepalive + 3-strikes
├── LoopbackProxy.ts          # Proxy 127.0.0.1:55435
├── PortAllocator.ts          # bind(0)
├── StateMachine.ts           # FSM
├── UDPTransport.ts           # Wrapper dgram
├── ipc/
│   └── handlers.ts           # registerP2PHandlers()
└── __tests__/                # Tests unitarios
```

---

## 6. API IPC

### Handlers (Renderer → Main)

| Canal | Parámetros | Retorno |
|:---|:---|:---|
| `p2p:host-start` | `{ roomId }` | `P2PStatus` |
| `p2p:guest-join` | `{ roomId }` | `P2PStatus` |
| `p2p:cancel` | `{ roomId }` | `{ success }` |

### Eventos (Main → Renderer)

| Canal | Payload | Frecuencia |
|:---|:---|:---|
| `p2p:status` | `{ state, message, progress }` | Cada cambio de estado |
| `p2p:connected` | `{ peerId, mode: 'lan'\|'direct'\|'relay' }` | Una vez al conectar |
| `p2p:error` | `{ code, message }` | En errores |

---

## 7. Señalización Nakama (Opcodes)

| Opcode | Tipo | Dirección | Payload |
|:---|:---|:---|:---|
| 100 | `P2P_CANDIDATE` | bidireccional | `PeerCandidate` JSON |
| 101 | `P2P_READY` | guest → host | `{ peerId, sessionToken }` |
| 102 | `P2P_STATE` | bidireccional | `{ peerId, state }` |
| 103 | `P2P_BYE` | bidireccional | `{ peerId, reason }` |

---

## 8. Máquina de Estados (FSM)

```
IDLE → DISCOVERING (STUN) → SIGNALING (Nakama)
  → LAN_CHECK
    ├→ LAN_CONNECTED → GAME_RUNNING
    └→ PUNCHING (backoff exp ~2.8s)
        ├→ DIRECT_CONNECTED → GAME_RUNNING
        └→ RELAY_CONNECTED → GAME_RUNNING

GAME_RUNNING → DISCONNECTED (keepalive timeout / explícito)
DISCONNECTED → IDLE (limpieza)
Cualquier estado → FAILED (error) → IDLE
```

---

## 9. Estrategia de Puertos

| Servicio | Puerto | Método |
|:---|:---|:---|
| Nakama | 7350 | Fijo |
| RetroArch | 55435 | Fijo (loopback) |
| P2P externo | Dinámico | `bind(0)` |
| Proxy local por guest | Dinámico | `bind(0)` en 127.0.0.1 |
