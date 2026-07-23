# 03 - Diseño de Arquitectura del Sistema P2P (Emu Latam)

> **Módulo:** 18-P2P-Propio  
> **Fecha:** 2026-07-23  
> **Estado:** Propuesta de Arquitectura v1.0  
> **Referencias:** Ver `01-Requerimientos.md` y `02-Analisis.md`  

---

## 1. Diagrama General de Arquitectura

```
 +-----------------------------------------------------------------------------------+
 |                             ELECTRON MAIN PROCESS                                 |
 |                                                                                   |
 |  +--------------------+      +--------------------+      +---------------------+  |
 |  |   IPC Handlers     |<---->|   P2P Orchestrator |<---->|   Nakama Signaling  |  |
 |  +--------------------+      +---------+----------+      +----------+----------+  |
 |            ^                           |                            |             |
 |            | IPC                       v                            v             |
 |  +---------+----------+      +--------------------+      +---------------------+  |
 |  | React UI (Frontend)|      |  NAT Detector      |      | WebSocket a Nakama  |  |
 |  +--------------------+      |  (STUN Client)     |      | (Servidor Central)  |  |
 |                              +---------+----------+      +---------------------+  |
 |                                        |                                          |
 |                                        v                                          |
 |                              +--------------------+                               |
 |                              |   P2PSocket Manager|                               |
 |                              |  (dgram / UDP Node)|                               |
 |                              +----+------------+--+                               |
 |                                   |            |                                  |
 +-----------------------------------|------------|----------------------------------+
                                     |            |
             +-----------------------+            +-----------------------+
             | Loopback (UDP Local)                               | Red Pública / LAN (UDP)
             v                                                    v
 +-----------------------+                              +-------------------+
 | RetroArch Netplay     |                              | Remote Peers      |
 | (127.0.0.1:55435)     |                              | (Guests / Hosts)  |
 +-----------------------+                              +-------------------+
```

---

## 2. Diagramas de Flujo de Secuencia

### 2.1 Flujo A: Creación de Sala e Inicio P2P (Host)

```
[React UI]          [IPC Main]        [NATDetector]       [P2PSocket]         [Nakama WS]
    |                   |                  |                   |                   |
    |-- retar/host ---->|                  |                   |                   |
    |                   |-- detect() ----->|                   |                   |
    |                   |<-- NAT_CONE -----|                   |                   |
    |                   |-- bind(0) -------------------------->|                   |
    |                   |<-- Bound: 192.168.1.50:55440 --------|                   |
    |                   |                                                          |
    |                   |-- Register Match Metadata (IP_Pub, Port, IP_Priv, NAT) ->|
    |                   |<-- Match Created (Match_ID: #123) -----------------------|
    |<-- Host Ready ----|
```

### 2.2 Flujo B: Conexión de Guest con UDP Hole Punching Exitoso

```
[Guest UI]        [Guest Main]        [Nakama WS]         [Host Main]        [Host Socket]
    |                  |                   |                   |                   |
    |-- join(#123) --->|                   |                   |                   |
    |                  |-- Get Host Info ->|                   |                   |
    |                  |<-- Candidate Payload (Host IP/Port) -|                   |
    |                  |                                       |                   |
    |                  |-- Send Signal Payload (Guest IP/Port) ---> Host Target    |
    |                  |                                       |                   |
    |                  |========== RÁFAGA HOLE PUNCHING (UDP Directo) ============|
    |                  |-- PING (Syn) ----------------------------------->|        |
    |                  |                                                  | (Abre filtro NAT)
    |                  |<--------------------------------- PING (SynAck) -|        |
    |                  |                                                           |
    |                  |======= CONEXIÓN DIRECTA P2P ESTABLECIDA =======|          |
    |<-- Connected ----|                                                           |
```

### 2.3 Flujo C: Fallback a Host UDP Relay (Hole Punching Falla)

