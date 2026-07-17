# 05 - Checklist - Test de Latencia, Buffer y Rollback

## Pendientes
- [ ] Probar buffer=1 + range=1 + check=0 (sin check a ver si doble visual en select desaparece)
- [ ] Probar si el doble visual en select de personajes se puede mitigar
- [ ] Investigar si FBNeo maneja distinto inputs en pantalla de select

## Completado
- [x] Módulo 12 creado
- [x] Prueba [1]: buffer=2 + check=180 → sin doble toque, lento
- [x] Prueba [2]: buffer=1 + check=180 → ❌ doble toque vuelve
- [x] Prueba [3]: buffer=2 + check=180 → suspendido (probamos dinámico)
- [x] Prueba [4]: min=1, range=1, check=180 → ✅ MEJOR CONFIG HASTA AHORA

## Historial
| Fecha | Prueba | Config | Resultado |
|-------|--------|--------|-----------|
| 2026-07-16 | [4] | min=1, range=1, check=180 | ✅ Jugable, doble solo en select visual |
| 2026-07-16 | [3] | buffer=2, check=180 | Suspendido |
| 2026-07-16 | [2] | buffer=1, check=180 | ❌ Doble toque |
| 2026-07-16 | [1] | buffer=2, check=180 | ✅ Sin doble toque, lento |
