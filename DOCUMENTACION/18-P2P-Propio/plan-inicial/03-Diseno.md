# 03 - Diseño de Arquitectura

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Estado:** Plan inicial

---

## 1. Diagrama de Arquitectura General

```
+------------------------------------------------------------------+
|                    ELECTRON MAIN PROCESS                          |
|                                                                   |
|  +------------------+     +------------------+                    |
|  |  IPC Handlers    |<--->|  P2PManager      |                    |
|  |  (p2p:start,     |     |  (Orquestador     |                    |
|  |   p2p:connect,   |     |   FSM + estados)  |                    |
|  |   p2p:stop)      |     +--------+---------+                    |
|  +------------------+              |                              |
|           ^                        |                              |
|           | IPC                    |                              |
|  +--------+--------+     +---------+---------+    +-------------+ |
|  |  React UI       |     | NATDetector       |    | Nakama      | |
|  |  (spinner,      |     |  (STUN client     |    | Signaling   | |
|  |   estados,      |     |   + clasificación)|    | (WebSocket) | |
|  |   logs)         |     +---------+---------+    +------+------+ |
|  +-----------------+               |                       |       |
|                                    v                       v       |
|                          +------------------+    +----------------+ |
|                          | P2PSocket        |    | Nakama Match   | |
|                          | (dgram UDP)      |    | (señalización) | |
|                          +-------+----------+    +----------------+ |
|                                  |                                 |
+----------------------------------|---------------------------------+
                                   |
        +--------------------------+--------------------------+
        | Loopback (UDP local)                     | Red (UDP pública/LAN)
        v                                          v
+---------------------+                  +--------------------+
| RetroArch Netplay   |                  | Remote Peers       |
| 127.0.0.1:55435     |                  | (Host/Guests)      |
+---------------------+                  +--------------------+
```

---

## 2. Diagramas de Flujo

### 2.1 Host Crea Sala e Inicia Servicio P2P

```
[React]        [IPC]          [NATDetector]     [P2PSocket]     [Nakama]
   |             |                 |                |               |
   |--crearSala->|                 |                |               |
   |             |--detectNAT()-->|                |               |
   |             |<--{cone,IP:Puerto}             |               |
   |             |--bind(0)---------------------->|               |
   |             |<--puerto:55436                |               |
   |             |                                                |
   |             |--registerMatch(candidatos)-------------------->|
   |             |<--matchId:#123---------------------------------|
   |<--ready-----|                                                |
```

### 2.2 Guest se Conecta (Hole Punching Exitoso)

```
[Guest React]  [Guest P2P]    [Nakama]        [Host P2P]      [Host Socket]
      |             |             |                |                |
      |--join(#123)>|             |                |                |
      |             |--requestCandidates---------->|                |
      |             |<--hostCandidates-------------|                |
      |             |                              |                |
      |             |=== HOLE PUNCHING ===========================>|
      |             |--PUNCH x10 (c/200ms)------------------------>|  (abre
      |             |<--PONG (ACK)---------------------------------|   NAT)
      |             |                              |                |
      |             |=== DIRECT CONNECTED ========>|                |
      |<--connected-|                              |                |
```

### 2.3 Hole Punching Falla → Relay

```
[Guest P2P]        [Host P2P]          [UDPRelayManager]    [RetroArch Host]
     |                  |                      |                    |
     |---HOLE PUNCH---->|                      |                    |
     |   (timeout 4s)   |                      |                    |
     |                  |                      |                    |
     |<--SWITCH_RELAY---|                      |                    |
     |                  |--registerPeer(guest)->|                    |
     |                  |                      |                    |
     |== GAME DATA ===========================>|                    |
     |-----------------> recibe socket P2P      |                    |
     |                  |                      |--reenvía 127.0.0.1:55435 ->|
     |                  |                      |                    |
     |<----------------- recibe de RetroArch <-|-reenvía a guest ---|
```

### 2.4 Misma Red LAN

```
[Guest P2P]          [Host P2P]
     |                    |
     |-- Nakama: intercambio de candidatos -->|
     |                    |
     |-- compara IPs privadas (192.168.1.x) ->|  misma subred
     |                    |
     |-- PING a 192.168.1.x:55436 ----------->|
     |<-- PONG <10ms -------------------------|
     |                    |
     |=== LAN DIRECT CONNECTED ==============>|
```

---

## 3. Protocolo de Paquetes UDP (Encabezado Binario)

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Magic 0x45   |   Magic 0x4D   | Protocol Ver  | Message Type|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Session ID (32-bit)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Payload (variable)                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

**Total header: 8 bytes.** Tipos de mensaje:

