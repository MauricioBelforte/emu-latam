# 01 - Requerimientos del Sistema P2P Propio (Emu Latam)

> **Módulo:** 18-P2P-Propio  
> **Fecha:** 2026-07-23  
> **Estado:** Propuesta de Arquitectura v1.0  
> **Autor:** Equipo de Arquitectura de Software — Emu Latam  

---

## 1. Definición del Problema

Emu Latam opera como una plataforma de retro-gaming multi-jugador basada en **RetroArch** (Netplay vía UDP en puerto 55435) y **Nakama** (servidor central para autenticación, chat, presencia y matchmaking).

Actualmente, para interconectar a dos o más jugadores que se encuentran detrás de routers residenciales (NAT/Firewalls), la plataforma utiliza tres modalidades:
1. **LAN Directo:** Funciona únicamente en redes locales cerradas.
2. **Bore Tunnel:** Servicio de tunneling externo en nube. Introduce latencia variable, costo operativo y dependencia de infraestructura de terceros.
3. **Tailscale P2P:** Requiere la instalación/orquestación de un cliente VPN Mesh. Aumenta la complejidad técnica del instalador, consume recursos adicionales y depende de coordinadores externos.

**El objetivo central de este proyecto** es diseñar e implementar un **módulo P2P UDP propio**, integrado directamente en el proceso principal (*main process*) de **Electron**, utilizando **Nakama únicamente como canal de señalización inicial**, permitiendo conexiones directas UDP (*Hole Punching*) y un fallback de *Relay local en el Host* sin requerir servidores intermediarios pagados, VPS adicionales ni dependencias ejecutables externas.

---

## 2. Objetivos del Sistema

### 2.1 Corto Plazo (MVP — v1.0)
- Eliminar la dependencia de Tailscale y Bore Tunnel para partidas 1v1.
- Lograr una tasa de éxito de conexión directa P2P ≥ 70% en entornos de NAT Cone (Full Cone, Address Restricted, Port Restricted).
- Implementar fallback automático a *Host UDP Relay* cuando el NAT Hole Punching falle (Symmetric NAT), garantizando el 100% de conectividad sin requerir un TURN/VPS externo.
- Integrar la señalización sobre el WebSocket activo de Nakama.

### 2.2 Mediano Plazo (v1.5)
- Soporte completo para salas Multi-Peer (hasta 16 jugadores por sala) con orquestación de árbol de reenvío en el Host.
- Detección automática de interfaz LAN para bypass de NAT traversal (latencia local < 2ms).
- Re-elección transparente de Host en caso de desconexión imprevista (*Host Migration*).

### 2.3 Largo Plazo (v2.0)
- Medición en tiempo real de métricas de calidad de red (jitter, packet loss, RTT) exponiéndolas en la UI de React.
- Mapeo dinámico de puertos UPnP / NAT-PMP opcional mediante paquetes UDP puros sin binarios.

---

## 3. Requerimientos Funcionales (RF)

| ID | Requerimiento | Descripción |
| :--- | :--- | :--- |
| **RF-01** | **Detección de NAT Type** | El cliente Electron debe determinar el tipo de NAT local (Full Cone, Address-Restricted, Port-Restricted, Symmetric) mediante pruebas STUN previas al matchmaking. |
| **RF-02** | **Señalización vía Nakama** | La negociación de candidatos de red (IP pública, IP privada, puerto UDP, NAT Type) debe enviarse en formato JSON mediante mensajes del canal/stream de Nakama. |
| **RF-03** | **Selección de Puerto Dinámico** | El servicio P2P local debe bindear un socket UDP (`dgram`) en un puerto efímero disponible (rango 55436–55500), evitando conflictos con RetroArch (55435) y Nakama (7350). |
| **RF-04** | **Detección de Red Local (LAN)** | Si la IP privada del Host y del Guest pertenecen a la misma subred, el sistema debe omitir la IP pública e intentar conexión directa por IP privada. |
| **RF-05** | **UDP Hole Punching** | Implementar algoritmo de simetría de ráfagas UDP (*UDP Hole Punching*) enviando paquetes de penetración coordinados con reintentos progresivos. |
| **RF-06** | **Fallback a Host UDP Relay** | Si el Hole Punching no se establece en un tiempo límite de 4.0 segundos, el Host actuará como servidor Proxy/Relay UDP multiplexando el tráfico entre guests. |
| **RF-07** | **Proxy Local para RetroArch** | El cliente P2P creará un puerto local `127.0.0.1:55435` o equivalente para que RetroArch se conecte a un socket local, mientras el módulo P2P encapsula y reenvía los paquetes por la red P2P/Relay. |
| **RF-08** | **Mantenimiento de Mapeo NAT (Keepalive)** | El socket P2P enviará ráfagas de paquetes *Keepalive* cada 15 segundos para evitar que los routers cierren las tablas de traducción de estados NAT. |
| **RF-09** | **Gestión de Desconexión** | Detección de pérdida de peer si no se reciben paquetes durante 45 segundos (3 keepalives perdidos consecuentemente), notificando al cliente y a Nakama. |
| **RF-10** | **Soporte Multi-Jugador (hasta 16 peers)** | El host debe gestionar una tabla de conexiones activas mapeando `Client ID ↔ Address:Port` para enrutar paquetes Netplay a múltiples clientes. |
| **RF-11** | **API IPC para Electron Frontend** | Exponer invocadores IPC (`p2p:start-host`, `p2p:join-guest`, `p2p:get-status`) y eventos de estado hacia React. |
| **RF-12** | **Compatibilidad y Versionado** | Todos los paquetes del protocolo P2P deben incluir un encabezado binario con versión del protocolo para evitar desincronización entre clientes. |

