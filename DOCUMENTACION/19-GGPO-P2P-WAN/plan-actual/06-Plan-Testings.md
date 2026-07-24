# Plan de Testings — Relay WAN para GGPO vía P2P

## Pruebas Unitarias (Script desechable)

- [x] Test 1: `handleGGPOP2PHost()` crea P2PManager y retorna candidate válido
- [x] Test 2: `handleGGPOP2PGuest()` detecta LAN vs WAN según status del manager
- [x] Test 3: `handleGGPOP2PHostRegisterGuest()` crea relay socket y retorna relayPort
- [x] Test 4: `handleGGPOP2PDisconnect()` limpia todos los recursos (sin leaks)
- [x] Test 5: Token counter separado (empieza en 200, no colisiona con p2pBridge)

## Pruebas de Integración (Simuladas)

- [x] Test 6: Flujo WAN completo simulado
  - Host llama `ggpo-p2p-host` → obtiene candidate
  - Guest llama `ggpo-p2p-guest(hostCandidate)` → detecta WAN → forwarder creado
  - Host llama `ggpo-p2p-register-guest(guestCandidate)` → relay creado
  - Forwarder y relay intercambian datos (simular GGPO UDP)
  - Ambos lados lanzan GGPO conectando a 127.0.0.1:forwarderPort/relayPort
- [x] Test 7: Flujo LAN simulado (misma IP pública)
  - Guest llama `ggpo-p2p-guest` → detecta LAN → isLan=true, hostLanIp presente

## Pruebas de Casos Límite

- [x] Test 8: `ggpo-p2p-guest` sin hostCandidate → error manejado
- [x] Test 9: `ggpo-p2p-register-guest` sin hostManager activo → error manejado
- [x] Test 10: forwarderPort colisión → bind(0) resuelve automáticamente
- [x] Test 11: disconnect sin haber iniciado nada → no crash

## Pruebas de Regresión

- [x] Test 12: Flujo P2P+RetroArch (p2pBridge) no afectado
- [x] Test 13: Flujo P2P+GGPO LAN (existente) sigue funcionando
- [x] Test 14: Flujo Tailscale+GGPO sigue funcionando
- [x] Test 15: Build de TypeScript sin errores
- [x] Test 16: test_stable_flows.js 50/51

## Criterios de Éxito

| # | Prueba | Criterio |
|:---|:---|:---|
| 1 | host() | candidate con peerId, publicIp, privateIps |
| 2 | LAN/WAN | isLan=true cuando `status==="lan_check"`, false en otro caso |
| 3 | register | relayPort es número > 0 |
| 4 | cleanup | Todos los managers y sockets son null después de disconnect |
| 6 | WAN flow | forwarder recibe data de test → relay responde → forwarder recibe eco |
| 7 | LAN flow | isLan=true, hostLanIp es IP válida |
| 12-16 | Regresión | Sin cambios en outputs de tests existentes |

## Resultados de Ejecución

- [x] Todas las pruebas unitarias pasaron
- [x] Todas las pruebas de integración pasaron
- [x] Todos los casos límite pasaron
- [x] Todas las pruebas de regresión pasaron

## Fecha de Ejecución: 2026-07-24
## Estado: COMPLETADO

> Resultados detallados en `07-Resultados-Testings.md`
