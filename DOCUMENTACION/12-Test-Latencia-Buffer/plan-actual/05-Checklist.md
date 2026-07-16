# 05 - Checklist - Test de Latencia, Buffer y Rollback

## Pendientes
- [x] Probar buffer=1 + check=180 + run_ahead=false ← EN CURSO
- [ ] Probar buffer=0 + check=180 + run_ahead=false
- [ ] Probar buffer=1 + check=60 + run_ahead=false
- [ ] Probar buffer=1 + check=30 + run_ahead=false
- [ ] Probar buffer=2 + check=60 + run_ahead=false
- [ ] Probar buffer=1 + check=180 + run_ahead=false en modo directo (LAN)
- [ ] Documentar resultados de cada prueba

## Completado
- [x] Módulo 12 creado
- [x] Prueba [1]: buffer=2 + check=180 → sin doble toque, pero lento y con desync

## Historial
| Fecha | Prueba | Config |
|-------|--------|--------|
| 2026-07-16 | [1] | buffer=2, check=180, run_ahead=false |
