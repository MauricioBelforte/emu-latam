# 02 - Análisis Técnico Profundo (Emu Latam)

> **Módulo:** 18-P2P-Propio  
> **Fecha:** 2026-07-23  
> **Estado:** Propuesta de Arquitectura v1.0  
> **Referencias:** Ver `01-Requerimientos.md`  

---

## 1. Análisis del Dominio: Traversal de NAT y Comportamiento de Routers

Para interconectar dos nodos sin servidor central en internet, es indispensable comprender la topología del *Network Address Translation* (NAT) aplicada por los proveedores de internet (ISPs) y routers domésticos.

```
+------------------+-------------------------------------------------------------+
| Tipo de NAT      | Comportamiento de Asignación de Puerto y Filtro Firewall    |
+------------------+-------------------------------------------------------------+
| Full Cone        | Un puerto interno (ej: 55436) se mapea a IP:Puerto público  |
|                  | constante. CUALQUIER host externo puede enviar paquetes.    |
+------------------+-------------------------------------------------------------+
| Address          | El puerto público permanece constante, pero el router SOLO   |
| Restricted Cone  | acepta paquetes de IPs a las que el cliente ya envió datos. |
+------------------+-------------------------------------------------------------+
| Port Restricted  | El puerto público es constante, pero el router valida IP Y   |
| Cone             | PUERTO origen de los paquetes entrantes.                    |
+------------------+-------------------------------------------------------------+
| Symmetric NAT    | Asigna un PUERTO PÚBLICO DIFERENTE para cada IP/puerto      |
| (CGNAT / Móvil)  | destino. El Hole Punching directo es IMPOSIBLE de predecir.|
+------------------+-------------------------------------------------------------+
```

### El Desafío del Symmetric NAT (CGNAT)
En un escenario donde al menos un jugador tiene **Symmetric NAT** (frecuente en conexiones por datos móviles 4G/5G o ISPs con Carrier-Grade NAT), las direcciones mapeadas por el router cambian dinámicamente según el endpoint de destino. Intentar adivinar el puerto (*Port Scanning Punching*) es ineficiente y genera bloqueos en el router.

**Solución elegida:** Detección previa vía STUN. Si un cliente es identificado como *Symmetric*, se descarta el Hole Punching y se activa de inmediato la modalidad **Host UDP Relay**.

---

## 2. Comparación de Alternativas de Arquitectura

Evaluamos tres aproximaciones técnicas principales para el stack de Emu Latam:

| Criterio | Opción A: WebRTC (DataChannels) | Opción B: libp2p (JS-libp2p) | Opción C: Custom UDP Proxy (`dgram`) [ELEGIDA] |
| :--- | :--- | :--- | :--- |
| **Protocolo Base** | SCTP sobre DTLS sobre UDP | TCP / QUIC / WebSockets / WebRTC | UDP puro (`node:dgram`) |
| **Overhead de Encabezado** | Alto (~40-60 bytes por paquete) | Muy Alto (~80-120 bytes) | Mínimo (8 bytes encabezado propio) |
| **Latencia de Procesamiento**| 8-15 ms (Criptografía DTLS + SCTP framing) | 12-25 ms (Muxing, Handshakes complejos) | **< 1 ms** (Operaciones de buffer binario directo) |
| **Complejidad de Integración**| Media-Alta (Requiere `node-datachannel` o RTCNative) | Alta (Múltiples capas de abstracción) | **Baja** (Integración nativa en Node.js) |
| **Compatibilidad con RetroArch**| Requiere puente UDP ↔ SCTP DataChannel | Requiere puente UDP ↔ libp2p stream | **Transparente** (UDP a UDP directo) |
| **Dependencias Externas**| Binarios C++ (`node-gyp`) o wrappers | ~150 paquetes npm | **0 dependencias binarias externas** |