| Valor | Tipo | Descripción |
|:---|:---|:---|
| 0x01 | PUNCH | Paquete de hole punching (sin payload) |
| 0x02 | GAME_DATA | Tráfico de RetroArch netplay |
| 0x03 | KEEPALIVE_PING | Heartbeat (8 bytes, sin payload adicional) |
| 0x04 | KEEPALIVE_PONG | Respuesta a heartbeat |
| 0x05 | RELAY | Paquete envuelto para reenvío en relay (incluye peerId destino) |
| 0x06 | CLOSE | Cierre de conexión |

---

## 4. Máquina de Estados (FSM)

```
                    ┌──────────┐
                    │   IDLE   │
                    └────┬─────┘
                         │ startP2P()
                         v
                   ┌─────────────┐
                   │ DISCOVERING │  ← STUN + interfaces de red
                   └──────┬──────┘
                          │ candidates listos
                          v
                    ┌───────────┐
                    │ SIGNALING │  ← Nakama intercambio
                    └─────┬─────┘
                          │ peer candidates recibidos
                          v
                    ┌────────────┐
                    │ LAN_CHECK  │  ← misma subred?
                    └─────┬──────┘
                     ┌────┴─────┐
                     v          v
               ┌──────────┐  ┌───────────┐
               │ LAN_CONN │  │ PUNCHING  │  ← hole punching (4s timeout)
               └────┬─────┘  └─────┬─────┘
                    │         ┌────┴─────┐
                    │         v          v
                    │  ┌────────────┐  ┌───────────────┐
                    │  │ DIRECT_CONN│  │ RELAY_CONN    │
                    │  └──────┬─────┘  └───────┬───────┘
                    │         │                │
                    └─────────┴────────────────┘
                                      │
                                      v
                               ┌─────────────┐
                               │ GAME_RUNNING│
                               └──────┬──────┘
                                      │ disconnect / error
                                      v
                               ┌─────────────┐
                               │  FAILED     │
                               └─────────────┘
```

---

## 5. Estructura de Módulos

```
src/main/p2p/
├── types.ts                 # Enums, interfaces, tipos compartidos
├── Protocol.ts              # Encabezado binario, serialización
├── NATDetector.ts           # Cliente STUN + clasificación de NAT
├── P2PSocket.ts             # Socket UDP: bind, hole punch, keepalive
├── UDPRelayManager.ts       # Relay multi-peer en el host
├── LocalProxy.ts            # Proxy loopback 127.0.0.1:55435
├── P2PManager.ts            # Orquestador FSM + integración Nakama
└── index.ts                 # IPC handlers setup
```

---

## 6. API IPC (Main ↔ Renderer)

### Handlers (Renderer llama a Main)

```typescript
ipcMain.handle('p2p:start', async () => {
  // Inicia servicio P2P local (host)
});

ipcMain.handle('p2p:connect', async (_, matchId: string, targetPeerId: string) => {
  // Conecta a peer vía P2P (guest)
});

ipcMain.handle('p2p:stop', async () => {
  // Detiene sesión y limpia recursos
});

ipcMain.handle('p2p:getStatus', async () => {
  // Devuelve estado actual + métricas
});
```

### Eventos (Main envía a Renderer)

```typescript
// Estado cambiado
win.webContents.send('p2p:state', { state: 'PUNCHING', progress: 60, message: 'Perforando NAT...' });

// Conectado
win.webContents.send('p2p:connected', { mode: 'direct' | 'relay' | 'lan', latencyMs: 12 });

// Error
win.webContents.send('p2p:error', { code: 'HOLE_PUNCH_TIMEOUT', message: 'No se pudo establecer conexión directa' });
```

---

## 7. Estrategia de Puertos

| Servicio | Puerto | Método |
|:---|:---|:---|
| Nakama | 7350 | Fijo (existente) |
| RetroArch | 55435 | Fijo (existente) |
| P2P Service | Dinámico | `socket.bind(0)` — SO asigna puerto efímero |
| Proxy local | 55435 | Mismo puerto que RetroArch (loopback) |

El puerto P2P se descubre en fase STUN y se comparte vía Nakama. El proxy local escucha en `127.0.0.1:55435` y reenvía al socket P2P.

---

## 8. Keepalive y Heartbeat

| Tipo | Intervalo | Timeout | Propósito |
|:---|:---|:---|:---|
| NAT keepalive | 15s | — | Mantener mapping del router |
| Heartbeat | 5s | 30s (6 perdidos) | Detectar peer caído |

El NAT keepalive se envía SIEMPRE (haya o no tráfico de juego). El heartbeat verifica que el peer responda.
