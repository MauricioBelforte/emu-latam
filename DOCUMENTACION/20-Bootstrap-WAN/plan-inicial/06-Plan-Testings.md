# 06 — Plan de Testings — Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN

## Pruebas Unitarias (Script desechable)

- [ ] Test 1: `publishBoreUrl()` POST a dpaste mock, retorna room code
- [ ] Test 2: `fetchBoreUrl()` GET con room code válido, retorna bore URL
- [ ] Test 3: `fetchBoreUrl()` con room code inválido (404 mock), retorna error
- [ ] Test 4: dpaste timeout simulado → retorna error + fallback manual

## Pruebas de Integración (Simuladas)

- [ ] Test 5: `startNakamaBore()` spawn simulado + regex extraction
- [ ] Test 6: Flujo host completo simulado: startNakamaBore + publishBoreUrl
- [ ] Test 7: Flujo guest completo simulado: fetchBoreUrl + setNakamaConfig

## Pruebas de Casos Límite

- [ ] Test 8: `handleBootstrapClose()` sin nada activo → no crash
- [ ] Test 9: bore URL con formato inválido desde dpaste → error manejado
- [ ] Test 10: room code vacío → error antes de llamar API

## Pruebas de Regresión

- [ ] Test 11: Build TypeScript sin errores
- [ ] Test 12: test_stable_flows.js 50/51
- [ ] Test 13: test_p2p_ggpo.js 39/39
- [ ] Test 14: test_ggpo_p2p_wan.js 17/17

## Criterios de Éxito

| # | Prueba | Criterio |
|:--|:-------|:---------|
| 1 | publishBoreUrl | roomCode es string de 6+ caracteres |
| 2 | fetchBoreUrl válido | boreUrl contiene "bore.pub:" o ":" |
| 3 | fetchBoreUrl inválido | success=false, error describe el problema |
| 4 | dpaste timeout | success=false, error menciona fallback manual |
| 5 | startNakamaBore | url contiene ":" (host:port) |
| 6 | Flujo host | success=true + roomCode no vacío |
| 7 | Flujo guest | success=true + setNakamaConfig fue llamado |
| 8 | Close sin init | Sin excepción |
| 11-14 | Regresión | Todos los tests existentes pasan |

## Resultados de Ejecución

- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todas las pruebas de regresión pasaron

## Fecha de Ejecución: [PENDIENTE]
## Estado: PENDIENTE