### Justificación de la Elección (Opción C - Custom UDP Proxy)
RetroArch Netplay opera sobre UDP de baja latencia sin garantía de entrega ordenada (cada frame envía el estado del input). Envolver estos datagramas en WebSockets, TCP o SCTP (WebRTC) añade *Head-of-Line Blocking* o latencia criptográfica innecesaria en red local/P2P. Un **Proxy UDP ligero basado en `dgram`** ofrece el menor RTT posible, total control sobre los buffers y cero compilación de dependencias nativas en Electron.

---

## 3. Comparación de Librerías para Hole Punching

| Librería npm | Estado / Mantenimiento | Evaluado para Emu Latam |
| :--- | :--- | :--- |
| `utp-punch` | Inactiva hace años, atada a µTP | Rechazada por falta de flexibilidad sobre el payload RetroArch. |
| `udp-hole-puncher` | Básica, no soporta multiplexación | Rechazada por no gestionar topología Multi-Peer ni relays. |
| **Implementación Propia (`p2p-udp-engine`)** | Diseñada a la medida | **Seleccionada.** Nos permite unificar STUN detection, Hole Punching, LAN bypass y UDP Proxy Relay en un módulo TypeScript modular de ~500 líneas. |

---

## 4. Estrategia de Relay: Host Local vs VPS Externo

```
[Escenario A: Relay en VPS External]
Peer A (Guest) ---> Internet (50ms) ---> VPS Relay ---> Internet (50ms) ---> Peer B (Host)
Latencia Total: ~100ms + Costo de infraestructura mensual.

[Escenario B: Relay en el Host de la Sala]  <--- ELEGIDO
Peer A (Guest) ------------------------> Internet (55ms) ------------------> Peer B (Host)
Latencia Total: ~55ms + Costo $0 USD.
```

Al designar al **Host de la sala** (quien ya está ejecutando la instancia principal de RetroArch Netplay) como el nodo Relay para aquellos Guests con NAT Restrictivo, eliminamos la necesidad de alquilar servidores TURN/VPS en la nube. El Host simplemente recibe el paquete del Guest A en su socket P2P, lo entrega localmente a RetroArch en `127.0.0.1:55435` y reenvía una copia a los Guests B, C, etc.

---

## 5. Análisis de Riesgos y Mitigaciones

| Riesgo Técnico | Impacto | Mitigación Implementada |
| :--- | :--- | :--- |
| **Symmetric NAT en ambos peers** | Alto (Imposible conectar directamente) | El Host actúa como Relay. Si el Host también tiene Symmetric NAT extremo que impide recibir tráfico de puertos arbitrarios, Nakama notificará la incompatibilidad y sugerirá rotar el rol de Host a un peer con NAT abierto/Cone. |
| **Cierre de puerto NAT por inactividad** | Medio (Desconexión a mitad de juego) | Hilo de *Keepalive* enviando datagramas nulos de 4 bytes cada 15s. |
| **Conflicto de Puertos en Host** | Bajo (Error `EADDRINUSE`) | Bindeo dinámico mediante `socket.bind(0)` para que el SO asigne un puerto efímero libre automáticamente. |
| **Overhead de CPU en Node.js Main Process** | Medio (Jitter en el juego) | Uso de `Buffer` pre-asignados, procesamiento síncrono ultra-rápido de headers y evitación de serialización JSON en el *hot path* de juego (solo buffers binarios). |

---

## 6. Dependencias npm Propuestas

Para mantener el proyecto libre de vulnerabilidades y con un bundle liviano, se reduce el número de librerías al mínimo absoluto:

```json
{
  "dependencies": {
    "stun": "^1.0.10",
    "debug": "^4.3.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "vitest": "^1.2.0"
  }
}
```
* **`stun` (npm):** Para realizar consultas rápidas a servidores STUN públicos gratuitos (ej: `stun.l.google.com:19302`) y resolver el mapeo `IP_publica:Puerto_publico` y NAT Type.
* **Módulos nativos Node.js (cero instalación):** `dgram`, `os`, `crypto`, `events`, `net`.
