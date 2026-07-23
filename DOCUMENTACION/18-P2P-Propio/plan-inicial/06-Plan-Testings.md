# 06 - Plan de Testings

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Estado:** Plan inicial

---

## Pruebas Unitarias

### Protocolo Binario

| # | Prueba | Descripción | Criterio de éxito |
|:---|:---|:---|:---|
| UT-01 | encode/decode PUNCH | Codificar y decodificar paquete de tipo PUNCH | Buffer coincide byte a byte |
| UT-02 | encode/decode GAME_DATA | Codificar con payload de 100 bytes aleatorios | Payload intacto tras decode |
| UT-03 | encode/decode con sessionId | SessionId se preserva en ambos sentidos | Match exacto |
| UT-04 | Rechazar magic inválido | Decode con magic bytes incorrectos | Retorna null |
| UT-05 | Rechazar buffer muy corto | Decode con buffer < 8 bytes | Retorna null |

### Detección NAT

| # | Prueba | Descripción | Criterio de éxito |
|:---|:---|:---|:---|
| UT-06 | getLocalIps retorna array | Obtener IPs locales | Array con al menos 1 entrada (127.0.0.1) |
| UT-07 | isSameSubnet true | 192.168.1.10 y 192.168.1.20 | true |
| UT-08 | isSameSubnet false | 192.168.1.10 y 10.0.0.5 | false |
| UT-09 | STUN mock exitoso | Mock de servidor STUN responde con IP:puerto | Devuelve NAT type + IP + puerto |
| UT-10 | STUN mock falla | Mock lanza error | Devuelve SYMMETRIC, IP vacía |

### Socket P2P

| # | Prueba | Descripción | Criterio de éxito |
|:---|:---|:---|:---|
| UT-11 | bind asigna puerto | socket.bind(0) | .localPort > 0 |
| UT-12 | holePunch exitoso | Dos sockets en localhost, punching mutuo | Resuelve true en < 2s |
| UT-13 | holePunch timeout | Punching a IP inexistente | Resuelve false en ~4s |
| UT-14 | keepalive envía paquetes | Verificar que se envían PINGs cada 5s | Al menos 1 PING recibido en 6s |
| UT-15 | game_data loopback | Enviar GAME_DATA de socket A a B | B recibe payload idéntico |

### Relay Manager

| # | Prueba | Descripción | Criterio de éxito |
|:---|:---|:---|:---|
| UT-16 | relay 1:1 | Relay entre peer A y B | B recibe datos de A |
| UT-17 | relay 1:3 | Host relay a 3 guests | Los 3 reciben el mismo payload |
| UT-18 | aislamiento de sesión | Dos relays distintos con peers separados | No se mezclan paquetes |
| UT-19 | removePeer | Eliminar peer del relay | El peer eliminado no recibe más datos |

---

## Pruebas de Integración

| # | Prueba | Descripción | Criterio de éxito |
|:---|:---|:---|:---|
| IT-01 | Host + Guest loopback | Misma PC, dos sockets locales | Conexión exitosa, modo DIRECT |
| IT-02 | Señalización Nakama | Host registra candidatos, guest los recibe | Ambos candidatos intercambiados en < 2s |
| IT-03 | Flujo LAN | Dos sockets con IPs de misma subred simulada | Conexión LAN, latencia < 3ms |
| IT-04 | Flujo relay | Hole punching falla (simular timeout) | Fallback a RELAY, juego arranca |
| IT-05 | Flujo directo | Hole punching exitoso | Modo DIRECT, sin relay |
| IT-06 | Keepalive evita timeout | Enviar keepalive por 60s | Conexión se mantiene activa |
| IT-07 | Timeout de peer | Matar socket peer | Se detecta desconexión en < 35s |
| IT-08 | Multi-peer (4 jugadores) | 1 host + 3 guests, relay activo | Todos reciben datos correctamente |

---

## Casos Límite (Edge Cases)

| # | Prueba | Descripción | Criterio |
|:---|:---|:---|:---|
| EC-01 | Host sin IP pública | STUN falla, NAT unknown | Relay desactivado, muestra error |
| EC-02 | Puerto P2P ocupado | socket.bind(0) asigna otro | Puerto alternativo funciona |
| EC-03 | Guest se une antes que host esté listo | Esperar señalización Nakama | Guest reintenta hasta timeout |
| EC-04 | Paquete corrupto | Enviar datos basura al socket P2P | Se descarta (magic inválido) |
| EC-05 | Sesión duplicada | Mismo peer intenta conectar dos veces | Segunda conexión rechazada |

---

## Manejo de Errores

| # | Prueba | Descripción | Criterio |
|:---|:---|:---|:---|
| ER-01 | Nakama desconectado | Señalización falla | Error visible en UI: "Servidor no disponible" |
| ER-02 | Socket error | EADDRINUSE, EACCES | Error manejado, se reintenta con otro puerto |
| ER-03 | Hole punching timeout | 4s sin respuesta | FSM transiciona a RELAY |
| ER-04 | Relay lleno | Más de 16 peers intentan conectar | Se rechaza con "Sala llena" |
| ER-05 | Host se desconecta | Socket del host se cierra | Todos los guests reciben CLOSE y error en UI |

---

## Pruebas de Rendimiento

| # | Prueba | Descripción | Criterio |
|:---|:---|:---|:---|
| PR-01 | Overhead de relay | Medir latencia agregada por el relay | < 2ms en localhost |
| PR-02 | Throughput relay | 1000 paquetes/segundo a través del relay | Sin pérdidas ni reordenamiento |
| PR-03 | Consumo CPU | Relay con 16 peers activos | < 5% en CPU quad-core |
| PR-04 | Consumo memoria | Sesión P2P activa por 1 hora | < 15 MB RAM |

---

## Resumen de Pruebas

| Tipo | Cantidad |
|:---|:---|
| Pruebas unitarias | 19 |
| Pruebas de integración | 8 |
| Casos límite | 5 |
| Manejo de errores | 5 |
| Pruebas de rendimiento | 4 |
| **Total** | **41** |