```
[Guest Main]            [Host Main]               [UDP Relay Engine]       [RetroArch Host]
     |                       |                            |                        |
     |--- Sync HolePunch --->|                            |                        |
     |    (Timeout 4.0s)     |                            |                        |
     |                       |-- Punching Failed -------->|                        |
     |                       |                            |-- Init Client Slot --->|
     |                       |                            |   (Mapping Peer 1)     |
     |                       |<-- Switch to RELAY Mode ---|                        |
     |                       |                                                     |
     |== Datagrama Gameplay (Guest Netplay) ======================================>|
     |-----------------------> Recibe en Socket P2P -------> Reenvía Local (55435)->|
     |<----------------------- Recibe de RetroArch (55435) -- Reenvía a Guest -----|
```

---

## 3. Respuestas a las 10 Preguntas Clave de Arquitectura

### Q1: ¿Cómo detecta el sistema si dos peers están en la misma red LAN?
**Respuesta:** Durante la recolección de candidatos, cada peer obtiene la lista de sus interfaces de red locales usando `os.networkInterfaces()`, filtrando direcciones IPv4 privadas en rangos RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
Al intercambiar datos vía Nakama, el sistema compara si la IP pública es idéntica **Y** si las IPs privadas pertenecen al mismo bloque de subred (ej: las dos coinciden en `192.168.1.X` con máscara `/24`). Si coinciden, el cliente intenta un ping directo a la IP privada primero. Si responde en < 10ms, se fija la ruta LAN Directa.

### Q2: ¿Qué formato tienen los paquetes de señalización a través de Nakama?
**Respuesta:** Se envían como un objeto JSON estructurado mediante los mensajes de canal/match de Nakama (`OpCode: 101` para Candidatos P2P):

```json
{
  "opCode": 101,
  "payload": {
    "protocolVersion": 1,
    "peerId": "user_uuid_abc123",
    "publicIp": "201.182.45.12",
    "publicPort": 55442,
    "privateIp": "192.168.1.15",
    "privatePort": 55442,
    "natType": "PORT_RESTRICTED_CONE",
    "sessionId": "sess_88f11a"
  }
}
```

### Q3: ¿Cómo maneja el relay múltiples conexiones UDP simultáneas sin mezclar paquetes?
**Respuesta:** El `UDPRelayManager` mantiene una **Tabla de Sesiones Activas** indexada por la clave única `Address:Port` de la cual proviene el datagrama UDP. Cada datagrama enviado desde RetroArch local lleva o deduce el destinatario mediante un prefijo en el protocolo P2P o asignación de puertos/slots. Para juegos Netplay 1vN, el Relay duplica el datagrama recibido del RetroArch Host a todos los sockets de la lista de Guests registrados.

### Q4: ¿Qué pasa si el host se desconecta? ¿Cómo se reelige un nuevo host?
**Respuesta:** Nakama detecta la caída de presencia del Host mediante el Keepalive del WebSocket. Nakama notifica a los clientes restantes mediante el evento `presencelist`. El cliente con el `peerId` lexicográficamente menor (o con menor latencia promedio) es promovido automáticamente a nuevo Host, notificando a la UI para relanzar la sesión de Netplay como `--host` y los demás como `--connect`.

### Q5: ¿Cómo se asegura que el puerto elegido para el servicio P2P no entre en conflicto con RetroArch (55435) ni con Nakama (7350)?
**Respuesta:** Se utiliza bindeo de puerto 0 dinámico del sistema operativo (`socket.bind({ port: 0, address: '0.0.0.0' })`). El SO asigna una puerta efímera disponible garantizada fuera de los puertos reservados. Si se desea un rango acotado, un loop de escaneo verifica `net.createServer().listen()` en el rango 55436–55500 antes de asignar.

### Q6: Strategy de Keepalive: ¿Qué tan seguido, qué datos mandar, qué pasa si se pierde?
**Respuesta:** 
- **Intervalo:** 15 segundos.
- **Payload:** Paquete binario ultra-liviano de 8 bytes (`[Magic: 0x454D] [Type: 0x03 (PING)] [Sequence: Uint16] [Timestamp: Uint32]`).
- **Tolerancia:** Si no se recibe respuesta PONG ni trafico de juego tras **3 keepalives consecutivos (45 segundos)**, la conexión con ese peer específico se marca como `DISCONNECTED` y se emite un evento IPC a la UI.

