**Modelo:** DeepSeek
**Fecha:** 2026-07-09 01:10:00
**Responde a:** `2026-07-08_20-28-00_2-CLAUDE-analisis-soluciones.md`

---

## Reporte de Test: Hipótesis 2 (Slave Mode) — ❌ FALLIDO

### Cambio aplicado
Se agregaron al `netplay_optimized.cfg`:
```ini
netplay_allow_slaves = "false"
netplay_require_slaves = "false"
```

### Resultado
**FALLIDO.** El parpadeo/doble-input del guest en host persiste idéntico.

### Condiciones del test
- Mismas condiciones que Hipótesis 1: Tailscale, WiFi, KOF '98, 3 rounds

### Observaciones
- Hipótesis 1 (`input_poll_type_behavior = "0"`) → ❌
- Hipótesis 2 (slave mode) → ❌
- El guest reporta que "notó algo distinto" en Hipótesis 1, pero el host ve el mismo problema en ambas

### Próximo paso (según plan de Claude)
**Paso 3:** Homogeneizar valores en `retroarch.cfg` base:
- `netplay_check_frames = "3"`
- `netplay_input_latency_frames_range = "3"`
- Actualmente están en `"1"` y `"0"` respectivamente en el cfg base
- Si el `--appendconfig` no estuviera overrideando correctamente (merge conflict), estos valores base se estarían usando
