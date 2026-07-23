# 05 - Checklist de Implementación

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-23
> **Estado:** Plan inicial

---

## Fase 0: Preparación (Estimación: 1 día)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 0.1 | Crear carpeta `src/main/p2p/` y archivos vacíos | Baja | — |
| 0.2 | Definir types, enums e interfaces en `types.ts` | Baja | 0.1 |
| 0.3 | Instalar `stun` npm | Baja | — |

## Fase 1: Protocolo Binario (Estimación: 1 día)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 1.1 | Implementar `Protocol.ts` con encode/decode | Baja | 0.2 |
| 1.2 | Tests unitarios de serialización/deserialización | Baja | 1.1 |
| 1.3 | Validación de magic bytes y versión | Baja | 1.1 |

## Fase 2: Detección NAT (Estimación: 1.5 días)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 2.1 | Implementar `NATDetector.ts` con STUN lookup | Media | 0.2 |
| 2.2 | Implementar detección de IPs locales (`os.networkInterfaces`) | Baja | 0.2 |
| 2.3 | Implementar `isSameSubnet()` para detección LAN | Baja | 2.2 |
| 2.4 | Mock de STUN para tests | Media | 2.1 |
| 2.5 | Tests de detección NAT | Baja | 2.1, 2.4 |

## Fase 3: Socket P2P (Estimación: 2 días)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 3.1 | Implementar `P2PSocket.ts` con bind dinámico | Media | 1.1 |
| 3.2 | Implementar hole punching con ráfagas y timeout | Alta | 3.1 |
| 3.3 | Implementar keepalive (15s) y heartbeat (5s) | Media | 3.1 |
| 3.4 | Manejo de eventos: pong, heartbeat, game_data, close | Media | 3.1 |
| 3.5 | Tests de hole punching simulado (loopback) | Alta | 3.2 |

## Fase 4: Proxy Local (Estimación: 1 día)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 4.1 | Implementar `LocalProxy.ts` (loopback 127.0.0.1:55435) | Media | — |
| 4.2 | Integrar proxy con P2PSocket para reenvío | Media | 3.1, 4.1 |
| 4.3 | Test: enviar datos dummy a RetroArch vía proxy | Baja | 4.1 |

## Fase 5: Relay Manager (Estimación: 1.5 días)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 5.1 | Implementar `UDPRelayManager.ts` con tabla de peers | Media | 0.2 |
| 5.2 | Relay 1:1 (host ↔ guest) | Media | 5.1, 3.1 |
| 5.3 | Relay 1:N (host → múltiples guests) | Alta | 5.2 |
| 5.4 | Aislamiento de sesiones multi-match | Media | 5.3 |
| 5.5 | Tests de relay con N peers simulados | Alta | 5.3 |

## Fase 6: Señalización Nakama (Estimación: 2 días)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 6.1 | Definir opCodes de mensajes P2P en Nakama | Media | 0.2 |
| 6.2 | Enviar candidatos del host al crear sala | Media | 2.1, 3.1 |
| 6.3 | Enviar candidatos del guest al unirse | Media | 2.1, 3.1 |
| 6.4 | Recibir y procesar candidatos del peer | Media | 6.2, 6.3 |
| 6.5 | Sincronización: esperar ambos candidatos antes de punching | Alta | 6.4 |

## Fase 7: Orquestador P2P Manager (Estimación: 2 días)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 7.1 | Implementar `P2PManager.ts` con FSM completa | Alta | 2.1, 3.1, 4.1, 5.1, 6.1 |
| 7.2 | Flujo host: startP2P → bind → register → wait | Alta | 7.1 |
| 7.3 | Flujo guest: LAN check → punch → direct/relay | Alta | 7.1 |
| 7.4 | Manejo de errores y timeouts en cada estado | Media | 7.1 |
| 7.5 | Limpieza de recursos al hacer stop | Media | 7.1 |

## Fase 8: IPC e Integración Frontend (Estimación: 2 días)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 8.1 | Implementar handlers IPC en `index.ts` | Media | 7.1 |
| 8.2 | Exponer API en `preload/index.ts` vía contextBridge | Baja | 8.1 |
| 8.3 | Componente React: spinner + mensajes de estado | Media | 8.2 |
| 8.4 | Botón "RETAR" → flujo P2P completo | Media | 8.3, 7.1 |
| 8.5 | Badge en UI: modo de conexión (LAN/Direct/Relay) | Baja | 8.3 |
| 8.6 | Mostrar latencia en la UI | Media | 8.5 |

## Fase 9: Limpieza y Reemplazo (Estimación: 1 día)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 9.1 | Reemplazar flujo de Tailscale por P2P propio en App.tsx | Media | 8.1 |
| 9.2 | Reemplazar flujo de Bore por P2P propio | Media | 7.1 |
| 9.3 | Mantener Tailscale/Bore como "otros métodos" colapsados | Baja | 9.1 |

## Fase 10: Testing E2E (Estimación: 2 días)

| # | Tarea | Complejidad | Depende de |
|:---|:---|:---|:---|
| 10.1 | Test: host + guest en misma máquina (loopback) | Alta | 7.3 |
| 10.2 | Test: host + guest en misma LAN | Alta | 7.3 |
| 10.3 | Test: host + guest con NAT simulado | Alta | 7.3 |
| 10.4 | Test: relay fallback (symmetric NAT simulado) | Alta | 7.3 |
| 10.5 | Test: 4 peers simultáneos en relay | Alta | 5.3 |
| 10.6 | Test: desconexión y timeout | Media | 7.4 |

---

## Resumen de Estimación

| Fase | Días estimados |
|:---|:---|
| Fase 0: Preparación | 1 |
| Fase 1: Protocolo | 1 |
| Fase 2: Detección NAT | 1.5 |
| Fase 3: Socket P2P | 2 |
| Fase 4: Proxy Local | 1 |
| Fase 5: Relay Manager | 1.5 |
| Fase 6: Señalización Nakama | 2 |
| Fase 7: Orquestador | 2 |
| Fase 8: IPC + Frontend | 2 |
| Fase 9: Limpieza | 1 |
| Fase 10: Testing E2E | 2 |
| **Total** | **17 días** |

## MVP (Fases 0-8): ~12 días hábiles
