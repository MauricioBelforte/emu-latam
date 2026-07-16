# 02 - Análisis - Test de Latencia, Buffer y Rollback

## Parámetros a probar

| Parámetro | Valores | Efecto |
|-----------|---------|--------|
| `run_ahead_enabled` | true / false | Predice frames para reducir latencia. Causa doble input en netplay. |
| `netplay_input_latency_frames_min` | 0, 1, 2, 3 | Buffer de frames que espera antes de mostrar input. Más = más tolerante pero más lag. |
| `netplay_check_frames` | 0, 30, 60, 120, 180 | Cada N frames verifica sincronía. Más frecuente = más chances de doble input. |

## Variables de entorno
- Conexión: Tailscale cross-PC / Directo LAN / Bore tunnel / MITM local
- Sentido: PC1 host vs PC2 host
- Core: FBNeo (KOF '98)
- RetroArch versión: 1.19.1

## Criterios de evaluación
1. **Doble toque**: Guest presiona → una vez, host muestra 2 movimientos?
2. **Desync**: Los dos lados ven el mismo estado del juego?
3. **Lag percibido**: Sensación de respuesta al presionar botones (1=instantáneo, 5=injugable)