---

## 4. Requerimientos No Funcionales (RNF)

### 4.1 Latencia y Rendimiento
- **RNF-01 (Overhead del Proxy/Relay Local):** La latencia agregada por el hilo del Relay UDP en la misma máquina no debe superar los **2 ms**.
- **RNF-02 (Overhead de Red en LAN):** Latencia total en conexión LAN directa < **5 ms**.
- **RNF-03 (Jitter y Procesamiento):** El procesamiento de paquetes UDP en el proceso principal de Electron debe ser no bloqueante (operaciones I/O asíncronas sobre `dgram`).

### 4.2 Escalabilidad y Recursos
- **RNF-04 (Concurrencia):** Un solo Host debe ser capaz de procesar hasta 16 sesiones simultáneas de Netplay manteniendo un consumo de CPU < 5% en un procesador quad-core estándar.
- **RNF-05 (Consumo de Memoria):** El footprint de memoria del módulo P2P en Electron Main Process debe ser menor a **15 MB RAM**.

### 4.3 Seguridad y Robusteza
- **RNF-06 (Validación de Paquetes):** Todo paquete UDP recibido fuera de la firma del encabezado (*Magic Bytes* + *Session Token*) debe ser descartado inmediatamente para prevenir amplificación UDP o IP spoofing.
- **RNF-07 (Cero Ejecutables Externos):** El sistema debe funcionar 100% en Node.js puro usando la librería nativa `dgram`, sin requerir binarios `.exe`/`.so`/`.dylib` adicionales.

---

## 5. Alcance y Fuera de Alcance

### 5.1 Dentro del Alcance (In-Scope)
- Módulo TypeScript para el *main process* de Electron.
- Módulo de STUN Client embebido para clasificación de NAT.
- Algoritmo coordinado de Hole Punching UDP.
- Enrutador de paquetes UDP Relay multiplexado en el Host.
- Proxy local loopback para RetroArch.
- Integración IPC con React Frontend y señalización sobre la conexión existente de Nakama.

### 5.2 Fuera del Alcance (Out-of-Scope)
- Servidores TURN externos en la nube o alquiler de VPS dedicados.
- Modificación del código fuente en C/C++ de RetroArch o de su core Netplay.
- Encriptación pesada TLS/DTLS sobre el flujo de Netplay (RetroArch requiere baja latencia; la seguridad se maneja mediante autenticación previa en Nakama y Session Tokens en el encabezado P2P).
- Re-transmisión TCP confiable para paquetes perdidos de Netplay (RetroArch maneja sus propia tolerancia a pérdidas UDP).

---

## 6. Restricciones Técnicas

1. **Entorno de Ejecución:** Electron Main Process (Node.js runtime v20+).
2. **Librerías Permitidas:** Módulos nativos (`dgram`, `os`, `crypto`, `net`) y librerías auxiliares npm en JavaScript/TypeScript puro. Prohibido código nativo C++ (`.node` bindings que requieran `node-gyp`).
3. **Inmutabilidad de RetroArch:** RetroArch asume un socket UDP estándar. El sistema P2P se ubica de manera transparente entre RetroArch y la red.

---

## 7. Criterios de Aceptación (Matriz de Pruebas)

| ID | Escenario | Condición de Éxito |
| :--- | :--- | :--- |
| **CA-01** | **Ambos Peers detras de Cone NAT** | El sistema establece socket UDP directo. La prueba de trazado confirma cero intermediarios. Latencia = RTT real directo. |
| **CA-02** | **Un Peer detrás de Symmetric NAT** | El Hole Punching falla a los 4s. El sistema conmuta automáticamente a *Host UDP Relay*. El juego arranca sin error. |
| **CA-03** | **Ambos Peers en la misma LAN** | El sistema detecta subred coincidente (`192.168.x.x`), omite la IP pública y conecta vía IP privada con latencia < 3ms. |
| **CA-04** | **Reconexión por Cierre Temporal de NAT** | Los mensajes Keepalive mantienen abierta la tabla NAT durante una sesión inactiva de 10 minutos. |
| **CA-05** | **Multi-jugador 4 Players** | El Host recibe tráfico de 3 Guests en su socket P2P y reenvía los estados de Netplay correctamente a cada uno sin desincronización. |
