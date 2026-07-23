# 01 — Requerimientos: Sistema P2P Propio para Emu Latam

> **Módulo:** 18-P2P-Propio · **Documento:** 1/5 · **Fecha:** 2026-07-23
> **Ver también:** [02-Analisis.md](./02-Analisis.md) · [03-Diseno.md](./03-Diseno.md) · [04-Codigo.md](./04-Codigo.md) · [05-Checklist.md](./05-Checklist.md)

---

## 1. Resumen ejecutivo

Emu Latam necesita reemplazar Tailscale y Bore Tunnel por un sistema de conexión P2P propio, construido sobre el stack existente (Electron + Node.js + TypeScript), que use el servidor Nakama ya desplegado como único canal de señalización. El objetivo no es "reinventar WebRTC", sino resolver el problema puntual que hoy resuelven dos servicios externos: **que dos PCs detrás de NAT encuentren la forma de intercambiar los paquetes UDP de RetroArch netplay sin depender de un tercero pago.**

Este documento define **qué** debe hacer el sistema y **con qué calidad**. El **cómo** se desarrolla en [02-Analisis.md](./02-Analisis.md) (justificación técnica) y [03-Diseno.md](./03-Diseno.md) (arquitectura).

---

## 2. Definición del problema

### 2.1 Contexto

El flujo actual de Emu Latam depende de dos servicios externos para el 100% de las partidas que no ocurren en la misma LAN:

| Modo actual | Problema |
|---|---|
| Bore Tunnel | Depende de `bore.pub` (disponibilidad, latencia del relay, fuera de control del proyecto) |
| Tailscale | Requiere cuenta, tiene límites de plan gratuito, agrega una capa de VPN completa (interfaz de red virtual) para resolver un problema que en el fondo es de un solo puerto UDP |

Ambos resuelven correctamente el problema, pero como servicios de terceros no controlables, no auditables en su comportamiento interno, y con riesgo de discontinuación o cambio de términos.

### 2.2 El problema real (por qué no alcanza con "conectar a la IP del rival")

Dos PCs conectadas a internet residencial casi nunca tienen una IP pública propia: están detrás de un router que hace **NAT (Network Address Translation)**. El router traduce la IP privada de la PC (p. ej. `192.168.1.50`) a la IP pública del hogar, y sólo mantiene esa traducción "abierta" para el tráfico entrante mientras exista un mapping activo — típicamente creado porque *la PC de adentro* mandó primero un paquete hacia afuera.

Esto significa que, para que dos jugadores se conecten, hace falta resolver tres problemas en orden:

1. **Descubrimiento** — cada uno necesita saber la IP:puerto público del otro (y no siempre alcanza con eso, ver punto 3).
2. **NAT Traversal** — cada router necesita tener un mapping abierto que permita que el paquete del otro jugador entre. Esto se logra con *hole punching*: ambos peers mandan un paquete "hacia afuera" en simultáneo, lo que abre el mapping en ambos NATs casi al mismo tiempo, permitiendo que los paquetes del otro lado entren como si fueran una respuesta esperada.
3. **Fallback realista** — con NAT tipo *Symmetric* (común en redes corporativas, algunas 4G/5G y ciertos routers ISP), el mapping que abre el router es distinto para cada IP:puerto de destino, lo que hace que el hole punching descrito en el punto 2 **no funcione de forma determinística**. En este escenario, la única solución sin infraestructura adicional es que un tercero con conectividad simétrica reenvíe el tráfico — en este proyecto, ese tercero es el propio **host** de la partida.

