# 01 — Requerimientos del Sistema P2P Propio para Emu Latam

**Módulo:** 18-P2P-Propio  
**Fecha:** 2026-07-23  
**Estado:** Especificación funcional y no funcional  
**Proyecto:** Emu Latam

## 1. Descripción

Emu Latam es una plataforma de juego online para RetroArch construida con Electron, React y TypeScript, utilizando Nakama como backend de matchmaking, chat, presencia y señalización.

El objetivo de este módulo es sustituir la dependencia de Tailscale y Bore por una capa de conectividad propia basada en:

1. Detección de conectividad LAN.
2. UDP hole punching.
3. Conexiones P2P directas cuando sean posibles.
4. Relay UDP en el host como fallback.
5. Nakama como rendezvous/signaling.
6. STUN para obtener información de endpoint público y diagnosticar NAT.

El sistema será **P2P-first**. No se garantiza conectividad universal para todas las combinaciones de NAT sin un relay público externo. Un relay externo podrá incorporarse en una fase futura.

> Ver decisiones técnicas en `02-Analisis.md` y arquitectura en `03-Diseno.md`.

---

## 2. Problema

Dos equipos conectados a Internet suelen estar detrás de routers y NAT. En consecuencia, conocer una IP privada no es suficiente para establecer una conexión UDP directa.

El sistema debe resolver:

- descubrimiento de peers;
- intercambio de candidatos de red;
- detección de conectividad LAN;
- descubrimiento del endpoint público;
- NAT traversal;
- hole punching;
- mantenimiento de mappings NAT;
- selección de ruta;
- fallback a relay;
- gestión de múltiples peers;
- integración con RetroArch sin modificarlo.

---

## 3. Objetivos

### 3.1 Corto plazo

- Eliminar Tailscale y Bore de la ruta normal.
- Soportar conexiones LAN directas.
- Soportar conexiones UDP directas mediante hole punching.
- Usar Nakama como único servidor de signaling.
- Mantener la lógica de red en Electron Main Process.
- Exponer una API IPC estable a React.
- Implementar estados de conexión visibles para el usuario.
- Mantener RetroArch sin modificaciones.

### 3.2 Mediano plazo

- Soportar hasta 16 peers por sala.
- Implementar relay UDP en el host.
- Detectar NAT de forma operativa.
- Implementar reconexión y detección de desconexión.
- Añadir métricas de latencia y calidad.
- Automatizar pruebas de NAT traversal.

### 3.3 Largo plazo

- Host migration.
- Relay externo opcional.
- Mejor selección de rutas.
- Compatibilidad entre versiones del protocolo.
- Telemetría anónima de conectividad.
- Optimización de relay y QoS.

---

# 4. Requerimientos funcionales

## RF-01 — Servicio P2P

El sistema deberá iniciar un servicio UDP independiente del proceso de RetroArch.

El puerto será dinámico:

```typescript
socket.bind(0);
```

El puerto elegido se anunciará mediante Nakama.

El servicio deberá liberar el socket al finalizar la sala.

---

## RF-02 — Señalización

Nakama será responsable de coordinar:

- creación de sala;
- presencia;
- incorporación de peers;
- intercambio de candidatos;
- negociación de transporte;
- notificación de conexión;
- notificación de desconexión.

Nakama no transportará el tráfico de gameplay.

---

## RF-03 — Detección LAN

Antes del hole punching, el sistema deberá determinar si existe un candidato de red local compatible.

Proceso:

1. Enumerar interfaces IPv4 locales.
2. Obtener IP y máscara.
3. Recibir direcciones privadas del peer.
4. Comparar subredes.
5. Intentar handshake UDP directo.
6. Confirmar `LAN_DIRECT` únicamente si existe respuesta.

---

## RF-04 — Descubrimiento público

El sistema podrá consultar servidores STUN para descubrir:

- IP pública observada;
- puerto público observado;
- estabilidad del mapping;
- indicios de NAT simétrico.

La información STUN será diagnóstica y no sustituirá una prueba real de conectividad.

---

## RF-05 — NAT classification

El sistema clasificará el entorno de conectividad en:

```typescript
type NATType =
  | 'OPEN'
  | 'CONE_NAT'
  | 'RESTRICTED_NAT'
  | 'SYMMETRIC_NAT'
  | 'UNKNOWN';
```

La clasificación se utilizará para priorizar estrategias.

No se asumirá que la clasificación por STUN garantiza la conectividad entre dos peers.

---

## RF-06 — Hole punching

El sistema deberá:

1. Obtener candidatos del peer.
2. Coordinar el inicio mediante Nakama.
3. Enviar paquetes UDP de punching.
4. Mantener el socket activo.
5. Detectar respuesta.
6. Confirmar la ruta.
7. Seleccionar `DIRECT` si la prueba tiene éxito.

Timeout configurable recomendado: 5–10 segundos.

---

## RF-07 — Selección de transporte

El orden recomendado será:

```text
LAN_DIRECT
    ↓
P2P_DIRECT
    ↓
HOST_RELAY
    ↓
FAIL
```

La ruta elegida deberá quedar registrada en el estado de conexión.

---

## RF-08 — Relay UDP

El host podrá actuar como relay UDP.

El relay deberá:

