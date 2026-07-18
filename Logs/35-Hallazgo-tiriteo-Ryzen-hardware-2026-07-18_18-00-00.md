# Log 35 — Hallazgo: Tiriteo por hardware/driver del PC Ryzen 7

**Fecha:** 2026-07-18 18:00:00

## Resumen
Se descubrió que el tiriteo (personaje se para al agachado durante netplay)
NO es un bug de Emu Latam ni de la configuración de RetroArch, sino un
problema de hardware/drivers del PC Ryzen 7. El PC Athlon X2 nunca presenta
tiriteo en ningún escenario.

## Pruebas realizadas este día

### Test [7] — min=2, range=2, check_frames=0
- **Objetivo:** Eliminar doble visual en select de personajes
- **Resultado:** ❌ Desync ocurrió
- **Conclusión:** Buffer más grande causó desync (la divergencia se acumuló
  sin check_frames)

### Test [8] — check_frames=300 + input_block_timeout (1, 3, 10)
- **Objetivo:** Mantener verificación de sync sin tiriteo
- **Resultado:** ❌ No funcionó. input_block_timeout no mitiga el tiriteo
  porque el check sync resetea estado del juego, no es un problema de timing.
  input_block_timeout=10 causó desync de audio.

### Hallazgo [9] — Tiriteo por hardware
- **Descubrimiento clave:** El tiriteo depende de QUÉ PC recibe los datos,
  no del método de conexión ni de quién es host/guest.
- **PC Ryzen 7 5700G:** SIEMPRE tirittea al recibir datos netplay
- **PC Athlon X2:** NUNCA tirittea
- **Confirmado en:** Lobby nativo RA, host directo, retos Emu Latam
- **Solución práctica:** Athlon como host, Ryzen como guest

### Config estable final
```ini
run_ahead_enabled = "false"
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "1"
netplay_check_frames = "30"
```

## Archivos modificados
- `retroarch/netplay_optimized.cfg` — check_frames=30, comentarios actualizados
- `DOCUMENTACION/12-Test-Latencia-Buffer/plan-actual/04-Codigo.md` — Tests [7], [8], [9] documentados
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` — Hallazgo agregado
- `DOCUMENTACION/4-DOCUMENTO-EJECUCION-ACTUAL.md` — Problema conocido agregado