El detalle completo de tipos de NAT y por qué cada uno se comporta distinto está en [02-Analisis.md §2](./02-Analisis.md#2-análisis-del-dominio).

---

## 3. Objetivos

### 3.1 Corto plazo (MVP — reemplazo funcional mínimo)

- Un host puede iniciar una sala y un guest puede conectarse a él, con conexión directa P2P cuando el NAT lo permite.
- Cuando el hole punching falla, el guest cae automáticamente a un relay servido por el host, sin intervención manual.
- El flujo completo se dispara desde el botón "RETAR" existente, sin requerir que el usuario instale ni configure nada adicional (a diferencia de Tailscale, que exige login).
- RetroArch se lanza sin ninguna modificación de su binario ni de su configuración de netplay.

### 3.2 Mediano plazo (robustez)

- Clasificación real de los 4 tipos de NAT para tomar decisiones informadas (saltar directamente a relay cuando corresponde, en vez de perder tiempo intentando algo condenado a fallar).
- Detección de LAN para evitar salir a internet cuando dos jugadores están en la misma red (evita el problema de *hairpin NAT*, donde el router no siempre sabe rutear de vuelta hacia adentro un paquete que salió y volvió por la IP pública propia).
- Soporte estable para salas de hasta 16 jugadores, con el host relayando múltiples conexiones simultáneas sin mezclar tráfico.
- Manejo explícito de desconexiones (detección + liberación de recursos + aviso a la UI).

### 3.3 Largo plazo (mejoras oportunistas, no bloqueantes para el reemplazo de Tailscale/Bore)

- Port mapping automático vía UPnP/NAT-PMP como técnica adicional (mejora la tasa de conexión directa, no es indispensable).
- Autenticación/cifrado liviano del tráfico de datos para mitigar spoofing e inyección de paquetes falsos.
- Telemetría de calidad de conexión (jitter, pérdida estimada) visible para diagnóstico.
- Reelección de host ante desconexión del host original (con las limitaciones que impone el propio RetroArch, ver §6).

---

## 4. Requerimientos funcionales

| ID | Nombre | Descripción | Prioridad |
|---|---|---|---|
| RF-01 | Rendezvous vía Nakama | Usar el Nakama existente (`127.0.0.1:7350` del host) como canal de señalización. No se levanta ningún servidor de señalización adicional. | Alta |
| RF-02 | Publicación de candidatos (host) | Al crear la sala, el host publica en el match de Nakama sus candidatos de conexión: IP pública, IP(s) privada(s), puerto UDP público, tipo de NAT. | Alta |
| RF-03 | Publicación de candidatos (guest) | Al unirse, el guest obtiene del match los candidatos del host y publica los suyos propios por el mismo canal. | Alta |
| RF-04 | Detección de tipo de NAT | Clasificar el NAT propio en Full Cone / Restricted Cone / Port-Restricted Cone / Symmetric antes de intentar conectar, usando STUN. | Alta |
| RF-05 | Hole punching UDP | Cuando no se detecta Symmetric-Symmetric en ambos extremos, intentar abrir un canal directo por envío simultáneo de paquetes UDP ("candidatos" en orden de prioridad: LAN → directo público → relay). | Alta |
| RF-06 | Conexión directa | Si el hole punching tiene éxito, el tráfico de juego viaja directo entre los dos peers. | Alta |
| RF-07 | Relay en el host | Si el hole punching falla (timeout) o si corresponde saltarlo (Symmetric-Symmetric), el guest reenvía su tráfico a través de un socket de relay expuesto por el host. | Alta |
| RF-08 | Multi-guest | El host mantiene conexiones (directas y/o por relay, en cualquier combinación) simultáneas con hasta 16 guests. | Alta |
| RF-09 | Detección de LAN | Si host y guest resuelven la misma IP pública (vista desde STUN), priorizar conexión directa por IP privada antes de intentar hole punching por internet. | Media |
| RF-10 | Keepalive | Cada conexión activa envía paquetes de keepalive cada 15–20s para mantener vivo el mapping NAT y detectar caídas. | Alta |
| RF-11 | Detección de desconexión | Ante keepalives perdidos consecutivos, marcar al peer como desconectado, liberar sus recursos y notificar a la UI. | Alta |
| RF-12 | Puente RetroArch ↔ P2P | Exponer un proxy local (loopback) al que RetroArch se conecta como si fuera la IP del rival; el sistema reenvía ese tráfico por la red real. RetroArch nunca conoce la IP pública real del otro peer. | Alta |
| RF-13 | Selección dinámica de puerto | El puerto UDP del servicio P2P se obtiene del sistema operativo (no hardcodeado), sin colisionar con 55435 (RetroArch) ni 7350 (Nakama). | Alta |
| RF-14 | Integración IPC | El renderer (React) controla todo el ciclo (crear sala, unirse, cancelar, ver estado) exclusivamente vía handlers IPC del main process, replicando el patrón ya usado por `tailscale-host`/`tailscale-guest`. | Alta |
| RF-15 | Estados visuales | Emitir eventos de progreso consumibles por la UI: conectando, detectando NAT, punching, conectado directo, conectado por relay, error, desconectado. | Media |
| RF-16 | Versionado de protocolo | Todo paquete (señalización y datos) incluye un campo de versión de protocolo para negociar compatibilidad entre clientes de distinta versión. | Media |
| RF-17 | Aviso de caída de host | Ante desconexión del host, detectar el evento vía presencia de Nakama y notificar a los guests restantes. La reconexión completa de la partida en curso queda fuera de alcance del MVP (ver §6). | Baja |

---

## 5. Requerimientos no funcionales

| Categoría | Requerimiento | Métrica objetivo |
|---|---|---|
| Latencia | Overhead agregado por el relay sobre la latencia de red pura | < 5 ms en localhost · < 15 ms en LAN · best-effort en WAN (depende del uplink del host) |
| Latencia | Tiempo máximo antes de descartar hole punching y caer a relay | ≤ 3 intentos, ~2–3 segundos totales |
| Concurrencia | Peers simultáneos soportados por sala | Hasta 16 (1 host + 15 guests) |
| Confiabilidad | Tiempo de detección de caída de un peer | ≤ 60 s (3 keepalives perdidos a intervalos de 20 s) |
| Portabilidad | Sistemas operativos soportados | Windows, macOS, Linux (heredado de Electron) |
| Seguridad | El relay del host no debe poder usarse como reflector/amplificador de tráfico hacia terceros ajenos a la sala | Sólo reenvía entre pares registrados y autenticados para esa sala vía Nakama (ver [02-Analisis.md §5](./02-Analisis.md#5-riesgos-identificados-y-mitigaciones)) |
| Seguridad | Los paquetes de datos deben poder validarse como pertenecientes a la sesión activa | Token de sesión por paquete (ver [04-Codigo.md](./04-Codigo.md)) |
| Mantenibilidad | Cobertura de tests unitarios en protocolo, detección de NAT y relay | Suite Vitest ejecutable sin red real (sockets simulados) para los casos determinísticos |
| Observabilidad | Registro de eventos clave sin exponer IPs completas en logs compartidos/telemetría | Logging local, nivel configurable, IPs enmascaradas por defecto fuera de modo debug |
| Costo | No requerir infraestructura paga | 0 servicios de terceros de pago; el único servicio externo admitido es STUN público y gratuito (justificado en 02-Analisis.md) |

---

## 6. Alcance

### 6.1 Dentro de alcance

- Topología estrella: 1 host + hasta 16 guests (coincide con cómo ya funciona el netplay de RetroArch — ver [02-Analisis.md §2.5](./02-Analisis.md#25-topología-real-de-retroarch-netplay-por-qué-esto-simplifica-todo)).
- Señalización 100% sobre el Nakama existente.
- Hole punching UDP con fallback automático a relay en el host.
- Detección de los 4 tipos de NAT vía STUN público.
- Detección de LAN por comparación de IP pública.
- Keepalive y detección de desconexión.
- Integración IPC con el main process de Electron existente.
- Protocolo de paquetes versionado.

### 6.2 Fuera de alcance (por ahora)

- **Malla completa guest↔guest.** RetroArch netplay ya es cliente-servidor (todos los guests hablan con el host, no entre sí); no hay necesidad de resolverlo en la capa de transporte tampoco.
- **VPN de red completa** (interfaz virtual TUN/TAP al estilo Tailscale). Todo se resuelve a nivel de socket UDP de aplicación, no de interfaz de red — ver justificación en [02-Analisis.md §3](./02-Analisis.md#3-comparación-de-alternativas).
- **Reconexión in-game tras migración de host a mitad de partida.** El propio RetroArch netplay no soporta host migration nativamente; el sistema puede *detectar* la caída del host, pero no puede resucitar la partida en curso. Se documenta como limitación aceptada, no como bug.
- **Cifrado fuerte end-to-end en el MVP.** Se implementa autenticación liviana (token de sesión); cifrado completo con `tweetnacl` queda como mejora de Fase 3 ([05-Checklist.md](./05-Checklist.md)).
- **UPnP / NAT-PMP / PCP automático.** Mejora opcional de Fase 3, no indispensable porque el hole punching + relay ya cubre el 100% de los casos (con distinta latencia).
- **IPv6 nativo.** Se asume IPv4 + NAT, que es el escenario real de la enorme mayoría de conexiones residenciales hoy. Documentado como mejora futura.
- **Métricas de calidad de conexión en tiempo real** (jitter, pérdida) más allá de logging básico.

---

## 7. Restricciones técnicas

- **Lenguaje/entorno:** TypeScript sobre Node.js, ejecutando dentro del main process de Electron (acceso a `dgram` nativo).
- **Sin binarios externos:** sólo dependencias npm puras (nada de spawnear procesos auxiliares tipo `wireguard-go` o similares).
- **Puerto UDP dinámico:** el sistema elige un puerto libre en tiempo de ejecución; nunca hardcodeado.
- **Timeout de mapping NAT:** los mappings expiran típicamente entre 30–60s sin tráfico; el keepalive debe correr a un intervalo claramente menor (15–20s) con margen de seguridad.
- **NAT Simétrico:** debe detectarse y derivar a relay sin perder tiempo intentando un punching condenado a fallar entre dos simétricos (ver nota técnica sobre el caso "un simétrico + un cone" en [02-Analisis.md §2.4](./02-Analisis.md#24-nota-técnica-hole-punching-cuando-sólo-un-lado-es-simétrico)).
- **Latencia del relay:** < 5 ms en misma máquina, < 15 ms en misma red (medido como overhead agregado, no como latencia total).
- **Concurrencia:** hasta 16 peers simultáneos por sala.
- **RetroArch intocable:** el relay debe hablar el protocolo UDP de netplay de RetroArch (puerto 55435 por defecto) de forma transparente — sin parsear ni modificar su contenido, y sin requerir cambios en el binario ni la configuración de RetroArch más allá de apuntarlo a una IP:puerto local.
- **Sin privilegios elevados en el flujo normal:** el usuario no debería necesitar ejecutar la app como administrador para jugar una partida. Si hace falta una excepción de firewall de Windows, se gestiona una única vez en la instalación, no en cada partida.

---

## 8. Criterios de aceptación

| ID | Criterio | Cómo se verifica |
|---|---|---|
| CA-01 | Dos peers en redes distintas, ambos con NAT tipo Cone (cualquier variante), logran conexión directa en ≤ 3 s en ≥ 80% de los intentos. | Test manual con matriz de redes (ver [05-Checklist.md](./05-Checklist.md)) |
| CA-02 | Dos peers donde al menos uno tiene NAT Simétrico caen a relay automáticamente, sin bloquear la UI ni exceder el timeout configurado. | Test manual + test de integración con NAT simulado |
| CA-03 | Dos peers en la misma LAN nunca generan tráfico de juego por internet: se conectan por IP privada. | Test manual con captura de tráfico (Wireshark) filtrando por interfaz |
| CA-04 | El relay del host distingue correctamente el tráfico de hasta 16 guests simultáneos sin mezclar paquetes entre ellos. | Test de integración con tráfico sintético etiquetado por guest |
| CA-05 | Al matar abruptamente el proceso de un guest, el host detecta la desconexión en ≤ 60 s y libera los recursos asociados (socket local de forwarding, entrada en tabla de relay). | Test manual + test de integración |
| CA-06 | El puerto UDP del servicio P2P nunca coincide con 55435 ni 7350, incluso con 16 instancias simultáneas en la misma máquina (pruebas locales). | Test de integración |
| CA-07 | RetroArch no requiere ninguna modificación de binario ni configuración manual más allá de lo que ya exige hoy con Tailscale/Bore. | Revisión manual del flujo de lanzamiento |
| CA-08 | El overhead del relay medido en localhost es < 5 ms. | Test con timestamps embebidos en paquete de prueba |
| CA-09 | El botón "RETAR" existente dispara el flujo P2P sin cambios visibles en su posición/diseño, sólo en la lógica que invoca. | Revisión manual de UI |

---

## 9. Referencias cruzadas

- Justificación técnica de cada decisión → [02-Analisis.md](./02-Analisis.md)
- Arquitectura, diagramas de flujo y protocolo de paquetes → [03-Diseno.md](./03-Diseno.md)
- Estructura de código, interfaces y pseudocódigo → [04-Codigo.md](./04-Codigo.md)
- Plan de implementación por fases → [05-Checklist.md](./05-Checklist.md)
