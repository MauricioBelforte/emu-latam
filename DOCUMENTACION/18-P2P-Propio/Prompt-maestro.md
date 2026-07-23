# Prompt Maestro — Sistema P2P Propio para Emu Latam

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Propósito:** Prompt detallado para enviar a modelos de IA y obtener propuestas de diseño del sistema P2P propio.

---

## Contexto del Proyecto

Emu Latam es una plataforma de juego online para RetroArch (emulador arcade) construida con:

- **Frontend:** Electron + React + TypeScript + styled-components
- **Backend:** Nakama (servidor de juegos) para matchmaking, chat, presencia de usuarios
- **Juego:** RetroArch con netplay (UDP, 1v1, puerto 55435)
- **Sistema actual de conexiones:** 3 modos:
  1. **LAN Directo** — misma red local
  2. **Bore Tunnel** — túnel vía bore.pub (servicio externo)
  3. **Tailscale P2P** — VPN mesh (servicio externo)

**Objetivo:** Reemplazar Tailscale y Bore con un sistema propio de conexión P2P que permita a N jugadores conectarse entre sí sin servidores externos, sin VPS, sin pagar suscripciones.

## El Problema Real

Dos PCs en internet no pueden hablar directamente porque están detrás de NAT (routers). Para conectarse necesitan:

1. **Descubrimiento:** Saber que el otro existe y dónde está (IP:puerto público)
2. **NAT Traversal:** Agujerear el firewall para que los paquetes pasen
3. **Conexión directa (ideal):** Una vez establecido el agujero, hablar directo
4. **Fallback (realidad):** Cuando el NAT traversal falla (~30% de los casos), necesitan un relay

## Stack Tecnológico (obligatorio)

- **Lenguaje:** TypeScript (Node.js)
- **Entorno:** Electron (main process) — puede usar `dgram` nativo de Node
- **Frontend:** React (solo llama a funciones vía IPC)
- **Dependencias externas:** Solo librerías npm (sin binarios externos)
- **Pruebas:** Vitest o Node test runner

## Arquitectura Actual (relevante)

### Flujo de sala (Nakama):
```
Host: Crea sala → Nakama (127.0.0.1:7350)
Guest: Conecta a IP del host → Nakama del host → matchmaking
Una vez匹配: Ambos lanzan RetroArch con --host / --connect IP:55435
```

### Cómo se integra un nuevo método:
El main process de Electron expone IPC handlers (`tailscale-host`, `tailscale-guest`, `launch-game`, etc.). El frontend llama a estos handlers desde React. No hay lógica de red en el frontend.

## Requerimientos del Sistema P2P Propio

### Funcionalidades Core
1. **Rendezvous (coordinación):** Usar Nakama como servidor de señalización (ya está running). No crear otro server de señalización.
2. **NAT Hole Punching:** Implementar UDP hole punching entre peers usando la información de Nakama.
3. **Detección de NAT type:** Identificar si el NAT del peer es Full Cone, Restricted Cone, Port Restricted Cone, o Symmetric.
4. **Conexión directa P2P:** Cuando el hole punching funciona, los peers hablan directo (latencia mínima).
5. **Relay fallback:** Cuando el hole punching falla, el HOST actúa como relay UDP (reenvía paquetes entre guests).
6. **Sala multi-peer:** Un host + múltiples guests conectados simultáneamente (no solo 1v1).
7. **Detección de misma red:** Si dos peers están en la misma LAN, usar IP privada directa (evitar hairpin NAT).

### Flujo Propuesto
```
1. Host crea sala en Nakama → Nakama registra "sala activa" con metadatos
2. Host inicia "servicio P2P local": bindea un socket UDP para hole punching + relay
3. Guests se unen a la sala vía Nakama → reciben IP pública del host
4. Cada guest hace hole punching hacia el host
   ├── Éxito → conexión directa P2P (guest ↔ host)
   └── Falla → guest se conecta al relay UDP del host
5. Host reenvía paquetes entre guests según sea necesario
6. Nakama solo se usa para señalización inicial y presencia
```

### Restricciones Técnicas
- **Puerto UDP dinámico:** El sistema debe elegir un puerto libre, no hardcodear
- **Timeout de agujero:** Los mappings NAT expiran (~30-60 segundos). Enviar keepalive cada ~15-20 segundos.
- **Symmetric NAT:** Detectar y caer a relay inmediatamente sin intentar punching (ahorra tiempo)
- **Latencia:** El overhead del relay (cuando se usa) debe ser < 5ms en misma máquina, < 15ms en misma red
- **Concurrencia:** Soporte para hasta 16 peers simultáneos en una sala
- **RetroArch:** El relay debe hablar el protocolo UDP de RetroArch netplay (puerto 55435 por defecto). No modificar RetroArch.

