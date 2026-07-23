# 06 - Plan de Testings (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Versión:** 1.1

---

## Pruebas Unitarias

| # | Archivo | Prueba | Criterio |
|:---|:---|:---|:---|
| UT-01 | `packet.test.ts` | encode/decode round-trip con payload | Buffer coincide |
| UT-02 | `packet.test.ts` | encode/decode sin payload | Header correcto |
| UT-03 | `packet.test.ts` | decode buffer < 4 bytes | Retorna null |
| UT-04 | `packet.test.ts` | sessionToken se preserva | Match exacto |
| UT-05 | `NatDetector.test.ts` | Mismo puerto en 2 STUN → Cone | Cone |
| UT-06 | `NatDetector.test.ts` | Distinto puerto → Symmetric | Symmetric |
| UT-07 | `NatDetector.test.ts` | STUN falla → Symmetric seguro | Symmetric |
| UT-08 | `HolePuncher.test.ts` | Symmetric-Symmetric corta inmediato | Retorna false sin enviar |
| UT-09 | `HolePuncher.test.ts` | Backoff respeta tiempos | 3 intentos en ~2.8s |
| UT-10 | `RelayServer.test.ts` | 1 guest recibe datos del host | Forwarding funciona |
| UT-11 | `RelayServer.test.ts` | 2 guests no mezclan paquetes | Aislamiento total |
| UT-12 | `RelayServer.test.ts` | Token inválido es descartado | Sin forwarding |
| UT-13 | `KeepAliveService.test.ts` | 3 misses → timeout | onTimeout se dispara |
| UT-14 | `KeepAliveService.test.ts` | ACK resetea contador | missed = 0 tras ack |
| UT-15 | `StateMachine.test.ts` | Transiciones válidas | Solo las permitidas |
| UT-16 | `StateMachine.test.ts` | Transiciones inválidas lanzan error | Error |

---

## Pruebas de Integración

| # | Prueba | Descripción | Criterio |
|:---|:---|:---|:---|
| IT-01 | Loopback 1v1 | Dos P2PManager en misma PC | Conexión directa exitosa |
| IT-02 | LAN simulada | Misma IP pública fake | LAN_CONNECTED < 10ms |
| IT-03 | Relay forzado | Simular timeout de punching | RELAY_CONNECTED |
| IT-04 | Keepalive 60s | Conexión idle 60s | Sigue activa |
| IT-05 | Timeout 54s | Matar socket peer | DISCONNECTED en ~54s |
| IT-06 | 4 guests relay | 1 host + 3 guests relay | Todos reciben datos |
| IT-07 | Señalización Nakama | Intercambio de candidatos | Completo en < 2s |

---

## Casos Límite

| # | Prueba | Criterio |
|:---|:---|:---|
| EC-01 | Sin conectividad STUN | Symmetric seguro, relay |
| EC-02 | Puerto 55435 ocupado | bind(0) asigna otro |
| EC-03 | Paquete corrupto | Se descarta (decode null) |
| EC-04 | Sesión duplicada | Segundo connect es ignorado |

---

## Resumen

| Tipo | Cantidad |
|:---|:---|
| Unitarias | 16 |
| Integración | 7 |
| Casos límite | 4 |
| **Total** | **27** |
