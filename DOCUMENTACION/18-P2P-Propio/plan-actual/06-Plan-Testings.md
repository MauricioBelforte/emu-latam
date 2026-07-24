# Plan de Testings — Integración GGPO + P2P

## Pruebas Unitarias (Script desechable)

- [ ] Test 1: P2PManager detecta LAN correctamente con IPs simuladas
- [ ] Test 2: Guest send ACCEPT incluye `guestIp` en el mensaje
- [ ] Test 3: Host ACCEPT handler envía `connection_info` con `ggpoHostIp`
- [ ] Test 4: Guest recibe connection_info y llama a ggpo-launch

## Pruebas de Integración (Sin Electron)

- [ ] Test 5: Flujo completo P2P+GGPO sin Electron (simulado)
  - Simular p2p-host → candidate → send challenge
  - Simular p2p-guest → detect LAN → send ACCEPT + guestIp
  - Simular host ACCEPT → send connection_info with hostIp
  - Simular guest recibe conn_info → ggpo-launch
  - Simular host recibe guest_ready → ggpo-launch

## Pruebas de Casos Límite

- [ ] Test 6: engine !== "ggpo" → cae al flujo RetroArch existente (sin regression)
- [ ] Test 7: method !== "p2p" para GGPO → usa tailscale/lan existente (sin regression)
- [ ] Test 8: p2p-guest falla → alert mostrado, flujo se cancela

## Pruebas de Regresión

- [ ] Test 9: Flujo P2P + RetroArch (LAN) sigue funcionando
- [ ] Test 10: Flujo P2P + RetroArch (WAN) sigue funcionando
- [ ] Test 11: Flujo Tailscale + GGPO sigue funcionando
- [ ] Test 12: Flujo LAN + GGPO (directo sin P2P) sigue funcionando

## Criterios de Éxito

| # | Prueba | Criterio |
|:---|:---|:---|
| 1 | LAN detection | Manager.status === "lan_check" tras startJoin |
| 2 | ACCEPT message | content.guestIp es string válido no vacío |
| 3 | connection_info | content.ggpoHostIp es string IP válido |
| 4 | ggpo-launch guest | Se invoca con remoteIp = hostIp |
| 5 | Flujo completo | Todas las funciones se llaman en orden correcto |
| 6-12 | Regresión | Sin cambios en flujos existentes |

## Resultados de Ejecución

- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todas las pruebas de regresión pasaron

## Fecha de Ejecución: [PENDIENTE]
## Estado: PENDIENTE
