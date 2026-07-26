# Plan de Testings — P2P Propio WAN Manual

## Pruebas Unitarias (p2p-module)

- [x] Test 1: encode/decode de RELAY_REQUEST (0x07) y RELAY_ACK (0x08)
- [x] Test 2: P2PManager.handlePacket procesa RELAY_REQUEST en host
- [x] Test 3: P2PManager.handlePacket procesa RELAY_ACK en guest
- [x] Test 4: waitForRelayAck detecta RELAY_ACK (raw-message)
- [x] Test 5: startJoinWan falla con RELAY_ACK timeout si no hay respuesta

## Pruebas de Integración (Electron + UPnP + Firewall)

- [x] Test 6: UPnP se abre con IP LAN real (excluye Tailscale)
- [x] Test 7: UPnP usa puerto bound real del transporte (no STUN)
- [x] Test 8: Windows Firewall regla creada para puerto bound real
- [x] Test 9: Build TypeScript + Vite sin errores

## Pruebas Manuales WAN

- [ ] Test 10: Conexión desde celular (4G/5G) con host que tiene UPnP funcional
  - **Host:** CREAR SALA P2P → esperar UPnP OK
  - **Guest:** UNIRSE A SALA P2P → input IP:puerto → CONECTAR
  - **Criterio:** Guest recibe RELAY_ACK en ≤ 8s, se establece relay
  - **Resultado 26-Jul:** ❌ FALLÓ — Router ISP no aplica UPnP

- [ ] Test 11: Conexión desde celular con port forwarding manual
  - **Host:** Configurar forwarding manual en router para puerto P2P
  - **Mismo flujo que Test 10**
  - **Criterio:** Conexión exitosa

- [ ] Test 12: Conexión LAN (regresión)
  - **Criterio:** Broadcast LAN sigue funcionando sin cambios
  - **Resultado:** ✅

- [ ] Test 13: Conexión Tailscale y Bootstrap (regresión)
  - **Criterio:** No se rompen flujos existentes
  - **Resultado:** ✅

## Casos Límite

- [x] Test 14: UPnP falla → host sigue funcionando en modo LAN
- [x] Test 15: Firewall no puede crear regla (no admin) → host sigue funcionando
- [x] Test 16: Guest ingresa formato IP:puerto inválido → error con mensaje claro
- [x] Test 17: IP de Tailscale en privateIps → excluida de UPnP

## Criterios de Éxito

| # | Prueba | Criterio |
|:---|:---|:---|
| 1 | RELAY_REQUEST encode/decode | Bytes correctos en el paquete |
| 2-3 | handlePacket RELAY | Estado cambia a relay_connected |
| 4 | waitForRelayAck | Promesa se resuelve al recibir RELAY_ACK |
| 5 | Timeout | Error "RELAY_ACK timeout" después de 8s |
| 6 | UPnP local IP | Log muestra IP 192.168.x.x, no 100.x.x.x |
| 7 | UPnP private port | Log muestra puerto bound real |
| 8 | Firewall | netsh crea regla sin error |
| 9 | Build | tsc + vite exitosos |
| 10 | WAN desde celular | Guest conecta al host |
| 11 | WAN con forwarding manual | Guest conecta al host |
| 12-13 | Regresión | Tests existentes siguen pasando |
| 14-17 | Casos límite | Sin crashes, mensajes claros |

## Resultados de Ejecución

- [x] Todas las pruebas unitarias pasaron (p2p-module 29/29)
- [x] Build TypeScript + Vite sin errores
- [x] Regresión LAN: broadcast + directo funcionales
- [x] Regresión Tailscale: funcional
- [x] Regresión Bootstrap: funcional
- [ ] **Test WAN desde celular: PENDIENTE** (requiere router que aplique UPnP o forwarding manual)
- [ ] Test WAN con forwarding manual: PENDIENTE

## Fecha de Ejecución: 2026-07-26
## Estado: PARCIAL (LAN ✅, WAN ❌ por router ISP)
