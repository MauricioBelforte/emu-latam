# 01 - Requerimientos del Sistema P2P Propio (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-26
> **Versión:** 1.2
> **Cambios:** Documentación de la investigación WAN desde celular (conexión fallida por router ISP no aplica UPnP). Fix crítico en `waitForRelayAck` (evento incorrecto).

---

## 1. Definición del Problema

Emu Latam actualmente depende de servicios externos para conectar jugadores: Tailscale (VPN mesh) y Bore (túnel público). Ambos introducen dependencias que el proyecto no controla.

**El problema real:** Dos PCs en internet no pueden hablar directamente porque están detrás de NAT. Se necesita:

1. Descubrir las IPs públicas de cada jugador (vía STUN + señalización Nakama)
2. Intentar conexión directa (UDP hole punching con backoff exponencial, ~2.8s máximo)
3. Cuando falle, relay en el host (sin servidores externos)

---

## 2. Objetivos del Sistema

### MVP (Completado)
- ✅ Módulo standalone `p2p-module/` con hole punching + STUN + relay propio
- ✅ Soporte LAN (broadcast UDP) + WAN (IP manual)
- ✅ 29 tests unitarios
- ✅ Relay en el host como fallback sin terceros

### WAN Manual (Investigado - Julio 2026)
- Conexión WAN vía IP pública + puerto P2P (sin Nakama, sin bore, sin Tailscale)
- Host muestra IP pública detectada vía STUN
- Guest ingresa IP:puerto manualmente
- Hole punching automático con relay fallback
- ⚠️ **REALIDAD:** Funciona solo si el router del ISP aplica UPnP. En nuestro test, el router reporta UPnP OK pero no forwardea el puerto (puerto cerrado desde internet).
- ❌ **No funciona desde celular** porque el router del host no reenvía el puerto a pesar de UPnP exitoso.

### Largo Plazo
- Cifrado opcional con `tweetnacl`
- UPnP / NAT-PMP como mejora (ya implementado pero router no coopera)
- Host migration básica

---

## 3. Requerimientos Funcionales

| ID | Nombre | Descripción | Prioridad |
|:---|:---|:---|:---|
| RF-01 | Rendezvous vía Nakama | Usar Nakama existente como canal de señalización. No levantar otro servidor. | Alta |
| RF-02 | Publicación de candidatos (host) | Al crear sala, publicar candidatos: IP pública, IPs privadas, puerto UDP, NAT type | Alta |
| RF-03 | Publicación de candidatos (guest) | Al unirse, el guest obtiene candidatos del host y publica los suyos | Alta |
| RF-04 | Detección de NAT type | Clasificar NAT en Cone o Symmetric usando 2 servidores STUN públicos | Alta |
| RF-05 | Hole punching UDP | Envío simultáneo de PUNCH con backoff exponencial (400/800/1600ms) | Alta |
| RF-06 | Conexión directa | Tráfico de juego viaja directo entre peers si punching funciona | Alta |
| RF-07 | Relay en el host | Si punching falla, host reenvía tráfico con socket dedicado por guest | Alta |
| RF-08 | Multi-guest | Host mantiene hasta 16 conexiones simultáneas (directas y/o relay) | Alta |
| RF-09 | Detección de LAN | Misma IP pública → probar IP privada primero. Carrera de candidatos. | Media |
| RF-10 | Keepalive | Paquete KEEPALIVE cada ~18s con contador de 3 misses para detectar caída | Alta |
| RF-11 | Detección de desconexión | 3 KEEPALIVE_ACK perdidos (~54s) → marcar como DISCONNECTED, liberar recursos | Alta |
| RF-12 | Proxy local RetroArch | Loopback 127.0.0.1:55435 para que RetroArch se conecte sin cambios | Alta |
| RF-13 | Puerto dinámico | `bind(0)` para evitar colisión con 55435 y 7350 | Alta |
| RF-14 | API IPC | `p2p:host-start`, `p2p:guest-join`, `p2p:cancel` + eventos de estado | Alta |
| RF-15 | Estados visuales | Eventos IPC con progreso: descubriendo, señalizando, punching, conectado (direct/relay) | Media |
| RF-16 | Versionado de protocolo | Header binario con campo de versión | Media |
| RF-17 | Aviso de caída de host | Detectar vía presencia Nakama y notificar a guests | Baja |
| RF-18 | UPnP automático | Al crear sala P2P, abrir puerto UDP vía UPnP en el router | Alta |
| RF-19 | Windows Firewall automático | Al crear sala P2P, crear regla de entrada en Windows Firewall vía netsh | Alta |
| RF-20 | WAN manual sin Nakama | Guest ingresa IP:puerto del host manualmente cuando no hay broadcast LAN | Alta |
| RF-21 | RELAY_REQUEST/ACK | Protocolo para que guest solicite relay al host cuando hole punch falla en WAN | Alta |

