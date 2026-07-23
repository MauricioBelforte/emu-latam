# 02 — Análisis Técnico: Sistema P2P Propio para Emu Latam

> **Módulo:** 18-P2P-Propio · **Documento:** 2/5 · **Fecha:** 2026-07-23
> **Ver también:** [01-Requerimientos.md](./01-Requerimientos.md) · [03-Diseno.md](./03-Diseno.md) · [04-Codigo.md](./04-Codigo.md) · [05-Checklist.md](./05-Checklist.md)

---

## 1. Resumen

Este documento justifica **por qué** el diseño de [03-Diseno.md](./03-Diseno.md) toma las decisiones que toma. La conclusión general, adelantada acá: **implementación propia y minimalista sobre `dgram`, con una única librería externa para STUN y otra opcional para autenticación de paquetes.** No WebRTC, no libp2p, no las librerías de hole punching encontradas en npm — todas están abandonadas o resuelven un problema más grande (y más pesado) del que hace falta acá.

---

## 2. Análisis del dominio

### 2.1 NAT: qué es y por qué rompe P2P

Un router doméstico con NAT traduce direcciones IP privadas (`192.168.x.x`, `10.x.x.x`) a la IP pública del hogar, y mantiene una tabla interna de *mappings*: `(IP privada, puerto privado) ↔ (IP pública, puerto público)`. Esa tabla sólo tiene entradas para tráfico que **salió primero desde adentro**. Un paquete que llega de afuera sin que exista un mapping previo simplemente se descarta — es, en esencia, un firewall con estado. Dos PCs con NAT no pueden "llamarse" directamente porque ninguna tiene, de entrada, un mapping abierto para la otra.

### 2.2 Tipos de NAT

El comportamiento exacto de cada router al crear y reutilizar mappings define qué tan difícil es atravesarlo:

| Tipo | Comportamiento al recibir tráfico entrante | Dificultad de traversal |
|---|---|---|
| **Full Cone** | Cualquier host externo puede mandar al mapping público una vez que existe, sin importar a quién le mandó el paquete saliente que lo creó. | Baja — trivial |
| **Restricted Cone** | Sólo acepta tráfico entrante desde la misma **IP** externa a la que se le mandó tráfico saliente (cualquier puerto de esa IP). | Baja-media |
| **Port-Restricted Cone** | Sólo acepta tráfico entrante desde la misma **IP:puerto** externo exactos a los que se le mandó tráfico saliente. | Media |
| **Symmetric** | Asigna un **mapping distinto** (puerto público distinto) por cada combinación de IP:puerto de **destino**. El mapping usado para hablarle a Nakama/STUN no sirve para que el otro peer lo use. | Alta — en muchos casos, imposible sin ayuda externa |

```
Full/Restricted/Port-Restricted Cone:          Symmetric:
  Local:5000 → STUN:3478  ⇒ Público:40000       Local:5000 → STUN:3478  ⇒ Público:40000
  Local:5000 → Peer:6000  ⇒ Público:40000       Local:5000 → Peer:6000  ⇒ Público:40871  (¡distinto!)
  (mismo puerto público para cualquier destino)  (puerto público cambia según el destino)
```

Esto es exactamente lo que hace que "preguntarle a un STUN cuál es mi IP:puerto público" alcance para los Cone, pero **no sirva de nada** para Symmetric: el puerto que ve el STUN nunca es el que va a ver el otro jugador.

### 2.3 Hole punching UDP: el mecanismo