- mantener una tabla de peers;
- identificar cada peer por `peerId`;
- asociar endpoints UDP;
- evitar mezclar sesiones;
- soportar hasta 16 peers;
- reenviar datagramas según la sesión;
- expirar peers inactivos.

El relay no deberá interpretar ni modificar el protocolo de gameplay de RetroArch.

---

## RF-09 — Multi-peer

Una sala podrá tener:

```text
1 Host + N Guests
```

con un máximo objetivo de 16 peers.

El transporte será independiente por peer:

```text
Peer A → Direct
Peer B → Relay
Peer C → Direct
```

No será obligatorio que todos los peers utilicen el mismo modo.

---

## RF-10 — Keepalive

El sistema deberá mantener mappings NAT activos.

Valores iniciales:

| Parámetro | Valor |
|---|---:|
| NAT keepalive | 15 s |
| P2P heartbeat | 5 s |
| Peer timeout | 30 s |
| Session timeout | 45–60 s |

El keepalive no deberá confundirse con tráfico de gameplay.

---

## RF-11 — Desconexión

El sistema deberá detectar:

- pérdida de heartbeat;
- cierre del socket;
- timeout;
- pérdida de signaling;
- desaparición del host.

En la primera versión, la pérdida del host finalizará la sesión de juego.

La host migration queda fuera del MVP.

---

## RF-12 — IPC

Electron expondrá operaciones P2P mediante IPC.

Como mínimo:

```typescript
p2p.start
p2p.stop
p2p.connect
p2p.disconnect
p2p.getStatus
```

Y eventos:

```typescript
p2p:state
p2p:peer-connected
p2p:peer-disconnected
p2p:error
p2p:metrics
```

---

## RF-13 — UI

React deberá mostrar estados comprensibles:

```text
Buscando conexión...
Detectando red...
Intentando conexión directa...
Conexión directa establecida
Activando relay...
Relay conectado
Conexión perdida
```

No se mostrarán detalles técnicos de NAT al usuario salvo en una pantalla de diagnóstico.

---

## RF-14 — Integración con RETAR

El botón `RETAR` deberá iniciar la negociación P2P mediante IPC.

Flujo:

```text
RETAR
  ↓
IPC p2p.connect
  ↓
Nakama signaling
  ↓
LAN / Direct / Relay
  ↓
Conexión lista
  ↓
launch-game
```

---

## RF-15 — Versionado

Todo mensaje de control incluirá:

```typescript
version: number;
```

La versión del protocolo deberá ser validada antes de negociar.

---

# 5. Requerimientos no funcionales

| Categoría | Requisito |
|---|---|
| Latencia | P2P directo sin overhead significativo |
| Relay | Objetivo <5 ms en misma máquina y <15 ms en misma red |
| Concurrencia | Hasta 16 peers |
| Plataforma | Electron/Node.js |
| Lenguaje | TypeScript |
| Frontend | React |
| Red | UDP |
| Dependencias | Solo npm |
| Binarios externos | No |
| Tests | Vitest o Node test runner |
| Seguridad | Validación de sesión, peer y versión |
| Mantenibilidad | Módulos desacoplados |
| Compatibilidad | RetroArch sin modificaciones |

Los objetivos de latencia del relay son objetivos de diseño y deberán medirse en pruebas reales.

---

# 6. Alcance

## Incluido

- LAN detection.
- STUN.
- NAT diagnostics.
- UDP hole punching.
- P2P directo.
- Host relay.
- Multi-peer.
- Keepalive.
- Desconexión.
- IPC.
- Integración con Nakama.
- Integración con RETAR.
- Versionado.

## Fuera de alcance inicial

- Relay público obligatorio.
- Modificación de RetroArch.
- Reemplazo de Nakama.
- VPN completa.
- Cifrado de tráfico de gameplay independiente de RetroArch.
- Host migration en MVP.
- Traversal garantizado para todos los NAT.

---

# 7. Restricciones técnicas

1. TypeScript/Node.js.
2. Electron Main Process.
3. `node:dgram` para UDP.
4. React solo mediante IPC.
5. Nakama como signaling.
6. No crear servidor de signaling adicional.
7. No utilizar binarios externos.
8. Puerto P2P dinámico.
9. RetroArch mantiene su propio socket UDP.
10. El servicio P2P usa un socket separado.

---

# 8. Criterios de aceptación

El MVP será aceptado cuando:

- [ ] Dos peers en LAN se conecten directamente.
- [ ] Dos peers con NAT compatible establezcan conexión P2P.
- [ ] El sistema mantenga mappings mediante keepalive.
- [ ] Un peer desconectado sea detectado en <=30 s.
- [ ] El relay soporte al menos 16 peers en pruebas.
- [ ] El relay no mezcle sesiones.
- [ ] RetroArch funcione sin modificaciones.
- [ ] React no contenga lógica UDP.
- [ ] Nakama sea el único signaling server.
- [ ] El puerto P2P no interfiera con 55435 ni 7350.
- [ ] El protocolo rechace versiones incompatibles.
- [ ] Existan pruebas unitarias y de integración.

---

# 9. Referencias cruzadas

- Arquitectura: `03-Diseno.md`
- Análisis y decisiones: `02-Analisis.md`
- Implementación: `04-Codigo.md`
- Plan de ejecución: `05-Checklist.md`