---

## 4. Requerimientos No Funcionales

| ID | Requisito | Meta |
|:---|:---|:---|
| RNF-01 | Overhead relay | < 5ms localhost, < 15ms LAN |
| RNF-02 | Tiempo de punching | ≤ 3 intentos, ~2.8s total (backoff exp: 400/800/1600ms) |
| RNF-03 | Concurrencia | 16 peers, CPU < 5% |
| RNF-04 | Memoria | < 15 MB RAM |
| RNF-05 | Sin binarios externos | Solo npm: `stun`, `nat-upnp`, opcional `tweetnacl` |
| RNF-06 | Validación de paquetes | Header con versión + sessionToken. Descartar inválidos. |
| RNF-07 | Detección de caída | ≤ 60s (3 keepalives perdidos a ~18s) |
| RNF-08 | UPnP no bloqueante | Si UPnP falla, el host sigue funcionando (solo LAN o con advertencia) |

---

## 5. Criterios de Aceptación

| ID | Escenario | Éxito |
|:---|:---|:---|
| CA-01 | Cone↔Cone en redes distintas | Directo en ≤ 3s, ≥ 80% intentos |
| CA-02 | Symmetric en al menos un lado | Relay automático, sin bloquear UI |
| CA-03 | Misma LAN | Conexión por IP privada, cero tráfico sale a internet |
| CA-04 | 16 guests simultáneos | Relay no mezcla paquetes, latencia dentro de márgenes |
| CA-05 | Guest muere abruptamente | Host detecta en ≤ 60s, libera recursos |
| CA-06 | Puerto P2P no colisiona | Nunca 55435 ni 7350 |
| CA-07 | RetroArch sin cambios | Apunta a 127.0.0.1:proxy, no modificado |
| CA-08 | Overhead relay | < 5ms en localhost |
| CA-09 | GGPO+P2P en LAN | Guest descubre host via P2P, ambos lanzan GGPO con IPs LAN | Prioritaria |
| CA-10 | WAN manual (IP:puerto) | Guest desde internet se conecta al host via relay 🔄 **No verificado** |
| CA-11 | UPnP abre puerto en router | Puerto UDP visible desde internet | ⚠️ **Router ISP no aplica UPnP** |
| CA-12 | Windows Firewall no bloquea | Regla netsh creada para el puerto P2P | ✅ |

---

## 6. Estado Real de Conexiones (Jul-2026)

| Método | Estado | Funciona en |
|:---|:---|:---|
| **Tailscale** | ✅ Funcional | Cualquier red (WAN/LAN) |
| **Bore (túnel público)** | ⚠️ Depende de bore.pub | Solo si red no bloquea bore.pub |
| **LAN directo** | ✅ Funcional | Misma red local (sin AP isolation) |
| **P2P Propio LAN** (broadcast) | ✅ Funcional | Misma red local |
| **P2P Propio WAN** (IP manual) | ❌ No funciona | Router ISP ignora UPnP, puerto cerrado |
| **Bootstrap verde** (Sala Pública) | ✅ Funcional | Con bore (WAN) o IP local (LAN) |
