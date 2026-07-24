# 03 - Diseño de Arquitectura — Relay WAN para GGPO vía P2P

> **Módulo:** 19-GGPO-P2P-WAN
> **Fecha:** 2026-07-24
> **Versión:** 1.0

---

## 1. Arquitectura General

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ELECTRON MAIN PROCESS                         │
│                                                                      │
│  React (Renderer)                                                    │
│    ↕ IPC                                                             │
│  ggpo-p2p-host │ ggpo-p2p-guest │ ggpo-p2p-register-guest │          │
│  ggpo-p2p-disconnect                                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐         │
│  │              ggpoP2PBridge.ts (NUEVO)                    │         │
│  │                                                         │         │
│  │  handleGGPOP2PHost() → P2PManager.startHost()           │         │
│  │  handleGGPOP2PGuest() → P2PManager.startJoin()          │         │
│  │                       → LAN? directo : forwarder+relay  │         │
│  │  handleGGPOP2PHostRegisterGuest() → relay socket + P2P  │         │
│  │  handleGGPOP2PDisconnect() → cleanup                    │         │
│  │                                                         │         │
│  │  Estado global (separado de p2pBridge):                 │         │
│  │    - hostManager: P2PManager | null                     │         │
│  │    - guestManager: P2PManager | null                    │         │
│  │    - hostRelaySocket: dgram.Socket | null               │         │
│  │    - guestForwarderSocket: dgram.Socket | null          │         │
│  │    - tokenCounter: number (empieza en 200)             │         │
│  └─────────────────────────────────────────────────────────┘         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐         │
│  │              p2pBridge.ts (EXISTENTE, NO TOCAR)         │         │
│  │  handleP2PHost() → P2PManager (para RetroArch)          │         │
│  │  handleP2PGuest() → P2PManager (para RetroArch)         │         │
│  │  ...                                                    │         │
│  └─────────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Diagramas de Flujo

### 2.1 Flujo WAN (Auto-detectado)

```
HOST (Retador)                          GUEST (Retado)                  Nakama
  |                                       |                             |
  |-- ggpo-p2p-host()                     |                             |
  |   P2PManager.startHost()              |                             |
  |   obtiene candidate                   |                             |
  |   retorna {candidate}                 |                             |
  |                                       |                             |
  |-- send challenge(candidate) --------->|                             |
  |                                       |                             |
  |                                       |-- ggpo-p2p-guest(candidate) |
  |                                       |   startJoin(candidate)      |
  |                                       |   status === "lan_check"?   |
  |                                       |   → NO (distintas redes)    |
  |                                       |   → isLan = false           |
  |                                       |                             |
  |                                       |   Crear forwarder UDP:      |
  |                                       |   socket.bind(0,127.0.0.1)  |
  |                                       |   forwarderPort = puerto    |
  |                                       |                             |
  |                                       |   Registrar handler:        |
  |                                       |   RELAY_DATA→forwarder.send |
  |                                       |   a 127.0.0.1:6004         |
  |                                       |                             |
  |                                       |   retorna {isLan:false,     |
  |                                       |     forwarderPort, candidate}|
  |                                       |                             |
  |                                       |-- send ACCEPT(candidate,    |
  |                                       |    guestIp) --------------->|
  |                                                                      |
  |<- ACCEPT recibido                     |                             |
  |                                       |                             |
  |-- ggpo-p2p-register-guest(candidate)  |                             |
  |   P2PManager.onGuestJoin(candidate)   |                             |
  |   Crear relay socket:                 |                             |
  |     socket.bind(0,127.0.0.1)          |                             |
  |     relayPort = puerto                |                             |
  |     socket recibe datos → RELAY_DATA  |                             |
  |     → guest                           |                             |
  |   Registrar handler P2P:             |                             |
  |     RELAY_DATA entrante → send()     |                             |
  |     a 127.0.0.1:6003                 |                             |
  |   retorna {relayPort}                |                             |
  |                                       |                             |
  |-- send connection_info(               |                             |
  |    relayPort, useGgpoRelay:true) ---->|                             |
  |                                       |                             |
  |                                       |<- connection_info           |
  |                                       |                             |
  |                                       |-- ggpo-launch(P1,           |
  |                                       |    remoteIp=127.0.0.1,      |
  |                                       |    remotePort=forwarderPort)|
  |                                       |                             |
  |                                       |-- send guest_ready -------->|
  |                                                                      |
  |<- guest_ready                        |                             |
  |                                       |                             |
  |-- ggpo-launch(P0,                     |                             |
  |    remoteIp=127.0.0.1,               |                             |
  |    remotePort=relayPort)              |                             |
  |                                       |                             |
  |=========== GGPO CONECTADO VÍA RELAY P2P ============                |
```

### 2.2 Flujo LAN (Directo, sin relay)

```
HOST                                    GUEST
  |                                       |
  |-- ggpo-p2p-host()                     |
  |   retorna {candidate}                 |
  |                                       |
  |-- send challenge(candidate) -------->|
  |                                       |
  |                                       |-- ggpo-p2p-guest(candidate)
  |                                       |   startJoin(candidate)
  |                                       |   status === "lan_check"?
  |                                       |   → SÍ (misma LAN)
  |                                       |   → isLan = true
  |                                       |   retorna {isLan:true,
  |                                       |     hostLanIp, candidate}
  |                                       |
  |                                       |-- send ACCEPT(guestIp) --->|
  |                                                                      |
  |<- ACCEPT recibido                     |                             |
  |                                       |                             |
  |-- get-lan-ip()                        |                             |
  |-- send connection_info(               |                             |
  |    ggpoHostIp, useGgpo:true) -------->|                             |
  |                                       |                             |
  |                                       |-- ggpo-launch(P1,           |
  |                                       |    remoteIp=ggpoHostIp)     |
  |                                       |-- send guest_ready -------->|
  |                                                                      |
  |<- guest_ready                        |                             |
  |-- ggpo-launch(P0, guestIp)           |                             |
  |                                       |                             |
  |=========== GGPO CONECTADO DIRECTO (LAN) ============                 |
```

