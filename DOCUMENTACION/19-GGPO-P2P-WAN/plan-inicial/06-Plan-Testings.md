# Plan de Testings — Relay WAN para GGPO vía P2P

## Pruebas Unitarias (Script desechable)

- [ ] Test 1: `handleGGPOP2PHost()` crea P2PManager y retorna candidate válido
- [ ] Test 2: `handleGGPOP2PGuest()` detecta LAN vs WAN según status del manager
- [ ] Test 3: `handleGGPOP2PHostRegisterGuest()` crea relay socket y retorna relayPort
- [ ] Test 4: `handleGGPOP2PDisconnect()` limpia todos los recursos (sin leaks)
- [ ] Test 5: Token counter separado (empieza en 200, no colisiona con p2pBridge)

## Pruebas de Integración (Simuladas)

- [ ] Test 6: Flujo WAN completo simulado
  - Host llama `ggpo-p2p-host` → obtiene candidate
  - Guest llama `ggpo-p2p-guest(hostCandidate)` → detecta WAN → forwarder creado
  - Host llama `ggpo-p2p-register-guest(guestCandidate)` → relay creado
  - Forwarder y relay intercambian datos (simular GGPO UDP)
  - Ambos lados lanzan GGPO conectando a 127.0.0.1:forwarderPort/relayPort
- [ ] Test 7: Flujo LAN simulado (misma IP pública)
  - Guest llama `ggpo-p2p-guest` → detecta LAN → isLan=true, hostLanIp presente

## Pruebas de Casos Límite

- [ ] Test 8: `ggpo-p2p-guest` sin hostCandidate → error manejado
- [ ] Test 9: `ggpo-p2p-register-guest` sin hostManager activo → error manejado
- [ ] Test 10: forwarderPort colisión → bind(0) resuelve automáticamente
- [ ] Test 11: disconnect sin haber iniciado nada → no crash

## Pruebas de Regresión

- [ ] Test 12: Flujo P2P+RetroArch (p2pBridge) no afectado
- [ ] Test 13: Flujo P2P+GGPO LAN (existente) sigue funcionando
- [ ] Test 14: Flujo Tailscale+GGPO sigue funcionando
- [ ] Test 15: Build de TypeScript sin errores
- [ ] Test 16: test_stable_flows.js 50/51

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

- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todas las pruebas de regresión pasaron

## Fecha de Ejecución: [PENDIENTE]
## Estado: PENDIENTE
