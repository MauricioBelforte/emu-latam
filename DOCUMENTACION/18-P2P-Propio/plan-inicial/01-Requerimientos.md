# 01 - Requerimientos del Sistema P2P Propio

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Estado:** Plan inicial
> **Versión:** 1.0

---

## 1. Definición del Problema

Emu Latam actualmente depende de servicios externos para conectar jugadores:

- **Tailscale** — VPN mesh que requiere instalación de software externo y servidores de coordinación de terceros
- **Bore** — Túnel público que pasa tráfico por servidores ajenos y añade latencia

Ambos introducen dependencias que el proyecto no controla: pueden cambiar sus términos, dejar de funcionar, o tener downtime. Además, ninguno está diseñado para gaming retro (1v1 UDP de baja latencia) sino como soluciones generales de tunneling.

**El problema real:** Dos PCs en internet no pueden hablar directamente porque están detrás de NAT (routers). Se necesita un mecanismo que:

1. Descubra las IPs públicas de cada jugador
2. Intente una conexión directa (UDP hole punching)
3. Cuando falle, provea un fallback que no dependa de servidores externos

---

## 2. Objetivos del Sistema

### 2.1 Corto Plazo (MVP)
- Reemplazar Tailscale y Bore para partidas 1v1
- Tasa de conexión exitosa ≥ 95% (hole punching + relay en host)
- Sin dependencias de binarios externos
- Nakama como único servidor de señalización

### 2.2 Mediano Plazo
- Soporte multi-peer (hasta 16 jugadores)
- Detección automática de peers en la misma LAN
- Host migration en caso de desconexión del host

### 2.3 Largo Plazo
- Métricas de red en la UI (RTT, jitter, packet loss)
- UPnP / NAT-PMP como mejora opcional
- IPv6 directo cuando esté disponible

---

## 3. Requerimientos Funcionales

| ID | Requerimiento | Descripción |
|:---|:---|:---|
| **RF-01** | Servicio P2P local | El host debe iniciar un socket UDP dinámico que escuche conexiones entrantes y maneje hole punching + relay |
| **RF-02** | Señalización vía Nakama | Intercambiar candidatos (IP pública, IP privada, puerto, NAT type) usando mensajes de match de Nakama |
| **RF-03** | Detección de NAT type | Clasificar el NAT local usando STUN: Full Cone, Restricted Cone, Port Restricted Cone, Symmetric |
| **RF-04** | Detección de misma LAN | Si dos peers comparten subred, usar IP privada directa (evitar hairpin NAT) |
| **RF-05** | UDP Hole Punching | Enviar ráfagas coordinadas de paquetes UDP para abrir agujeros en el NAT |
| **RF-06** | Relay fallback en host | Si hole punching falla, el host reenvía paquetes UDP entre los peers |
| **RF-07** | Proxy local para RetroArch | Exponer `127.0.0.1:55435` localmente para que RetroArch se conecte sin cambios |
| **RF-08** | Keepalive | Mantener abiertos los mappings NAT con paquetes periódicos (15s) |
| **RF-09** | Heartbeat y timeout | Detectar peers caídos (heartbeat 5s, timeout 30s sin respuesta) |
| **RF-10** | Multi-peer (host relay) | Hasta 16 peers simultáneos con aislamiento de sesión |
| **RF-11** | API IPC | Handlers: `p2p:start`, `p2p:connect`, `p2p:stop`, `p2p:getStatus` + eventos de estado |
| **RF-12** | UI con progreso visual | Spinner + mensajes de estado (STUN, señalizando, perforando, conectado/relay) |
| **RF-13** | Versionado de protocolo | Encabezado binario con versión para compatibilidad futura |
| **RF-14** | Integración con RETAR | El botón "RETAR" lanza el flujo P2P completo |
| **RF-15** | Host migration (futuro) | Si el host cae, re-elegir un nuevo host entre los peers restantes |

---

## 4. Requerimientos No Funcionales

| ID | Requisito | Meta |
|:---|:---|:---|
| RNF-01 | Overhead de relay | < 2ms en misma máquina, < 5ms en LAN |
| RNF-02 | Latencia P2P directo | RTT real de internet (sin overhead adicional) |
| RNF-03 | Concurrencia | 16 peers simultáneos, CPU < 5% en quad-core |
| RNF-04 | Memoria | < 15 MB RAM |
| RNF-05 | Sin binarios externos | Solo Node.js puro + npm ligeras |
| RNF-06 | Validación de paquetes | Magic bytes + session ID para descartar tráfico inválido |
| RNF-07 | Tiempo de conexión | < 8s desde que se inicia el reto hasta que RetroArch se lanza |

---

## 5. Alcance

### In-Scope
- Módulo TypeScript en `src/main/p2p/`
- Implementación completa de STUN client, hole punching, relay, proxy local
- Integración IPC con React
- Señalización sobre Nakama (sin servidor extra)
- Tests unitarios y de integración

### Out-of-Scope
- Servidores TURN externos o VPS
- Modificación de RetroArch
- Cifrado DTLS/TLS sobre el flujo de juego (lo maneja RetroArch)
- Re-transmisión confiable (lo maneja RetroArch)

---

## 6. Criterios de Aceptación

| ID | Escenario | Éxito |
|:---|:---|:---|
| CA-01 | Ambos peers con NAT abierto/cone | Hole punching exitoso, tráfico directo, latencia mínima |
| CA-02 | Un peer con Symmetric NAT | Fallo de hole punching → relay en host, juego arranca |
| CA-03 | Misma red LAN | Detecta subred común, conecta por IP privada, latencia < 3ms |
| CA-04 | Keepalive | Mappings NAT abiertos después de 5 min sin tráfico de juego |
| CA-05 | Timeout de peer | Detecta desconexión en < 35s |
| CA-06 | Multi-peer (4 jugadores) | Host relay maneja 3 guests simultáneamente sin mezclar paquetes |
| CA-07 | Señalización Nakama | Intercambio de candidatos completo en < 2s |
