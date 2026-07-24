# 01 - Requerimientos — Relay WAN para GGPO vía P2P

> **Módulo:** 19-GGPO-P2P-WAN
> **Fecha:** 2026-07-24
> **Versión:** 1.0

---

## 1. Definición del Problema

GGPO (fcadefbneo) se conecta vía UDP directo: Player 0 escucha en puerto 6003 y envía a Player 1 en puerto 6004; Player 1 escucha en 6004 y envía a Player 0 en 6003.

Actualmente el flujo de retos con método P2P y engine GGPO:
1. El host detecta su IP privada via `get-lan-ip()` y la envía al guest
2. El guest lanza GGPO conectando a esa IP privada
3. **Esto funciona solo en la misma red LAN**

Para conexiones entre países (WAN), las IPs privadas no son reachables. Se necesita un mecanismo que:
- Detecte automáticamente si es LAN o WAN
- En WAN, túnelice el tráfico UDP de GGPO a través del relay P2P existente
- No requiera configuración de router, apertura de puertos, ni servicios externos

---

## 2. Objetivos

### MVP
- GGPO funcional entre 2 PCs en distintas redes usando relay P2P
- Auto-detección LAN/WAN: si es LAN → directo (cero latencia extra), si es WAN → relay
- Sin modificar el módulo P2P existente (p2p-module/)
- Sin modificar el bridge RetroArch existente (p2pBridge.ts)
- Sin modificar el lanzador de GGPO (ggpo-launch)

### Criterios de Éxito
- Tasa de conexión exitosa WAN ≥ 90% (ambos detrás de NAT, sin puertos abiertos)
- Latencia añadida por relay < 15ms (localhost a localhost)
- 0 regresiones en flujo RetroArch+P2P, Tailscale+GGPO, LAN+GGPO

---

## 3. Alcance

### Incluye
- Nuevo bridge `client/src/main/ggpoP2PBridge.ts` (paralelo e independiente de `p2pBridge.ts`)
- 4 IPC handlers nuevos: `ggpo-p2p-host`, `ggpo-p2p-guest`, `ggpo-p2p-register-guest`, `ggpo-p2p-disconnect`
- Auto-detección LAN/WAN basada en `P2PManager.status === "lan_check"`
- Forwarder UDP local en guest (127.0.0.1:0 → P2P → relay)
- Relay UDP local en host (P2P → 127.0.0.1:6003, y 6003 → P2P)
- Modificaciones en ChallengeContext.tsx para usar los nuevos IPCs cuando engine==="ggpo"

### No Incluye
- Modificaciones a `p2p-module/` (P2PManager, RelayServer, etc.)
- Modificaciones a `client/src/main/p2pBridge.ts`
- Modificaciones al flujo de retos con RetroArch
- Modificaciones al flujo de retos con Tailscale
- Cifrado del tráfico relay (futuro)
- Multi-guest para GGPO (solo 1v1)

---

## 4. Requerimientos Funcionales

| ID | Nombre | Descripción | Prioridad |
|:---|:---|:---|:---|
| RF-01 | Auto-detección LAN/WAN | `ggpo-p2p-guest` detecta LAN via `P2PManager.status === "lan_check"` y retorna `isLan: true/false` | Alta |
| RF-02 | Forwarder UDP guest (WAN) | Crea socket UDP en 127.0.0.1:0; datos entrantes → RELAY_DATA → P2P transport; RELAY_DATA entrante → 127.0.0.1:6004 | Alta |
| RF-03 | Relay UDP host (WAN) | Tras registrar guest, crea socket local; datos de GGPO host (6003) → RELAY_DATA → guest; RELAY_DATA de guest → 127.0.0.1:6003 | Alta |
| RF-04 | IPC: ggpo-p2p-host | Inicia P2PManager como host, retorna candidate | Alta |
| RF-05 | IPC: ggpo-p2p-guest | Inicia P2PManager como guest, detecta LAN/WAN, crea forwarder si WAN | Alta |
| RF-06 | IPC: ggpo-p2p-register-guest | Host registra guest, crea relay local, retorna relayPort | Alta |
| RF-07 | IPC: ggpo-p2p-disconnect | Limpia forwarder, relay, y P2PManager(s) | Alta |
| RF-08 | Integración ChallengeContext | acceptChallenge y ACCEPT handler usan ggpo-p2p-* cuando engine==="ggpo" | Alta |
| RF-09 | Modo LAN directo | Si isLan=true, flujo actual (get-lan-ip + ggpo-launch directo, sin relay) | Alta |
| RF-10 | Puerto dinámico forwarder | forwarder usa bind(0) para evitar colisión con otros servicios | Media |
| RF-11 | Limpieza en desconexión | Al cerrar reto o desconectar, todos los sockets y P2PManagers se cierran | Alta |
| RF-12 | Sin interferencia | ggpoP2PBridge no comparte estado global con p2pBridge (tokenCounter separado) | Alta |

---

## 5. Requerimientos No Funcionales

| ID | Requisito | Meta |
|:---|:---|:---|
| RNF-01 | Latencia relay | < 15ms localhost (GGPO → forwarder → P2P → relay → GGPO host y vuelta) |
| RNF-02 | Sin nuevas dependencias | Solo dgram (built-in Node.js), P2PManager (ya existe) |
| RNF-03 | Aislamiento de fallos | Si ggpoP2PBridge falla, no afecta a p2pBridge ni al resto del sistema |
| RNF-04 | Memoria | < 5 MB adicionales (1 forwarder + 1 relay socket + 1 P2PManager) |
| RNF-05 | Tiempo de conexión | < 5s desde que se acepta el reto hasta que GGPO se lanza (WAN) |

---

## 6. Criterios de Aceptación

| ID | Escenario | Éxito |
|:---|:---|:---|
| CA-01 | Misma LAN | isLan=true, hostLanIp presente, relay NO activado |
| CA-02 | Distintas redes | isLan=false, forwarderPort presente, relay activado |
| CA-03 | WAN funcional | GGPO se conecta y sincroniza entre 2 PCs en distintas redes |
| CA-04 | Limpieza | Al cancelar reto, todos los sockets se cierran (no leak) |
| CA-05 | Regresión RetroArch | Flujo P2P+RA sigue funcionando idéntico |
| CA-06 | Regresión Tailscale GGPO | Flujo tailscale+GGPO sigue funcionando idéntico |
