# 25 — Fix doble input guest en host: netplay_check_frames = 0

**Fecha:** 2026-07-15 17:01:00
**Tipo:** Bugfix
**Componentes:** 04-Anti-Lag-RunAhead

## Problema
- En la pantalla del host, el player 2 (guest) se movía uno de más (doble input).
- La solución ya estaba documentada en `3-DOCUMENTO-TAREAS-ACTUAL.md` (Fase 4) desde Julio 2026: `netplay_check_frames = "0"`.
- Pero el archivo `retroarch/netplay_optimized.cfg` nunca se actualizó — seguía con `netplay_check_frames = "30"`.

## Cambio
- `retroarch/netplay_optimized.cfg`:
  - `netplay_check_frames = "30"` → `"0"`
  - Se actualizó el comentario para reflejar que desactiva check frames anti-doble-input.
- Backup guardado en `Obsoletos/retroarch/`.

## Archivos modificados
- `retroarch/netplay_optimized.cfg` — check_frames de 30 a 0
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` — retoque marcado como aplicado

## Verificación
- Todos los flujos (MITM, Bore, Tailscale, Directo) ya usan `--appendconfig netplay_optimized.cfg`.
- Backup disponible en `Obsoletos/retroarch/`.
