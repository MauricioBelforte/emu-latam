# 05 - Checklist - Test de Latencia, Buffer y Rollback

## Pendientes
- [x] Probar buffer=1 + range=1 (dinámico) + check=180 ← EN CURSO
- [ ] Probar buffer=2 + check=180 (si el dinámico no funciona)
- [ ] Probar buffer=1 + check=0 + run_ahead=false
- [ ] Probar buffer=2 + check=0 + run_ahead=false
- [ ] Documentar resultados de cada prueba

## Completado
- [x] Módulo 12 creado
- [x] Prueba [1]: buffer=2 + check=180 → sin doble toque, lento
- [x] Prueba [2]: buffer=1 + check=180 → ❌ doble toque vuelve
- [x] Prueba [3]: buffer=2 + check=180 → suspendido (probamos dinámico)

## Historial
| Fecha | Prueba | Config | Resultado |
|-------|--------|--------|-----------|
| 2026-07-16 | [4] | min=1, range=1, check=180 | 🔄 Pendiente |
| 2026-07-16 | [3] | buffer=2, check=180 | Suspendido |
| 2026-07-16 | [2] | buffer=1, check=180 | ❌ Doble toque |
| 2026-07-16 | [1] | buffer=2, check=180 | ✅ Sin doble toque, lento |
