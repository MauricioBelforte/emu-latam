# Log 35 — Hallazgo: Tiriteo por check sync en AMBAS PCs

**Fecha:** 2026-07-18 18:00:00

## Resumen
Se descubrió que el tiriteo (personaje se agacha/se para, frena/acelera
durante netplay) NO es exclusivo del PC Ryzen 7. Ocurre en AMBAS PCs,
pero el Ryzen lo muestra muy notorio (rítmico, sincrónico con el intervalo
check_frames) mientras el Athlon lo muestra casi imperceptible.

El tiriteo afecta TODOS los inputs direccionales (← → ↓), no solo el
agachado. Es una consecuencia directa del check sync de RetroArch que
congela momentáneamente el sistema de inputs.

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

### Hallazgo [9] — Tiriteo por check sync en AMBAS PCs
- **Descubrimiento clave:** El tiriteo NO es exclusivo del Ryzen.
  - Ryzen: Muy notorio, rítmico, sincrónico con check_frames.
    Afecta todos los inputs direccionales (↓ ← →). Con check=30 se
    agacha/se para cada ~0.5s. Con check=180 cada ~3s.
  - Athlon: El MISMO tiriteo existe pero es casi imperceptible.
    Esporádico y asimétrico.
- **Confirmado en:** Lobby nativo RA, host directo, retos Emu Latam.
- **Causa:** El check sync de RetroArch congela momentáneamente el
  sistema de inputs. No es un problema de "paquete que llega tarde".
- **Solución:** check_frames=0 elimina el tiriteo (test [6]) pero sin
  verificación de sync. Con check_frames=30, usar Athlon como host
  minimiza el tiriteo percibido en el Ryzen.

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
