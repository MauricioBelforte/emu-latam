# Log 18 — Test: `input_poll_type_behavior = "0"` fallido

**Fecha:** 2026-07-09 00:44
**Tipo:** Prueba de hipótesis
**Hipótesis probada:** #1 de Claude — `input_poll_type_behavior = "2"` (late polling) causa doble-input del guest en host

## Cambio realizado

Se agregó en `retroarch/netplay_optimized.cfg` línea 32:
```ini
input_poll_type_behavior = "0"
```

## Resultado

**FALLIDO.** El parpadeo en los direccionales del guest en la pantalla del host persiste exactamente igual.

## Detalles del test

- **Modo:** Tailscale host/guest
- **Red:** WiFi (ambas PCs)
- **Versión RA:** 1.19.1
- **Core:** FBNeo (fbneo_libretro.dll)
- **ROM:** kof98.zip
- **Jugadores:** 2 (host PC1 con mando, guest PC2 con teclado)
- **Síntoma observado:** Guest mueve personaje con flechas → en pantalla del host el personaje se mueve el doble y parpadea al agacharse. Guest ve todo normal.

## Código original

```ini
# (no existía la línea en netplay_optimized.cfg)
```

## Código nuevo (probado, no funcionó)

```ini
input_poll_type_behavior = "0"
```

## Hipótesis 2 — Slave Mode (también fallida 2026-07-09 01:10)

Se agregó `netplay_allow_slaves = "false"` y `netplay_require_slaves = "false"`. Mismo resultado: el parpadeo persiste.

## Hipótesis 3 — Conflicto merge check_frames (descartada 2026-07-09 01:15)

Se verificó que `retroarch.cfg` ya tiene `netplay_check_frames = "3"` y `netplay_input_latency_frames_range = "3"`. No hay conflicto de merge. Esta hipótesis estaba automáticamente descartada.

## Hipótesis 4 — dinput vs xinput (fallida 2026-07-09 01:22)

Se cambió `input_joypad_driver = "dinput"` (antes xinput). Mismo resultado. ❌

## 🚨 Nuevo síntoma clave

El START (botón discreto) también parpadea cuando se mantiene presionado, visible solo desde el host. Esto contradice el análisis de Claude de que "solo direccionales se ven afectados". El problema parece más profundo que el polling.

## Hipótesis 5 — fbneo-socd (fallida)

Se cambió `fbneo-socd = "0"`. Mismo resultado ❌

## Paso Nuclear — --config standalone (fallido)

Se creó `netplay_full.cfg` y se usó `--config` en lugar de `--appendconfig`. Mismo resultado ❌

## 🚨 Test LOCAL (misma PC, cable ethernet)

Se lanzaron host + guest en la misma PC con cable ethernet. **El problema PERSISTE.** No es problema de red, WiFi, ni merge de configs. Es RetroArch netplay puro — el host duplica inputs del guest incluso en 127.0.0.1.

## Test sin NINGÚN config custom (2026-07-09 04:20)

Se lanzaron host + guest directo desde terminal SIN `--appendconfig` ni `--config`. **EL PROBLEMA SIGUE IGUAL.** ❌

## ✅ SOLUCIÓN PARCIAL — Modo delay puro (Gemini, Solución A)

Basado en análisis de Gemini (teoría del desfase de 1 frame en rollback), se aplicó:

```ini
netplay_check_frames = "0"
netplay_input_latency_frames_range = "0"
netplay_input_latency_frames_min = "0"
```

### Resultado
- ✅ **El temblequeo/intermitencia de tecla presionada DESAPARECIÓ**
- ❌ **El doble-pulso al hacer tap (presionar y soltar rápido) persiste** — el guest presiona 1 frame, el host ve 2 frames porque el paquete tarda 1 frame en llegar y el host no tiene compensación

### Pendiente
Probar `netplay_input_latency_frames_min = "1"` para que el host espere exactamente 1 frame el input del guest y elimine el doble-pulso.

## Conclusión

El análisis de Gemini fue correcto: era un bug del rollback de RetroArch 1.19.1 que causaba desfase de 1 frame al re-procesar inputs. Forzar delay puro soluciona el temblequeo. Falta ajustar fine-tuning para eliminar el doble-pulso residual.
