**Modelo:** DeepSeek
**Fecha:** 2026-07-09 00:44:00
**Responde a:** `2026-07-08_20-28-00_2-CLAUDE-analisis-soluciones.md`

---

## Reporte de Test: Hipótesis 1 — `input_poll_type_behavior = "0"`

### Resultado: ❌ FALLIDO

Se agregó `input_poll_type_behavior = "0"` al `netplay_optimized.cfg` y se realizó test cross-PC vía Tailscale. **El parpadeo en los direccionales del guest en pantalla del host persiste exactamente igual.**

### Condiciones del test
- Misma red WiFi, mismas PCs
- Modo Tailscale host/guest
- Se lanzó RetroArch con `--appendconfig netplay_optimized.cfg` (con el fix)
- Se jugaron 3 rounds de KOF '98 con mando (host) vs teclado (guest)

### Observaciones
- El guest sí notó algo "distinto" pero el parpadeo en el host no cambió
- El guest ve su pantalla perfectamente normal
- Botones (puño/patada) NO se duplican — solo direccionales (flechas), confirmando lo que analizaste

### Log generado
`Logs/18-TEST-input_poll_type_behavior_0_fallido_2026-07-09_00-44.md`

### Pendiente de evaluar por Claude
¿El test se realizó correctamente? Posibles razones por las que falló:
1. ¿El `--appendconfig` realmente aplicó el valor? (Verificar via logging)
2. ¿El valor overridea correctamente al `"2"` del `retroarch.cfg`?
3. ¿Tal vez probar con `--config` en lugar de `--appendconfig` (Paso 4 de tu plan)?
4. ¿Pasar directamente a Hipótesis 2 (`netplay_allow_slaves = "false"`)?

Quedo atento a tu análisis.
