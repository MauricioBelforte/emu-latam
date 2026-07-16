# 03 - Diseño - Test de Latencia, Buffer y Rollback

## Estructura del registro

Cada entrada de prueba sigue este formato:

```
## [N] — Fecha

### Config
- run_ahead_enabled: ?
- netplay_input_latency_frames_min: ?
- netplay_check_frames: ?

### Modo
- Tipo: Tailscale / Directo / Bore / MITM
- Host: PC1 / PC2
- Guest: PC1 / PC2

### Resultados
- Doble toque: ✅/❌ (descripción)
- Desync: ✅/❌ (descripción)
- Lag percibido: 1-5

### Observaciones
...
```

## Archivo de registro
`DOCUMENTACION/12-Test-Latencia-Buffer/plan-actual/04-Codigo.md` contiene el historial completo de pruebas, con la más reciente al principio.
