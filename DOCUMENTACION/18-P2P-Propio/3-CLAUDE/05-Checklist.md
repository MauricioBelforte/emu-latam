# 05 — Checklist de Implementación: Sistema P2P Propio para Emu Latam

> **Módulo:** 18-P2P-Propio · **Documento:** 5/5 · **Fecha:** 2026-07-23
> **Ver también:** [01-Requerimientos.md](./01-Requerimientos.md) · [02-Analisis.md](./02-Analisis.md) · [03-Diseno.md](./03-Diseno.md) · [04-Codigo.md](./04-Codigo.md)

---

## 1. Resumen

Plan de implementación dividido en 3 fases: **MVP** (reemplaza Tailscale/Bore en el caso básico), **Mejoras** (robustez, multi-guest, seguridad) y **Avanzado** (optimizaciones opcionales). Cada tarea tiene una estimación de complejidad y, cuando corresponde, referencia directa al documento donde está especificada.

**Leyenda de complejidad:** 🟢 Baja (horas) · 🟡 Media (1–3 días) · 🔴 Alta (varios días, puede requerir iteración)

---

## 2. Fase 1 — MVP (Mínimo Viable)

Objetivo: 1 host + 1 guest, conexión directa cuando el NAT lo permite, relay cuando no, disparado desde el botón "RETAR" existente.