### Q7: ¿Cómo se integra con el botón "RETAR" existente en la UI?
**Respuesta:** El botón "RETAR" invoca la acción Redux/React que llama a `window.api.p2p.challengePeer(peerUserId)`. El proceso Main de Electron intercepta esta llamada, inicia la recolección STUN, crea la sala en Nakama, envía la invitación P2P y conmuta la UI al estado `CONNECTING`.

### Q8: ¿Cómo se muestra el progreso visual al usuario (spinner, estados)?
**Respuesta:** Se emite el evento IPC `p2p:status-changed` hacia React con un payload que incluye el estado y porcentaje de progreso:
1. `STUN_LOOKUP` (15%) -> "Detectando tipo de red local..."
2. `SIGNALING` (35%) -> "Intercambiando claves con el rival..."
3. `HOLE_PUNCHING` (60%) -> "Estableciendo túnel directo P2P..."
4. `RELAY_FALLBACK` (80%) -> "NAT estricto detectado. Activando Relay de alta velocidad..."
5. `CONNECTED` (100%) -> "¡Conexión establecida! Lanzando RetroArch..."

### Q9: ¿Se puede reutilizar el socket UDP de RetroArch o necesita uno separado?
**Respuesta:** **Necesita un socket SEPARADO.** RetroArch gestiona internamente su propio socket UDP cuando se ejecuta como proceso independiente. Intentar compartir el mismo puerto lanzaría un error `EADDRINUSE`. El módulo P2P abre un socket P2P público/externo para comunicarse con internet y un socket proxy en `127.0.0.1` que habla con RetroArch.

### Q10: ¿Cómo se versiona el protocolo para compatibilidad futura?
**Respuesta:** Cada paquete UDP incluye en su primer byte de datos el valor de la versión (`0x01`). Si un cliente recibe un paquete con un número de versión mayor al soportado, ignora el paquete y envía un datagrama de error `PROTOCOL_MISMATCH` para obligar al usuario a actualizar la aplicación.

---

## 4. Estructura de Módulos y Clases TypeScript

```
src/main/p2p/
├── P2POrchestrator.ts        # Controlador principal (FSM y orquestación IPC)
├── NATDetector.ts            # Cliente STUN para clasificación de NAT
├── P2PSocket.ts              # Wrapper del socket dgram para Hole Punching y Keepalive
├── UDPRelayManager.ts        # Enrutador/Multiplexor de tráfico en el Host
├── LocalRetroArchProxy.ts    # Socket loopback local para hablar con RetroArch
├── Protocol.ts               # Encabezados binarios, serializador y encoders
└── types.ts                  # Declaraciones de tipos e interfaces
```

---

## 5. Especificación del Protocolo de Paquetes UDP (Estructura Binaria)

Para minimizar el overhead, no se usa JSON en el canal UDP de gameplay. Todos los paquetes usan un encabezado fijo de 8 bytes:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Magic Byte 1|   Magic Byte 2| Protocol Ver. |  Packet Type  |
|     ('E')     |     ('M')     |    (0x01)     | (0x01..0x05)  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Session ID (32-bit)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Payload (Variable)                      |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Tipos de Paquetes (`Packet Type`):
- `0x01 (PUNCH)`: Datagrama de perforación NAT (vacío).
- `0x02 (GAME_DATA)`: Tráfico comprimido transparente de RetroArch Netplay.
- `0x03 (KEEPALIVE_PING)`: Heartbeat periódico.
- `0x04 (KEEPALIVE_PONG)`: Respuesta a heartbeat.
- `0x05 (RELAY_WRAPPER)`: Paquete con ID de destino para enrutamiento multi-peer.

---

## 6. Máquina de Estados Finita (FSM)

```
 [IDLE] ---> (Inicia Reto) ---> [STUN_LOOKUP]
                                     |
                                     v
 [DISCONNECTED] <--- (Timeout) <--- [SIGNALING]
                                     |
                                     v
                                [HOLE_PUNCHING]
                                 /          \
                      (Exito)   /            \ (Falla/Symmetric)
                               v              v
                   [DIRECT_CONNECTED]     [RELAY_CONNECTED]
                               \            /
                                v          v
                             [GAME_RUNNING]
```
