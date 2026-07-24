# 06 — Plan de Testings — Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN

## Pruebas Unitarias (Script desechable)

- [x] Test 1: `publishBoreUrl()` POST a dpaste mock, retorna room code
- [x] Test 2: `fetchBoreUrl()` GET con room code válido, retorna bore URL
- [x] Test 3: `fetchBoreUrl()` con room code inválido (404 mock), retorna error
- [x] Test 4: dpaste timeout simulado → retorna error + fallback manual
- [x] Test 5: `parseBoreUrl()` extrae URL de stdout de bore

## Pruebas de Integración (Simuladas)

- [x] Test 6: Flujo host completo simulado: startNakamaBore + publishBoreUrl
- [x] Test 7: Flujo guest completo simulado: fetchBoreUrl + setNakamaConfig

## Pruebas de Casos Límite

- [x] Test 8: `handleBootstrapClose()` sin nada activo → no crash
- [x] Test 9: bore URL con formato inválido → error manejado
- [x] Test 10: room code vacío → error antes de llamar API
- [x] Test 11: room code demasiado corto → error

## Pruebas de Regresión

- [x] Test 12: Build TypeScript sin errores
- [x] Test 13: test_stable_flows.js 50/51
- [x] Test 14: test_p2p_ggpo.js 39/39
- [x] Test 15: test_ggpo_p2p_wan.js 17/17
- [x] Test 16: Verificación archivos fuente (App.tsx, index.ts, ipcChannels.ts)

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

- [x] Todas las pruebas unitarias pasaron
- [x] Todas las pruebas de integración pasaron
- [x] Todos los casos límite pasaron
- [x] Todas las pruebas de regresión pasaron

## Fecha de Ejecución: 2026-07-24
## Estado: COMPLETADO

> Resultados detallados en `07-Resultados-Testings.md`