### Entregables (crear 5 archivos en markdown)

#### 01-Requerimientos.md
Documento de requerimientos que incluya:
- Definición del problema
- Objetivos del sistema (corto, mediano, largo plazo)
- Requerimientos funcionales detallados (cada función del sistema)
- Requerimientos no funcionales (latencia, concurrencia, seguridad)
- Alcance y fuera de alcance
- Restricciones técnicas
- Criterios de aceptación

#### 02-Analisis.md
Análisis técnico profundo:
- Análisis del dominio (NAT traversal, hole punching, relay)
- Comparación de alternativas:
  - WebRTC vs UDP hole punching custom vs libp2p
  - utp-punch vs udp-hole-puncher vs implementación propia
  - Relay en host vs relay en VPS externo
- Justificación de cada decisión técnica
- Riesgos identificados y mitigaciones
- Dependencias externas (librerías npm) con versión específica y por qué

#### 03-Diseno.md
Diseño detallado de la arquitectura:
- Diagrama de arquitectura (en ASCII)
- Diagrama de flujo para cada escenario:
  - Host crea sala e inicia servicio P2P
  - Guest se conecta (hole punching exitoso)
  - Guest se conecta (hole punching falla, usa relay)
  - Keepalive y detección de desconexión
  - Misma red LAN (detección y bypass)
- Estructura de módulos y clases
- API IPC (interfaz entre React y Electron)
- Protocolo de comunicación (formato de paquetes UDP)
- Manejo de estados (máquina de estados)
- Estrategia de puertos (elección, conflicto, liberación)

#### 04-Codigo.md
Especificación del código:
- Estructura de archivos y carpetas propuesta
- Interfaces y types principales
- Pseudocódigo o esqueletos de las funciones clave:
  - `startP2PService()` — Inicia el socket UDP y el relay
  - `doHolePunch(peerInfo)` — Intenta hole punching con un peer
  - `startRelay(connections)` — Inicia el reenvío UDP entre peers
  - `detectNATType()` — Detecta tipo de NAT usando STUN
  - `keepAlive()` — Mantiene vivo el mapping NAT
  - `handlePeerDisconnect()` — Maneja desconexión de un peer
- Integración con el sistema existente:
  - Dónde se agrega en el main process de Electron
  - Cómo se llama desde React
  - Cómo convive con Nakama

#### 05-Checklist.md
Checklist de implementación:
- [ ] Dividido en fases (Mínimo Viable → Mejoras → Avanzado)
- [ ] Cada tarea con estimación de complejidad (baja/media/alta)
- [ ] Tareas de testing incluidas
- [ ] Tareas de documentación incluidas
- [ ] Dependencias entre tareas claras

## Preguntas Específicas que Debe Responder el Diseño

1. **¿Cómo detecta el sistema si dos peers están en la misma red LAN?**
2. **¿Qué formato tienen los paquetes de señalización a través de Nakama?** (ej: mensajes JSON en el canal de match)
3. **¿Cómo maneja el relay múltiples conexiones UDP simultáneas sin mezclar paquetes?**
4. **¿Qué pasa si el host se desconecta? ¿Cómo se reelige un nuevo host?**
5. **¿Cómo se asegura que el puerto elegido para el servicio P2P no entre en conflicto con RetroArch (55435) ni con Nakama (7350)?**
6. **¿Strategy de keepalive: qué tan seguido, qué datos mandar, qué pasa si se pierde un keepalive?**
7. **¿Cómo se integra con el botón "RETAR" existente en la UI?**
8. **¿Cómo se muestra el progreso visual al usuario (spinner, estados)?**
9. **¿Se puede reutilizar el socket UDP de RetroArch o necesita uno separado?**
10. **¿Cómo se versiona el protocolo para compatibilidad futura?**

## Formato de Entrega

Cada archivo debe ser markdown (.md) con:
- Título y descripción
- Tablas donde corresponda
- Diagramas en ASCII
- Código en bloques con lenguaje especificado (typescript, bash, etc.)
- Referencias cruzadas entre archivos (ej: "Ver sección X en 03-Diseno.md")

## Criterios de Evaluación

Tu propuesta será evaluada en:
1. **Factibilidad técnica:** ¿Se puede implementar con el stack existente?
2. **Completitud:** ¿Cubre todos los casos bordes?
3. **Claridad:** ¿Un desarrollador puede implementar siguiendo los documentos?
4. **Pragmatismo:** ¿Evita sobreingeniería? ¿Prioriza lo que funciona?
5. **Latencia:** ¿El diseño minimiza overhead en el camino crítico del gameplay?
