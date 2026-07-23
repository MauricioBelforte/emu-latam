# 03 — Diseño de Arquitectura: Sistema P2P Propio para Emu Latam

> **Módulo:** 18-P2P-Propio · **Documento:** 3/5 · **Fecha:** 2026-07-23
> **Ver también:** [01-Requerimientos.md](./01-Requerimientos.md) · [02-Analisis.md](./02-Analisis.md) · [04-Codigo.md](./04-Codigo.md) · [05-Checklist.md](./05-Checklist.md)

---

## 1. Resumen

Este documento define la arquitectura concreta: qué módulos existen, cómo se comunican, qué forma tienen los paquetes, y cómo se comporta el sistema en cada escenario real de conexión. Es el documento que un desarrollador debería poder seguir para escribir el código (especificado en [04-Codigo.md](./04-Codigo.md)).

---

## 2. Respuestas rápidas a las preguntas del brief

| # | Pregunta | Dónde se responde en detalle |
|---|---|---|
| 1 | ¿Cómo detecta el sistema si dos peers están en la misma LAN? | [§4.5](#45-misma-red-lan--detección-y-bypass) — comparación de IP pública vía STUN; ver también [02-Analisis.md §2.6](./02-Analisis.md#26-stun-qué-es-y-para-qué-se-usa-acá) |
| 2 | ¿Formato de los paquetes de señalización vía Nakama? | [§7.1](#71-señalización-vía-nakama-json) |
| 3 | ¿Cómo maneja el relay múltiples conexiones sin mezclar paquetes? | [§5](#5-estructura-de-módulos-y-clases) (`RelayServer`) |
| 4 | ¿Qué pasa si el host se desconecta? ¿Reelección de host? | 01-Requerimientos RF-17 + [02-Analisis.md §2.5](./02-Analisis.md#25-topología-real-de-retroarch-netplay-por-qué-esto-simplifica-todo) (limitación aceptada) |
| 5 | ¿Cómo se evita colisión de puerto con RetroArch (55435) y Nakama (7350)? | [§9](#9-estrategia-de-puertos) |
| 6 | ¿Estrategia de keepalive? | [§8](#8-manejo-de-estados-máquina-de-estados) + 01-Requerimientos §5 (RNF de confiabilidad) |
| 7 | ¿Cómo se integra con el botón "RETAR"? | [§6](#6-api-ipc-interfaz-react--electron) |
| 8 | ¿Cómo se muestra el progreso visual (spinner, estados)? | [§6](#6-api-ipc-interfaz-react--electron) (evento `p2p:status`) + [§8](#8-manejo-de-estados-máquina-de-estados) |
| 9 | ¿Se reutiliza el socket UDP de RetroArch o hace falta uno separado? | Separado — ver [02-Analisis.md §4](./02-Analisis.md#4-justificación-de-decisiones-técnicas-clave) y [§4.2](#42-guest-se-conecta--hole-punching-exitoso) de este documento |
| 10 | ¿Cómo se versiona el protocolo? | [§7.2](#72-paquetes-binarios-hot-path) |

---

## 3. Diagrama de arquitectura general

```
+-----------------------------------------------------------------+
| Electron - Renderer Process (React)                             |
|                                                                   |
|  Boton "RETAR" --------+                    +---- estado/spinner|
|                         |                    |                   |
+-------------------------|--------------------|-------------------+
                           | IPC (ipcRenderer.invoke / .on)
+-------------------------v--------------------^-------------------+
| Electron - Main Process                                          |
|                                                                    |
|   NakamaClient (existente) <-----------> P2PManager (nuevo)      |
|                                              |                     |
|   +--------------------------------------------------------+     |
|   |  SignalingChannel   NatDetector      HolePuncher        |     |
|   |  RelayServer        KeepAliveService PortAllocator      |     |
|   |  LoopbackProxy      StateMachine (1 por conexion)        |     |
|   |             UDPTransport (dgram, socket externo)          |     |
|   +--------------------------------------------------------+     |
+-------------|------------------|--------------------|-------------+
              |                  |                      |
              v                  v                      v
     +----------------+  +----------------+   +------------------------+
     | Nakama server   |  | STUN publico    |   | RetroArch (proceso hijo)|
     | 127.0.0.1:7350  |  | (internet, solo |   | puerto fijo 55435,      |
     | senializacion   |  | deteccion NAT)  |   | habla con               |
     +----------------+  +----------------+   | 127.0.0.1:<proxy local>|
                                                +------------------------+
                                                            |
                                              UDP por internet (directo o relay)
                                                            v
                                                +------------------------+
                                                | Peer remoto             |
                                                | (mismo stack, otra PC)  |
                                                +------------------------+
```

**Puntos clave del diagrama:**

- `P2PManager` es el único punto de entrada nuevo; todo lo demás (React, Nakama, RetroArch) sigue funcionando como hoy.
- El `UDPTransport` es el único socket que efectivamente sale a internet. Los sockets de `LoopbackProxy` nunca salen de `127.0.0.1`.
- RetroArch nunca ve una IP externa: siempre se lanza apuntando a `127.0.0.1:<puerto del proxy local>` (ver [02-Analisis.md §4](./02-Analisis.md#4-justificación-de-decisiones-técnicas-clave)).

---

## 4. Diagramas de flujo por escenario

### 4.1 Host crea sala e inicia el servicio P2P

```
HOST                                              NAKAMA / STUN
 |
 |-- crea match (flujo ya existente) ------------> Nakama
 |
 |-- PortAllocator: bind(0) socket externo -----|  (local)
 |-- PortAllocator: prepara loopback proxy(es) -|  (local)
 |
 |-- NatDetector: STUN binding request #1 -----------------> STUN público A
 |<-- IP:puerto público visto por STUN A --------------------|
 |-- NatDetector: STUN binding request #2 -----------------> STUN público B
 |<-- IP:puerto público visto por STUN B --------------------|
 |
 |-- compara ambos resultados -> clasifica NAT propio
 |   (mismo puerto en A y B => Cone; distinto => Symmetric)
 |
 |-- SignalingChannel: publica P2P_CANDIDATE ----> Nakama (match data)
 |    { peerId, publicIp, publicPort,
 |      privateIps[], natType, protocolVersion }
 |
 |-- KeepAliveService: arranca en modo espera (sin peers aún)
 |
 |== sala lista, esperando guests ==
```

### 4.2 Guest se conecta — hole punching exitoso

```
GUEST                          NAKAMA (match)                    HOST
 |-- join match ------------------->|
 |                                   |-- reenvía candidatos host -->|  (ya publicados en 4.1)
 |<-- recibe P2P_CANDIDATE (host) ---|
 |
 |-- NatDetector: STUN x2 -----------------------> STUN público
 |<-- resultados -----------------------------------------------|
 |-- clasifica su propio NAT
 |
 |-- publica P2P_CANDIDATE (guest) ->|-- reenvía candidatos guest -->|
 |                                   |
 |-- ambos evalúan: ¿misma IP pública? -> no (caso LAN es 4.5)
 |-- ambos evalúan: ¿Symmetric-Symmetric? -> no -> arrancan punching
 |
 |======================= PUNCH (simultáneo, backoff) ==============>|
 |<====================== PUNCH (simultáneo, backoff) ================|
 |
 |======================= PUNCH_ACK ================================>|
 |<====================== PUNCH_ACK ===================================|
 |
 |-- StateMachine -> CONNECTED_DIRECT       StateMachine -> CONNECTED_DIRECT
 |-- LoopbackProxy: abre 127.0.0.1:<proxy>  LoopbackProxy: abre socket
 |-- lanza RetroArch --connect               local dedicado a este guest
 |   127.0.0.1:<proxy>:55435                 (forward hacia 127.0.0.1:55435,
 |                                            donde ya corre RetroArch host)
 |
 |============ tráfico de juego, directo, sin pasar por Nakama =========|
```

### 4.3 Guest se conecta — falla el punching, usa relay

```
GUEST                                                              HOST
 |==== PUNCH intento 1 (t=0ms) ========================================>|
 |<... timeout (~400ms) sin PUNCH_ACK ...|
 |==== PUNCH intento 2 (backoff, t~400ms) =============================>|
 |<... timeout ...|
 |==== PUNCH intento 3, último (t~1200ms) ==============================>|
 |<... timeout ...|
 |
 |-- da por fallido el hole punching (total ~2-3s, cumple RNF de latencia
 |   máxima definido en 01-Requerimientos.md §5)
 |
 |==== RELAY_DATA, dirigido a IP:puerto público conocido del host ======>|
 |                                          RelayServer: valida que el   |
 |                                          origen (IP:puerto) pertenece |
 |                                          a un peerId registrado para  |
 |                                          esta sala vía Nakama          |
 |                                                                        |
 |                                          -> obtiene/crea el socket    |
 |                                          local dedicado a este guest  |
 |                                          (Map<peerId, GuestRoute>)    |
 |                                          -> reenvía a 127.0.0.1:55435 |
 |<==================== RELAY_DATA (respuesta reenviada) =================|
 |
 |-- StateMachine -> CONNECTED_RELAY       host mantiene la entrada
 |-- LoopbackProxy: abre 127.0.0.1:<proxy>  en su tabla de relay mientras
 |-- lanza RetroArch --connect              dure la conexión
 |   127.0.0.1:<proxy>:55435
 |
 |======== tráfico de juego, reenviado por el host sin modificarlo ======|
```

> Nota: el `RelayServer` no reintenta ni reordena paquetes — sólo reenvía. RetroArch netplay ya maneja pérdida/orden a su manera (ver justificación en [02-Analisis.md §4](./02-Analisis.md#4-justificación-de-decisiones-técnicas-clave)).

### 4.4 Keepalive y detección de desconexión

```
Por cada conexión activa (CONNECTED_DIRECT, CONNECTED_DIRECT_LAN o CONNECTED_RELAY):

  cada 15-20s:  ---- KEEPALIVE ---->
                <--- KEEPALIVE_ACK --

  Si se pierden 3 KEEPALIVE_ACK consecutivos (~45-60s sin respuesta):

    StateMachine: CONNECTED_* -----> DISCONNECTED
       |
       +--> se cierra el socket local dedicado (si era relay)
       +--> se borra la entrada en la tabla de relay del host (si aplica)
       +--> SignalingChannel publica P2P_BYE en Nakama
       +--> se emite evento IPC "p2p:status" (state: DISCONNECTED) hacia React
```

### 4.5 Misma red LAN — detección y bypass

```
HOST                                                              GUEST
 |-- publica candidatos: IP pública (STUN) + IPs privadas de       |
 |   todas sus interfaces de red locales                           |
 |                                          (mismo paso, del lado  |
 |                                           del guest)             |
 |
 |-- ambos ya tienen los candidatos del otro (vía Nakama, ver 4.2) |
 |
 |== ¿coincide la IP pública propia con la del otro peer? ==
 |
 |   SI coincide (fuerte indicio de estar detrás del mismo router):
 |     -> se agrega un candidato "LAN" con prioridad máxima
 |     -> se prueba PING/PONG directo por IP privada, EN PARALELO
 |        con cualquier intento de punching por internet (carrera
 |        de candidatos, igual que ICE: LAN > directo público > relay)
 |
 |     Si el PING/PONG por IP privada responde primero:
 |       -> StateMachine: CONNECTED_DIRECT_LAN
 |       -> se cancelan los intentos de punching/relay en curso
 |       -> evita el problema de hairpin NAT (el router no siempre
 |          rutea bien un paquete que "rebota" por la IP pública propia)
 |
 |   NO coincide -> sigue el flujo normal de 4.2 o 4.3
```

---

## 5. Estructura de módulos y clases

| Módulo | Responsabilidad |
|---|---|
| `P2PManager` | Orquestador principal. Expone la API que usan los handlers IPC. Mantiene `Map<peerId, PeerConnection>`. Arranca/detiene el resto de los módulos según el rol (host o guest). |
| `SignalingChannel` | Envuelve la sesión de Nakama **ya existente** (no crea conexión propia). Sólo agrega/lee mensajes con los opcodes de [§7.1](#71-señalización-vía-nakama-json) dentro del match activo. |
| `NatDetector` | Ejecuta las consultas STUN (vía la librería `stun`, ver [02-Analisis.md §3.3](./02-Analisis.md#33-cliente-stun-implementación-propia-vs-librería)), clasifica el NAT propio, devuelve `{ publicIp, publicPort, natType }`. |
| `HolePuncher` | Dado un `PeerCandidate`, ejecuta el envío simultáneo de paquetes `PUNCH` con reintentos y backoff; resuelve con éxito (`PUNCH_ACK` recibido) o fallo (reintentos agotados). |
| `RelayServer` | Corre sólo en el rol host. Mantiene `Map<peerId, GuestRoute>` (ver [§4.3](#43-guest-se-conecta--falla-el-punching-usa-relay)). Valida el origen de cada paquete contra la lista de peers autorizados de la sala antes de reenviar. Responde la pregunta #3 del brief. |
| `KeepAliveService` | Timer por conexión activa. Cuenta ACKs perdidos. Dispara `handlePeerDisconnect()` al superar el umbral. |
| `PortAllocator` | `bind(0)` + lectura del puerto real asignado por el SO, tanto para el socket externo como para los sockets locales de forwarding. Responde la pregunta #5 del brief — ver [§9](#9-estrategia-de-puertos). |
| `LoopbackProxy` | Sockets en `127.0.0.1` que traducen entre "lo que RetroArch cree que es la IP del rival" y el transporte P2P real. Responde la pregunta #9 del brief. |
| `StateMachine` | Una instancia por conexión de peer. Centraliza las transiciones de [§8](#8-manejo-de-estados-máquina-de-estados) y emite los eventos que consume la UI. |
| `UDPTransport` | Wrapper fino sobre `dgram.Socket`: encode/decode del header binario ([§7.2](#72-paquetes-binarios-hot-path)), envío, recepción, demux por dirección remota. |
| `protocol/packet.ts` | Encode/decode puro del header binario — sin dependencias de red, 100% testeable de forma aislada. |

---

## 6. API IPC (interfaz React ↔ Electron)

| Canal | Dirección | Payload (aprox.) | Descripción |
|---|---|---|---|
| `p2p:host-start` | renderer → main (`invoke`) | `{ roomId }` | Arranca el servicio P2P como host para una sala ya creada en Nakama. Devuelve `{ ok, externalPort, natType }`. Reemplaza el rol que hoy cumple `tailscale-host`. |
| `p2p:guest-join` | renderer → main (`invoke`) | `{ roomId }` | Arranca el flujo de guest completo: detección de NAT propia, intercambio de candidatos, intento de conexión. Reemplaza `tailscale-guest`. |
| `p2p:cancel` | renderer → main (`invoke`) | `{ roomId }` | Cancela un intento en curso y libera todos los recursos asociados. |
| `p2p:disconnect` | renderer → main (`invoke`) | `{ peerId }` | Corta una conexión activa de forma explícita (el usuario sale de la sala). |
| `p2p:status` | main → renderer (evento) | `{ peerId, state, detail? }` | Emitido en cada transición de la máquina de estados ([§8](#8-manejo-de-estados-máquina-de-estados)). Alimenta el spinner/estado visual — responde la pregunta #8 del brief. |
| `p2p:peer-list` | main → renderer (evento) | `{ peers: PeerSummary[] }` | Lista actualizada de peers conectados y su modo (`direct` \| `direct-lan` \| `relay`). |
| `p2p:error` | main → renderer (evento) | `{ peerId?, code, message }` | Errores no fatales (p. ej. STUN inalcanzable) que la UI puede mostrar sin cortar el flujo. |

**Integración con el botón "RETAR" (pregunta #7 del brief):** el botón ya dispara hoy algún equivalente a `tailscale-guest(...)`/`tailscale-host(...)` según el rol. El cambio es puntual: la misma acción de UI pasa a invocar `p2p:guest-join` o `p2p:host-start`, manteniendo la firma de alto nivel (recibe `roomId`, devuelve una promesa) para no tocar el componente de React más de lo necesario — el detalle de implementación de este mapeo se especifica en [04-Codigo.md §5](./04-Codigo.md#5-integración-con-el-sistema-existente).

---

## 7. Protocolo de comunicación

### 7.1 Señalización vía Nakama (JSON)

Mensajes livianos, poco frecuentes, dentro del match data del match ya existente (pregunta #2 del brief):

| OpCode | Nombre | Payload | Quién lo manda |
|---|---|---|---|
| 100 | `P2P_CANDIDATE` | `{ peerId: string, publicIp: string, publicPort: number, privateIps: string[], natType: 'full_cone' \| 'restricted_cone' \| 'port_restricted_cone' \| 'symmetric', protocolVersion: number }` | Host y guest, apenas terminan su `NatDetector` |
| 101 | `P2P_PUNCH_READY` | `{ peerId: string }` | Confirma que ya se recibieron los candidatos del otro extremo — dispara el arranque simultáneo del punching |
| 102 | `P2P_STATE` | `{ peerId: string, state: PeerState }` | Opcional; visibilidad del estado en Nakama, útil para debug/observabilidad |
| 103 | `P2P_BYE` | `{ peerId: string, reason: string }` | Aviso de desconexión (voluntaria o por timeout de keepalive) |

### 7.2 Paquetes binarios (hot path)

Van directo por `UDPTransport`, sin pasar por Nakama. Header fijo de 4 bytes + payload variable (pregunta #10 del brief — el campo `version` es justamente el mecanismo de versionado):

| Campo | Tamaño | Descripción |
|---|---|---|
| `version` | 1 byte | Versión del protocolo. Un paquete con versión no soportada se descarta sin procesar; permite negociar compatibilidad entre clientes de distinta versión de la app. |
| `type` | 1 byte | `0x01 PUNCH` · `0x02 PUNCH_ACK` · `0x03 KEEPALIVE` · `0x04 KEEPALIVE_ACK` · `0x05 RELAY_DATA` · `0x06 DISCONNECT` |
| `sessionToken` | 2 bytes | Token corto derivado del intercambio por Nakama. El `RelayServer` descarta cualquier paquete cuyo token no corresponda a un peer registrado en la sala activa (mitigación de abuso, ver [02-Analisis.md §5](./02-Analisis.md#5-riesgos-identificados-y-mitigaciones)). |
| `payload` | variable | Vacío para `PUNCH`/`KEEPALIVE`/`DISCONNECT`. Para `RELAY_DATA`, el payload crudo de RetroArch netplay, reenviado **sin modificar**. |

Overhead total: **4 bytes por paquete** — irrelevante frente al tamaño típico de un paquete de netplay, y deliberadamente binario (no JSON) para no pagar costo de parseo en el camino crítico del gameplay (ver justificación en [02-Analisis.md §4](./02-Analisis.md#4-justificación-de-decisiones-técnicas-clave)).

---

## 8. Manejo de estados (máquina de estados)

Una instancia de `StateMachine` por conexión de peer (el host tiene una por guest conectado; el guest tiene exactamente una, apuntando al host):

```
IDLE
  |
  v
SIGNALING            (publica/recibe P2P_CANDIDATE vía Nakama)
  |
  v
NAT_DETECTING        (STUN x2, clasifica NAT propio)
  |
  v
CANDIDATE_EXCHANGE   (ya tiene candidatos completos del otro peer)
  |
  +-- ¿misma IP pública? --sí--> intenta LAN directo --+
  |                                                      |
  |                                    éxito             | fallo
  |                                      |                v
  |                                      |          (sigue abajo)
  |                                      v
  |                            CONNECTED_DIRECT_LAN
  |
  +-- ¿Symmetric-Symmetric? --sí---------------------------+
  |                                                          |
  +----------------------------------------------------------+
                                                               |
                                                               v
                                                          PUNCHING
                                                               |
                                +------------------------------+-----------------------------+
                                | éxito (PUNCH_ACK recibido)                                  | reintentos agotados
                                v                                                              v
                       CONNECTED_DIRECT                                                CONNECTED_RELAY
                                |                                                              |
                                +------------------------------+-----------------------------+
                                                                |
                                              (keepalive perdido x3, o P2P_BYE recibido)
                                                                v
                                                          DISCONNECTED
```

Cada transición emite `p2p:status` hacia React (ver [§6](#6-api-ipc-interfaz-react--electron)) — cumple RF-15 y responde la pregunta #8 del brief.

---

## 9. Estrategia de puertos

Responde directamente la pregunta #5 del brief.

- **Puerto externo** (host y guest): `dgram.createSocket('udp4').bind(0)`; se lee el puerto real asignado con `socket.address().port` tras el evento `'listening'`. El sistema operativo garantiza que nunca entrega un puerto ya ocupado — esto excluye automáticamente 55435 (RetroArch) y 7350 (Nakama), sin necesitar lista de exclusión ni lógica de reintento propia.
- **Puertos locales de forwarding en el host** (uno por guest activo, ver [§4.3](#43-guest-se-conecta--falla-el-punching-usa-relay) y [02-Analisis.md §2.5](./02-Analisis.md#25-topología-real-de-retroarch-netplay-por-qué-esto-simplifica-todo)): también `bind(0)`, sobre `127.0.0.1`.
- **Puerto del proxy loopback del guest** (uno solo — el guest sólo habla con un host): también `bind(0)`.
- **Liberación:** cada socket se cierra explícitamente al llegar a `DISCONNECTED` y en el cierre ordenado de la sala. Además, un handler de `app.on('before-quit')` en el main process recorre todas las conexiones activas y cierra sus sockets, para no dejar handles huérfanos si el usuario cierra la app de forma abrupta.
- **Configuración avanzada (fuera del MVP):** permitir fijar un puerto externo preferido para quienes prefieran configurar port-forwarding manual en su router en vez de depender del hole punching. Si el puerto preferido está ocupado, se cae a `bind(0)` igual. Ver [05-Checklist.md](./05-Checklist.md), Fase 3.

---

## 10. Referencias cruzadas

- Requerimientos que motivan cada decisión de diseño → [01-Requerimientos.md](./01-Requerimientos.md)
- Justificación técnica de por qué se diseñó así → [02-Analisis.md](./02-Analisis.md)
- Interfaces TypeScript, estructura de archivos y pseudocódigo de cada función → [04-Codigo.md](./04-Codigo.md)
- Plan de implementación por fases → [05-Checklist.md](./05-Checklist.md)
