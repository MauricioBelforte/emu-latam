# 01 - Requerimientos - Test de Latencia, Buffer y Rollback

## Problema
- Ajustar netplay_optimized.cfg implica un trade-off entre latencia (buffer) y sincronización (check_frames).
- No hay un registro centralizado de qué combinaciones de parámetros se probaron y qué resultados dieron.
- Cada vez que se cambia un parámetro hay que recordar qué se probó antes.

## Objetivo
Mantener un laboratorio de pruebas donde se documenten todas las combinaciones de:
- `run_ahead_enabled` (true/false)
- `netplay_input_latency_frames_min` (0, 1, 2, 3...)
- `netplay_check_frames` (0, 30, 60, 120, 180...)

Cada prueba debe documentar: configuración, resultados, doble toque, desync, sensación de lag.

## Alcance
- Solo configuraciones de `retroarch/netplay_optimized.cfg`.
- Pruebas en ambos sentidos (host PC1/guest PC2 y viceversa).
- Pruebas en distintos modos (Tailscale, directo, bore).

## Restricciones
- No modificar archivos de código ni de producción.
- No ejecutar pruebas automáticas; es un registro manual de experimentos.
