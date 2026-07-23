# 01 - Requerimientos del Sistema P2P Propio (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Versión:** 1.1
> **Cambios:** Clasificación NAT simplificada a 2 buckets (Cone/Symmetric). Keepalive unificado con 3-strikes. Timeout de punching reducido a ~2.8s.

---

## 1. Definición del Problema

Emu Latam actualmente depende de servicios externos para conectar jugadores: Tailscale (VPN mesh) y Bore (túnel público). Ambos introducen dependencias que el proyecto no controla.

**El problema real:** Dos PCs en internet no pueden hablar directamente porque están detrás de NAT. Se necesita:

1. Descubrir las IPs públicas de cada jugador (vía STUN + señalización Nakama)
2. Intentar conexión directa (UDP hole punching con backoff exponencial, ~2.8s máximo)
3. Cuando falle, relay en el host (sin servidores externos)

---

## 2. Objetivos del Sistema

### MVP
- Reemplazar Tailscale y Bore para partidas 1v1
- Tasa de conexión exitosa ≥ 95% (hole punching + relay en host)
- Sin binarios externos, solo Node.js + librería `stun`
- Nakama como único servidor de señalización

### Mediano Plazo
- Soporte multi-peer (hasta 16 jugadores)
- Detección automática de LAN
- Autenticación de paquetes en el relay

### Largo Plazo
- Cifrado opcional con `tweetnacl`
- UPnP / NAT-PMP como mejora
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

---

## 4. Requerimientos No Funcionales

| ID | Requisito | Meta |
|:---|:---|:---|
| RNF-01 | Overhead relay | < 5ms localhost, < 15ms LAN |
| RNF-02 | Tiempo de punching | ≤ 3 intentos, ~2.8s total (backoff exp: 400/800/1600ms) |
| RNF-03 | Concurrencia | 16 peers, CPU < 5% |
| RNF-04 | Memoria | < 15 MB RAM |
| RNF-05 | Sin binarios externos | Solo npm: `stun`, opcional `tweetnacl` |
| RNF-06 | Validación de paquetes | Header con versión + sessionToken. Descartar inválidos. |
| RNF-07 | Detección de caída | ≤ 60s (3 keepalives perdidos a ~18s) |

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
