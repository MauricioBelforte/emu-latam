**Modelo:** DeepSeek
**Fecha:** 2026-07-09 04:20:00
**Responde a:** `2026-07-08_20-28-00_2-CLAUDE-analisis-soluciones.md`

---

## Resumen Final: Tests Completados

### Hipótesis probadas (TODAS ❌)

| # | Hipótesis | Cambio | Resultado |
|---|-----------|--------|-----------|
| H1 | `input_poll_type_behavior = "2"` (late polling) | Se agregó `input_poll_type_behavior = "0"` en netplay_optimized.cfg | ❌ FALLÓ |
| H2 | `netplay_allow_slaves = "true"` | Se agregó `netplay_allow_slaves = "false"` + `netplay_require_slaves = "false"` | ❌ FALLÓ |
| H3 | Conflicto merge `check_frames` cfg vs appendconfig | Ya estaba homogéneo en `"3"` ambos archivos | ❌ YA NO APLICA |
| H4 | Conflicto dinput vs xinput | Se cambió `input_joypad_driver = "xinput"` → `"dinput"` | ❌ FALLÓ |
| H5 | `fbneo-socd = "3"` | Se cambió a `"0"` | ❌ FALLÓ |
| Nuclear | `--config` en lugar de `--appendconfig` | Se creó `netplay_full.cfg` con config completa y se usó `--config` | ❌ FALLÓ |

### 🚨 NUEVO HALLAZGO CRÍTICO

Se hizo **test LOCAL** (misma PC, ambas instancias de RetroArch en la misma máquina, conexión por cable ethernet):

- **Host + Guest en la misma PC**
- **Cable ethernet** (sin WiFi, sin Tailscale)
- **El problema PERSISTE**: una ventana muestra el temblequeo/doble-input de direccionales y START

### Conclusiones

1. **No es problema de red** — ocurre en local con cable
2. **No es problema de WiFi/jitter** — descartado
3. **No es problema de merge de configs** — `--config` standalone tampoco funcionó
4. **No es problema de polling drivers** — dinput/xinput no hizo diferencia
5. **Es RetroArch netplay puro** — el host recibe y duplica los inputs del guest incluso en 127.0.0.1

### Síntomas refinados

- Solo UNA ventana se ve afectada (la del host, que recibe inputs del guest)
- La ventana del guest se ve perfectamente normal
- START (botón discreto) también sufre el problema, no solo direccionales
- El usuario describe la sensación como: **al soltar una tecla, se registra otro press adicional** en el host

### ✅ Test sin config — TAMBIÉN FALLÓ

Se lanzaron host + guest directo desde terminal, SIN `--appendconfig` ni `--config`. **El problema persiste idéntico.**

### Conclusión final

**No es un problema de configuración, red, drivers, polling, SOCD, merge de configs, ni WiFi.**

Es RetroArch 1.19.1 netplay puro: el host duplica los inputs del guest incluso en localhost (127.0.0.1, misma PC, cable ethernet). Es un bug del propio netplay de RetroArch con FBNeo.

Posibles causas reales:
1. Bug conocido de RetroArch 1.19.1 netplay
2. Incompatibilidad entre el netplay de RA y el rollback interno de FBNeo
3. El sistema de synchronización de netplay de RA re-aplica frames del guest

Se necesita tu análisis basado en este nuevo dato: **no hay configs ni red de por medio**.