Nota: El flujo LAN es **idéntico al actual** (implementado en la integración previa, 18-P2P-Propio fase 1.5). ggpoP2PBridge retorna `isLan=true` y ChallengeContext usa el flujo existente. No se crea relay ni forwarder.

### 2.3 Auto-detección LAN/WAN

La detección la realiza `P2PManager.startJoin()` internamente:
1. Intercambia candidatos con el host
2. Compara IP pública: si es la misma → posible LAN
3. Prueba conectividad por IP privada (PING/PONG)
4. Si éxito → estado `lan_check`, manager.status === "lan_check"
5. Si fallo → continúa a hole punching WAN

En `ggpoP2PBridge.handleGGPOP2PGuest()`:
- Si `manager.status === "lan_check"` → isLan=true, retorna hostLanIp
- Si no → isLan=false, crea forwarder y relay

---

## 3. Módulos y Clases

### 3.1 ggpoP2PBridge.ts

| Función | Responsabilidad |
|:---|:---|
| `handleGGPOP2PHost()` | Crea P2PManager como host, retorna candidate |
| `handleGGPOP2PGuest(hostCandidate)` | Crea P2PManager como guest, detecta LAN/WAN, retorna info |
| `handleGGPOP2PHostRegisterGuest(guestCandidate)` | Registra guest en relay host, crea socket relay local |
| `handleGGPOP2PDisconnect()` | Limpia todos los recursos |

### 3.2 Estados Globales (separados de p2pBridge)

| Variable | Tipo | Propósito |
|:---|:---|:---|
| `ggpoHostManager` | `{manager: P2PManager, token: number} \| null` | Manager activo del host |
| `ggpoGuestManager` | `{manager: P2PManager, token: number} \| null` | Manager activo del guest |
| `ggpoHostRelaySocket` | `dgram.Socket \| null` | Socket relay en host (reenvía guest→GGPO y GGPO→guest) |
| `ggpoGuestForwarderSocket` | `dgram.Socket \| null` | Socket forwarder en guest (reenvía GGPO→P2P y P2P→GGPO) |
| `ggpoTokenCounter` | `number` | Contador separado (empieza en 200 para evitar colisión con p2pBridge) |

---

## 4. Protocolo de Comunicación

El tráfico de GGPO se encapsula en paquetes RELAY_DATA del protocolo P2P existente:

| Campo | Offset | Tamaño | Valor |
|:---|:---|:---|:---|
| Version | 0 | 1 byte | 0x01 |
| Type | 1 | 1 byte | 0x05 (RELAY_DATA) |
| Session Token | 2 | 2 bytes | Token único por sesión |
| Payload | 4 | variable | Datos UDP de GGPO (crudos) |

No se añade ningún header adicional. El P2P module ya maneja la autenticación y validación.

---

## 5. API IPC

### Handlers (Renderer → Main)

| Canal | Parámetros | Retorno |
|:---|:---|:---|
| `ggpo-p2p-host` | `{}` | `{success, candidate, token}` |
| `ggpo-p2p-guest` | `{hostCandidate}` | `{success, isLan, hostLanIp?, forwarderPort?, candidate}` |
| `ggpo-p2p-register-guest` | `{guestCandidate}` | `{success, relayPort}` |
| `ggpo-p2p-disconnect` | `{}` | `{success}` |

### Eventos (Main → Renderer)

| Canal | Payload | Frecuencia |
|:---|:---|:---|
| `ggpo-p2p:status` | `{state, message, progress}` | Cada cambio de estado |
| `ggpo-p2p:error` | `{code, message}` | En errores |

---

## 6. Puerto y Recursos

| Recurso | Puerto/Host | Método |
|:---|:---|:---|
| P2P externo | Dinámico | `P2PManager` usa `bind(0)` |
| Host relay socket | 127.0.0.1:0 (RPORT) | `dgram.bind(0, '127.0.0.1')` |
| Guest forwarder socket | 127.0.0.1:0 (FPORT) | `dgram.bind(0, '127.0.0.1')` |
| GGPO Host | 127.0.0.1:6003 | Fijo (fcadefbneo) |
| GGPO Guest | 127.0.0.1:6004 | Fijo (fcadefbneo) |

El relay y forwarder usan puertos dinámicos para evitar colisiones con otros servicios.

---

## 7. Estructura de Archivos

```
client/src/main/
├── index.ts                    ← Registrar handlers ggpo-p2p-*
├── ggpoP2PBridge.ts            ← NUEVO: bridge GGPO+P2P
├── p2pBridge.ts                ← EXISTENTE: NO MODIFICAR
├── services/
│   └── ipcChannels.ts          ← Agregar canales ggpo-p2p-*
client/src/context/
└── ChallengeContext.tsx         ← Modificar: usar ggpo-p2p-* para engine==="ggpo"
```

Solo 1 archivo nuevo (`ggpoP2PBridge.ts`) y modificaciones mínimas en 3 archivos existentes (index.ts, ipcChannels.ts, ChallengeContext.tsx).