La técnica (simultaneous open) es simple: ambos peers, coordinados vía señalización (acá, Nakama), mandan un paquete UDP hacia la IP:puerto público del otro **al mismo tiempo**. Cada paquete saliente abre el mapping en el NAT local. Si ambos mappings quedan abiertos antes de que llegue el primer paquete del otro lado, ese paquete entra como si fuera tráfico esperado — el NAT no tiene forma de distinguirlo de una respuesta legítima. A partir de ahí, ambos lados pueden mandarse tráfico libremente mientras el mapping se mantenga vivo (de ahí el requerimiento de keepalive, ver [03-Diseno.md §7](./03-Diseno.md#7-manejo-de-estados-máquina-de-estados)).

### 2.4 Nota técnica: hole punching cuando sólo un lado es simétrico

La literatura clásica de NAT traversal (el trabajo de referencia es Ford/Srisuresh/Kegel, *"Peer-to-Peer Communication Across Network Address Translators"*, USENIX 2005) muestra algo que no es intuitivo: el punching directo **puede** funcionar incluso si **uno solo** de los dos lados es Symmetric, siempre que el otro sea Cone (especialmente Full o Restricted Cone) — porque el lado Cone tiene un puerto público estable y predecible sin importar el destino, así que el lado Symmetric simplemente le apunta a ese puerto conocido. El caso genuinamente difícil (para el que hace falta relay sí o sí) es **Symmetric contra Symmetric**.

Este documento sigue el requerimiento tal como está definido en [01-Requerimientos.md](./01-Requerimientos.md) (Symmetric detectado → relay inmediato, sin intentar punching, por simplicidad y para no perder tiempo), pero deja documentada esta variante como posible optimización futura: intentar punching igual cuando el otro extremo es Cone, aunque el propio sea Symmetric. Queda anotado como mejora opcional en [05-Checklist.md](./05-Checklist.md), Fase 3 — no es necesario para el MVP y agrega una rama de lógica y testing extra que no vale la pena todavía.

### 2.5 Topología real de RetroArch netplay: por qué esto simplifica todo

RetroArch netplay ya es **cliente-servidor**, no malla: el proceso host corre la emulación autoritativa y cada guest se conecta únicamente al host (`--connect host_ip:55435`), nunca a otros guests. Esto es una simplificación enorme para este proyecto: el sistema P2P **no necesita resolver N×N conexiones entre guests**, sólo N conexiones Guest↔Host. El relay del host, en consecuencia, nunca tiene que reenviar tráfico "guest A → guest B" — sólo "guest → proceso RetroArch del host" y viceversa. Esto se refleja directamente en el diseño del relay ([03-Diseno.md §4](./03-Diseno.md#4-estructura-de-módulos-y-clases)).

### 2.6 STUN: qué es y para qué se usa acá

STUN (RFC 5389 y su predecesor RFC 3489) es un protocolo minúsculo: un cliente manda un `Binding Request` a un servidor STUN, y el servidor responde con la IP:puerto público **tal como los vio** (atributo `XOR-MAPPED-ADDRESS`). No negocia nada, no mantiene estado de sesión, no transporta tráfico de la aplicación — es sólo "un espejo" para que cada peer sepa cómo lo ve el resto de internet. Usar un STUN público (p. ej. de Google) **no** es "otro servidor de señalización": no coordina nada entre los dos jugadores, sólo le informa a cada uno su propia dirección pública. La señalización real (quién es quién, qué candidatos tiene cada uno, cuándo arrancar el punching) sigue siendo 100% Nakama, cumpliendo RF-01.

Consultando dos servidores STUN distintos (o el mismo servidor pero comparando el puerto reportado en dos intentos con sockets diferentes) también permite inferir si el NAT es Symmetric: si el puerto público reportado cambia según el destino, es Symmetric.

### 2.7 Relay: qué es acá (y qué no es)

El requerimiento pide específicamente que el **host actúe como relay**, no un TURN server dedicado. Conceptualmente es el mismo rol que cumple TURN en el mundo WebRTC (reenviar tráfico cuando el punching falla), pero implementado como una tabla de forwarding simple dentro del propio proceso del host — sin el protocolo TURN completo (que incluye autenticación por *long-term credentials*, allocations con lifetime, permisos por peer, channels, etc., pensado para un servidor compartido por desconocidos en internet). Acá el "servidor" es de confianza (es el propio host de la partida) y el conjunto de peers está cerrado (los de esa sala), así que un forwarding table simple con autenticación vía Nakama alcanza y sobra — ver [03-Diseno.md §6](./03-Diseno.md#6-protocolo-de-comunicación-formato-de-paquetes-udp).

---

## 3. Comparación de alternativas

### 3.1 WebRTC vs libp2p vs UDP hole punching a medida

| Criterio | WebRTC (vía `wrtc`/similares) | libp2p (js-libp2p) | UDP hole punching a medida (recomendado) |
|---|---|---|---|
| Dependencias | Requiere bindings nativos para usar WebRTC fuera del navegador — no es JS puro, complica el build/empaquetado multiplataforma de Electron (Win/Mac/Linux) | Stack modular grande (transporte, multiplexado, descubrimiento, DHT); trae mucho más de lo que este proyecto necesita | Sólo `dgram` (nativo) + una librería STUN chica |
| Overhead en el camino crítico | DTLS-SRTP + SCTP sobre los data channels agrega handshake y framing que no aportan nada acá (RetroArch ya tiene su propio manejo de pérdida/orden) | Multiplexado de streams (`mplex`/`yamux`) y stack de seguridad (`noise`) pensados para redes P2P genéricas, no para un solo flujo UDP de baja latencia | Ninguno: UDP crudo con un header binario mínimo |
| Hole punching real hoy | Maduro (es su caso de uso principal), pero pensado para navegador↔navegador | Los propios mantenedores de js-libp2p documentan públicamente que la implementación de hole punching (protocolo DCUtR) está poco desarrollada porque, sin QUIC, tiene problemas de timing — y el soporte de QUIC en Node.js todavía es incompleto. Además, DCUtR necesita primero una conexión vía **Circuit Relay v2** como paso previo obligatorio, es decir: siempre pasa por un relay antes de siquiera intentar el punching | Se implementa exactamente el mecanismo necesario (ver §2.3), sin pasos previos obligatorios |
| Descubrimiento de peers | No lo resuelve (necesita señalización aparte, típicamente su propio servidor) | Lo resuelve con DHT/mDNS/bootstrap nodes — resuelve un problema (descubrir peers desconocidos en una red abierta) que **este proyecto no tiene**, porque Nakama ya sabe quién es quién | No aplica — Nakama ya lo resuelve |
| Curva de aprendizaje / riesgo de sobre-ingeniería | Media-alta | Alta | Baja |
| Alineación con el stack existente (`dgram` nativo, sin binarios) | Baja | Media | Alta |

**Conclusión:** ni WebRTC ni libp2p encajan bien. WebRTC resuelve un problema de navegador que acá no existe (Electron ya tiene sockets UDP nativos) y libp2p resuelve un problema de descubrimiento distribuido que tampoco existe (Nakama ya centraliza el descubrimiento). Ambos añaden peso y superficie de fallas a cambio de features que el proyecto no necesita — justo el tipo de sobre-ingeniería que pide evitar el criterio de evaluación de este trabajo.

### 3.2 Librerías npm de hole punching: estado real (investigado)

| Paquete | Estado encontrado | Por qué no se recomienda |
|---|---|---|
| `udp-hole-puncher` | Última versión (1.1.0) publicada en 2017; sin releases nuevos hace años; muy pocas descargas semanales; el propio README del paquete advierte que **no funciona con NAT simétrico** y sugiere agregar un relay + una lib de TURN aparte — es decir, ni siquiera resuelve el problema completo por sí solo | Proyecto sin mantenimiento activo; no cubre el caso simétrico (justo el caso donde más se necesita ayuda); habría que sumarle otra dependencia para el relay igual |
| `utp-punch` | Versión 1.0.1, publicada hace ~7 años, muy poca adopción | Implementa **uTP** (micro transport protocol, el protocolo con retransmisión y orden garantizado que usa BitTorrent) *encima* del hole punching. Eso agrega una capa de fiabilidad tipo TCP-sobre-UDP que este proyecto no necesita: RetroArch netplay ya maneja pérdida/orden a su manera, y agregarle otra capa de retransmisión sólo suma latencia y complejidad en el camino crítico del gameplay |
| Otras opciones encontradas (`punchbuggy`, `udpp2p`) | Paquetes chicos, alguno con mejor diseño (p. ej. `punchbuggy` es liviano y sin dependencias), pero todos asumen **su propio servidor de rendezvous** (TLS a un servidor propio, o un server tipo `createServer()` corriendo aparte) | Habría que adaptarlos para que el rendezvous sea Nakama en vez del servidor propio del paquete — en la práctica, el trabajo de adaptación es comparable al de escribir el mecanismo de punching (que es conceptualmente simple, ver §2.3) directamente contra el canal de señalización que ya existe |

**Conclusión:** el ecosistema npm para esto está viejo, con poca actividad, o resuelve el rendezvous de una forma que no encaja con "usar Nakama, no otro servidor". El mecanismo de hole punching en sí (mandar un paquete UDP simultáneo, escuchar la respuesta, reintentar con backoff) es lo bastante simple como para escribirlo directo — se especifica en [04-Codigo.md](./04-Codigo.md) (`doHolePunch()`) — y así queda 100% integrado al ciclo de vida de la sala en Nakama, sin adaptar una librería pensada para otro flujo.

### 3.3 Cliente STUN: implementación propia vs. librería

A diferencia del hole punching (simple), el parseo binario de mensajes STUN (magic cookie, atributos TLV, XOR-MAPPED-ADDRESS) es mecánico pero tedioso de tener 100% bien. Acá sí conviene una dependencia chica:

| Opción | Estado |
|---|---|
| `stun` (paquete `nodertc/stun`) | Implementa RFC 5389 con soporte parcial de RFC 5766/5245/5780, pensado explícitamente para usarse sobre un `dgram.Socket` propio — encaja directo con el stack. Es la opción recomendada. |
| `node-stun`, `vs-stun` | Última versión de hace 8+ años, prácticamente sin mantenimiento — no se recomiendan |
| Implementación propia desde cero | Viable (el mensaje STUN es corto), pero no aporta nada sobre usar `stun`, que ya resuelve el parseo/encoding de forma correcta y auditada por uso — se deja como alternativa sólo si en algún momento se quiere eliminar hasta esa dependencia |

### 3.4 Relay en el host vs. relay en VPS externo

| Criterio | Relay en el host (elegido) | Relay en VPS externo |
|---|---|---|
| Costo | $0 — usa el hardware que ya está prendido para jugar | Requiere alquilar y mantener un VPS — contradice el objetivo explícito de "sin VPS, sin pagar suscripciones" |
| Saltos de red extra | Ninguno: Guest → Host (mismo destino que ya iba a tener el tráfico) | Guest → VPS → Host: un salto de red adicional, típicamente más latencia total |
| Complejidad operativa | Ninguna — vive en el mismo proceso Electron que ya corre el juego | Deploy, monitoreo, actualizaciones, manejo de caídas de un servicio aparte |
| Disponibilidad | Atada a que el host esté online — pero esto ya es una dependencia inherente al modelo host/guest de RetroArch (si el host se cae, la partida se cae igual, con o sin relay externo) | Alta, pero es infraestructura ajena a mantener |

**Conclusión:** relay en el host, tal como pide el requerimiento — y no sólo porque lo pide, sino porque en este caso puntual (host ya es un punto único de fallo del juego en sí) no hay ninguna ventaja real de mover el relay a un tercero, sólo costo y latencia extra.

### 3.5 Decisión final resumida

| Pieza | Decisión |
|---|---|
| Señalización | Nakama existente (match data), sin servidor nuevo |
| Hole punching | Implementación propia sobre `dgram` |
| Detección de NAT / IP pública | Librería `stun` (nodertc/stun) contra STUN públicos |
| Relay | Implementación propia, corriendo en el proceso del host |
| Autenticación de paquetes | Token de sesión propio; `tweetnacl` como mejora para cifrado (Fase 3) |
| Framework P2P completo (WebRTC/libp2p) | Descartado — resuelve problemas que este proyecto no tiene, a costa de peso y complejidad |

---

## 4. Justificación de decisiones técnicas clave

Estas decisiones se detallan en [03-Diseno.md](./03-Diseno.md); acá se resume el *por qué* de cada una:

- **Patrón de proxy por loopback (RetroArch nunca conoce la IP real del rival).** RetroArch está pensado para conectarse a una IP:puerto fijo. Hacer el hole punching *en el mismo puerto* que usa RetroArch (55435) es fràgil porque el mapping de NAT depende del socket exacto que lo generó, y RetroArch no sabe nada de NAT traversal. Separar el puerto del servicio P2P (dinámico) del puerto de RetroArch (fijo, 55435, intocable) y conectar ambos con un proxy local resuelve esto de raíz — ver detalle en 03-Diseno.md.
- **Un solo socket UDP externo en el host, multiplexado por dirección remota.** Evita pedir 16 puertos distintos (16 mappings de NAT que abrir/mantener) para 16 guests; sólo hace falta abrir uno.
- **`bind(0)` para elegir puerto en vez de escanear un rango.** El sistema operativo garantiza atomicidad (nunca entrega el mismo puerto dos veces) y automáticamente evita cualquier puerto ya ocupado — incluidos 55435 y 7350 — sin necesitar lógica de reintento propia.
- **Header binario chico para el camino de datos, JSON sólo para señalización.** Los paquetes de juego (hot path) no pueden pagar el costo de parsear JSON en cada uno; la señalización por Nakama (candidatos, tipo de NAT, etc.) es poco frecuente y sí puede ser JSON legible.
- **Heurística de LAN por comparación de IP pública.** Si host y guest ven la misma IP pública externa (vía STUN), es evidencia fuerte de que están detrás del mismo router — se prueba la IP privada primero, evitando el problema de *hairpin NAT* (algunos routers no rutean bien un paquete que sale por la IP pública y "rebota" hacia adentro).
- **El relay no reintenta ni reordena — sólo reenvía.** RetroArch netplay ya maneja pérdida y orden a su manera; que el relay agregue su propia lógica de fiabilidad sólo sumaría latencia y estado duplicado.

---

## 5. Riesgos identificados y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Ambos peers detrás de NAT Symmetric-Symmetric | Alto — hole punching directo no es viable | Relay obligatorio por diseño (RF-07); se detecta antes de intentar punching (§2.4) |
| Host detrás de NAT Symmetric | Alto — el "puerto público conocido" del host puede no ser alcanzable de forma estable para todos los guests | El host también corre detección de NAT (RF-04); si resulta Symmetric, el propio host "puinchea" primero hacia cada guest conocido (dirección aprendida vía Nakama) para fijar un mapping específico por guest, igual que loguest hace hacia él |
| CGNAT (NAT de doble capa del ISP) | Medio-alto — se comporta como una capa extra de NAT, a veces simétrica, fuera del control del usuario | Mismo tratamiento que Symmetric: no hay forma de evitarlo desde el cliente, el relay es la mitigación de fondo |
| Firewall de software (p. ej. Windows Defender Firewall) bloquea el puerto UDP entrante aunque el NAT esté "abierto" | Medio — punching exitoso a nivel de router pero paquetes igual descartados en el SO | Solicitar la excepción de firewall una vez, en la instalación (no en cada partida); documentar como tarea de checklist |
| Mappings NAT expiran por inactividad | Medio | Keepalive cada 15–20s (RF-10), con margen respecto al timeout típico de 30–60s |
| Abuso del relay como reflector/amplificador hacia terceros ajenos a la sala | Alto (seguridad) | El relay sólo reenvía entre pares que aparecen en la lista de peers registrados para esa sala vía Nakama; cualquier paquete de un origen no registrado se descarta sin reenviarlo |
| Inyección de paquetes falsos en el flujo de datos (falsear inputs de otro jugador) | Medio (integridad del juego) | Token de sesión por paquete en el MVP; upgrade a autenticación con `tweetnacl` como mejora (Fase 3, ver 05-Checklist.md) |
| Tráfico de ruido de internet ("background radiation") llegando al puerto UDP público expuesto | Bajo | Validar magic bytes / versión de protocolo antes de procesar cualquier paquete; descartar silenciosamente lo que no matchea |
| Cambio de IP pública a mitad de partida (reconexión de router) | Medio | El keepalive detecta la pérdida de conectividad; se puede re-disparar señalización vía Nakama para obtener candidatos nuevos y reintentar punching |
| Colisión de puerto dinámico entre dos procesos en la misma máquina | Bajo | `bind(0)` delega la asignación al kernel, que no entrega un puerto ya tomado — el riesgo es prácticamente nulo con esta estrategia (ver §4) |
| RetroArch netplay no soporta host migration | Medio (limitación aceptada) | Documentado explícitamente como fuera de alcance en 01-Requerimientos.md §6.2; el sistema notifica la caída del host pero no intenta resucitar la partida |

---

## 6. Dependencias externas (npm)

| Paquete | Versión sugerida | Tipo | Por qué |
|---|---|---|---|
| `dgram` | nativo de Node.js | Core | Socket UDP crudo; ya es la base del stack actual, sin instalar nada |
| `stun` (nodertc/stun) | verificar última versión estable en npm al momento de instalar | Dependencia runtime | Cliente STUN (RFC 5389) puro JS sobre `dgram`; evita reimplementar a mano el parseo binario del protocolo para RF-04 |
| `tweetnacl` | ^1.0.3 | Dependencia runtime (Fase 3 / opcional en MVP) | `secretbox` (XSalsa20-Poly1305) para autenticar/cifrar paquetes de datos; API estable y congelada desde hace años (no es abandono, es una librería criptográfica pequeña ya terminada), ~7KB, usada en miles de proyectos; rinde muy por encima de lo que este proyecto necesita (cientos de paquetes/seg. por conexión vs. decenas de miles/seg. que soporta) |
| `vitest` | ^2.x | devDependency | Test runner, ya definido como stack obligatorio del proyecto |
| — (sin librería) | `crypto.randomUUID()` | Core | Generación de IDs de sesión/peer — nativo de Node desde la v14.17/16, no hace falta `uuid` ni `nanoid` |

**Evaluadas y descartadas** (con motivo, detalle en §3): `udp-hole-puncher`, `utp-punch`, `punchbuggy`, `udpp2p`, `libp2p` completo, `wrtc`/bindings nativos de WebRTC.

---

## 7. Referencias cruzadas

- Requerimientos que motivan cada decisión → [01-Requerimientos.md](./01-Requerimientos.md)
- Arquitectura, diagramas de flujo, protocolo de paquetes y máquina de estados → [03-Diseno.md](./03-Diseno.md)
- Interfaces, tipos y pseudocódigo de las funciones clave → [04-Codigo.md](./04-Codigo.md)
- Mejoras de Fase 3 mencionadas acá (punching asimétrico, UPnP, cifrado fuerte) → [05-Checklist.md](./05-Checklist.md)