| # | Tarea | Complejidad | Referencia |
|---|---|---|---|
| 1.1 | Definir tipos compartidos (`protocol/types.ts`) | 🟢 | [04-Codigo.md §3](./04-Codigo.md#3-interfaces-y-types-principales) |
| 1.2 | Implementar encode/decode del paquete binario (`protocol/packet.ts`) + tests unitarios | 🟢 | [04-Codigo.md §3](./04-Codigo.md#3-interfaces-y-types-principales) |
| 1.3 | Implementar `PortAllocator` (`bind(0)` + lectura de puerto real) | 🟢 | [03-Diseno.md §9](./03-Diseno.md#9-estrategia-de-puertos) |
| 1.4 | Implementar `UDPTransport` (wrapper sobre `dgram`, demux por dirección remota) | 🟡 | [04-Codigo.md §2](./04-Codigo.md#2-estructura-de-archivos-y-carpetas-propuesta) |
| 1.5 | Integrar librería `stun` y armar `NatDetector` (clasificación Cone / Symmetric) | 🟡 | [04-Codigo.md §4.4](./04-Codigo.md#44-detectnattype) |
| 1.6 | Implementar `SignalingChannel` sobre el match de Nakama existente (opcodes 100–103) | 🟡 | [03-Diseno.md §7.1](./03-Diseno.md#71-señalización-vía-nakama-json) |
| 1.7 | Implementar `HolePuncher` (envío simultáneo + backoff, corte inmediato en Symmetric-Symmetric) | 🟡 | [04-Codigo.md §4.2](./04-Codigo.md#42-doholepunchpeerinfo) |
| 1.8 | Implementar `RelayServer` básico (1 host ↔ 1 guest, sin autenticación todavía) | 🟡 | [04-Codigo.md §4.3](./04-Codigo.md#43-startrelayconnections--relayserver) |
| 1.9 | Implementar `LoopbackProxy` (traducción RetroArch ↔ transporte P2P) | 🔴 | [02-Analisis.md §4](./02-Analisis.md#4-justificación-de-decisiones-técnicas-clave) |
| 1.10 | Implementar `KeepAliveService` básico | 🟢 | [04-Codigo.md §4.5](./04-Codigo.md#45-keepalive) |
| 1.11 | Implementar `StateMachine` con los estados del MVP | 🟡 | [03-Diseno.md §8](./03-Diseno.md#8-manejo-de-estados-máquina-de-estados) |
| 1.12 | Implementar `P2PManager` (orquestador, conecta todas las piezas) | 🔴 | [04-Codigo.md §4.1](./04-Codigo.md#41-startp2pservice) |
| 1.13 | Registrar handlers IPC (`p2p:host-start`, `p2p:guest-join`, `p2p:cancel`) | 🟢 | [04-Codigo.md §5.1](./04-Codigo.md#51-dónde-se-agrega-en-el-main-process) |
| 1.14 | Conectar el botón "RETAR" existente al nuevo flujo IPC | 🟢 | [04-Codigo.md §5.2](./04-Codigo.md#52-cómo-se-llama-desde-react) |
| 1.15 | UI: estados básicos (conectando / conectado / error) | 🟢 | [03-Diseno.md §6](./03-Diseno.md#6-api-ipc-interfaz-react--electron) |
| 1.16 | Prueba manual: 1 host + 1 guest en redes distintas, ambos Cone | 🟡 | Ver matriz en [§6](#6-matriz-de-pruebas-manuales) |
| 1.17 | Prueba manual: forzar fallo de punching y verificar fallback a relay | 🟡 | Ver matriz en [§6](#6-matriz-de-pruebas-manuales) |

---

## 3. Fase 2 — Mejoras

Objetivo: robustez para uso real — múltiples guests, LAN, desconexiones, seguridad básica del relay.

| # | Tarea | Complejidad | Referencia |
|---|---|---|---|
| 2.1 | Autenticación de sala: `registerAuthorizedPeer` + validación de `sessionToken` en el relay | 🟡 | [02-Analisis.md §5](./02-Analisis.md#5-riesgos-identificados-y-mitigaciones) |
| 2.2 | Soporte multi-guest en `RelayServer` (tabla de rutas + socket local dedicado por guest) | 🔴 | [04-Codigo.md §4.3](./04-Codigo.md#43-startrelayconnections--relayserver) |
| 2.3 | Detección de LAN por comparación de IP pública + carrera de candidatos (LAN vs. directo vs. relay) | 🟡 | [03-Diseno.md §4.5](./03-Diseno.md#45-misma-red-lan--detección-y-bypass) |
| 2.4 | Manejo explícito de desconexión y liberación de recursos (`handlePeerDisconnect`) | 🟡 | [04-Codigo.md §4.6](./04-Codigo.md#46-handlepeerdisconnect) |
| 2.5 | Aviso de caída de host vía presencia de Nakama (RF-17) | 🟡 | [01-Requerimientos.md §4](./01-Requerimientos.md#4-requerimientos-funcionales) |
| 2.6 | UI: spinner detallado, mapeo completo de `PeerState` a mensajes visibles | 🟢 | [03-Diseno.md §8](./03-Diseno.md#8-manejo-de-estados-máquina-de-estados) |
| 2.7 | Logging local configurable, con IPs enmascaradas fuera de modo debug | 🟢 | [01-Requerimientos.md §5](./01-Requerimientos.md#5-requerimientos-no-funcionales) |
| 2.8 | Hardening del socket público: descartar paquetes con versión/formato inválido, rate-limit por IP de origen | 🟡 | [02-Analisis.md §5](./02-Analisis.md#5-riesgos-identificados-y-mitigaciones) |
| 2.9 | Test de carga: 16 peers simulados contra 1 host (mock de red) | 🔴 | Ver [§6](#6-matriz-de-pruebas-manuales) |
| 2.10 | Solicitud de excepción de firewall de Windows durante la instalación | 🟡 | [01-Requerimientos.md §7](./01-Requerimientos.md#7-restricciones-técnicas) |

---

## 4. Fase 3 — Avanzado (mejoras opcionales, no bloqueantes)

| # | Tarea | Complejidad | Referencia |
|---|---|---|---|
| 3.1 | Cifrado/autenticación fuerte con `tweetnacl` (`secretbox`) sobre el payload de `RELAY_DATA` | 🟡 | [02-Analisis.md §6](./02-Analisis.md#6-dependencias-externas-npm) |
| 3.2 | UPnP/NAT-PMP oportunista como técnica adicional junto al hole punching | 🔴 | [01-Requerimientos.md §3.3](./01-Requerimientos.md#33-largo-plazo-mejoras-oportunistas-no-bloqueantes-para-el-reemplazo-de-tailscalebore) |
| 3.3 | Punching asimétrico: intentar igual cuando sólo un lado es Symmetric | 🟡 | [02-Analisis.md §2.4](./02-Analisis.md#24-nota-técnica-hole-punching-cuando-sólo-un-lado-es-simétrico) |
| 3.4 | Sub-clasificación fina de NAT (Full/Restricted/Port-Restricted Cone) si se agrega STUN propio con `CHANGE-REQUEST` | 🔴 | [04-Codigo.md §4.4](./04-Codigo.md#44-detectnattype) |
| 3.5 | Puerto externo preferido configurable (para port-forwarding manual del router) | 🟢 | [03-Diseno.md §9](./03-Diseno.md#9-estrategia-de-puertos) |
| 3.6 | Métricas de calidad de conexión (jitter, pérdida estimada) expuestas en la UI | 🟡 | [01-Requerimientos.md §6.2](./01-Requerimientos.md#62-fuera-de-alcance-por-ahora) |
| 3.7 | Continuidad de sesión tras caída del host original, dentro de lo que permite RetroArch netplay | 🔴 | [01-Requerimientos.md §6.2](./01-Requerimientos.md#62-fuera-de-alcance-por-ahora) |

---

## 5. Tareas de testing

| Tipo | Archivo / alcance | Qué cubre |
|---|---|---|
| Unitario | `protocol/packet.test.ts` | Round-trip encode/decode; descarte de paquetes truncados |
| Unitario | `PortAllocator.test.ts` | `bind(0)` devuelve puertos distintos en llamadas concurrentes |
| Unitario | `NatDetector.test.ts` | Clasificación correcta con respuestas STUN simuladas (mismo puerto ⇒ cone, distinto ⇒ symmetric; sin respuesta ⇒ symmetric por seguridad) |
| Unitario | `HolePuncher.test.ts` | Backoff correcto, máximo de intentos, corte inmediato en Symmetric-Symmetric |
| Unitario | `RelayServer.test.ts` | No mezcla paquetes entre 2+ `peerId` simulados; descarta `sessionToken` no registrados |
| Unitario | `StateMachine.test.ts` | Sólo permite las transiciones válidas de [03-Diseno.md §8](./03-Diseno.md#8-manejo-de-estados-máquina-de-estados) |
| Integración | Dos procesos Node reales sobre loopback, con un proxy intermedio que reasigna puertos para simular NAT Symmetric | Valida el flujo completo de punching + fallback a relay sin depender de redes reales |
| Integración | 16 guests simulados contra 1 host | Valida RF-08 (concurrencia) y que `RelayServer` no degrada por debajo de los límites de latencia definidos |

### 6. Matriz de pruebas manuales

| Escenario | Resultado esperado |
|---|---|
| LAN ↔ LAN | Conexión directa por IP privada; cero tráfico de juego sale a internet (verificable con Wireshark) |
| WAN, Cone ↔ Cone | Conexión directa por hole punching, ≤ 3s |
| WAN, Symmetric ↔ Cone | MVP: cae a relay. Con tarea 3.3 implementada: puede lograr conexión directa |
| WAN, Symmetric ↔ Symmetric | Relay inmediato, sin intento de punching |
| Firewall de Windows activo, sin excepción configurada | Falla hasta aplicar la excepción (validar que el flujo de instalación la solicite, tarea 2.10) |
| Kill abrupto (`kill -9` / cierre forzado) de un guest | El host detecta la desconexión en ≤ 60s y libera el socket local dedicado y la entrada de la tabla de relay |
| 16 guests simultáneos, mezcla de directo y relay | Ningún guest recibe tráfico de otro; latencia de relay dentro de los márgenes de [01-Requerimientos.md §5](./01-Requerimientos.md#5-requerimientos-no-funcionales) |

---

## 7. Tareas de documentación

- [ ] `README.md` propio del módulo `src/main/p2p/`, con diagrama resumen y enlaces a estos 5 documentos.
- [ ] Comentarios JSDoc en las funciones públicas de cada clase (`P2PManager`, `RelayServer`, `NatDetector`, etc.).
- [ ] Mantener [03-Diseno.md](./03-Diseno.md) actualizado si el diseño cambia durante la implementación (los diagramas son la fuente de verdad del comportamiento esperado).
- [ ] Documentar en el flujo de instalación el paso de excepción de firewall de Windows (tarea 2.10).
- [ ] Nota de migración para quien mantenga el código: mapa Tailscale/Bore → P2P propio (ya adelantado en [04-Codigo.md §5.2](./04-Codigo.md#52-cómo-se-llama-desde-react)).

---

## 8. Dependencias entre tareas

| Tarea | Depende de |
|---|---|
| `UDPTransport` (1.4) | `PortAllocator` (1.3), `protocol/packet.ts` (1.2) |
| `NatDetector` (1.5) | `UDPTransport` (1.4), librería `stun` |
| `HolePuncher` (1.7) | `UDPTransport` (1.4), `protocol/packet.ts` (1.2), `NatDetector` (1.5) |
| `RelayServer` básico (1.8) | `UDPTransport` (1.4), `protocol/packet.ts` (1.2), `SignalingChannel` (1.6) |
| `LoopbackProxy` (1.9) | `PortAllocator` (1.3) |
| `KeepAliveService` (1.10) | `UDPTransport` (1.4), `protocol/packet.ts` (1.2) |
| `P2PManager` (1.12) | 1.3 a 1.11 (todas las piezas de Fase 1) |
| Handlers IPC (1.13) | `P2PManager` (1.12) |
| Botón "RETAR" + UI básica (1.14, 1.15) | Handlers IPC (1.13) |
| Detección de LAN (2.3) | `SignalingChannel` (1.6), `NatDetector` (1.5) |
| Multi-guest en relay (2.2) | `RelayServer` básico (1.8) |
| Autenticación de sala (2.1) | `SignalingChannel` (1.6), `RelayServer` básico (1.8) |
| Hardening del socket (2.8) | `UDPTransport` (1.4) |
| Cifrado `tweetnacl` (3.1) | `protocol/packet.ts` (1.2, extensión del payload), Autenticación de sala (2.1) |
| UPnP oportunista (3.2) | `PortAllocator` (1.3) |
| Punching asimétrico (3.3) | `HolePuncher` (1.7), `NatDetector` (1.5) |

---

## 9. Referencias cruzadas

- Requerimientos y criterios de aceptación que cada tarea satisface → [01-Requerimientos.md](./01-Requerimientos.md)
- Justificación técnica de las decisiones detrás de cada módulo → [02-Analisis.md](./02-Analisis.md)
- Arquitectura, diagramas de flujo y protocolo que implementa cada tarea → [03-Diseno.md](./03-Diseno.md)
- Estructura de archivos, interfaces y pseudocódigo de referencia → [04-Codigo.md](./04-Codigo.md)
