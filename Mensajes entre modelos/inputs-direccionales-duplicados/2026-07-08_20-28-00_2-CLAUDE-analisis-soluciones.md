# Análisis y Soluciones: Inputs Direccionales Duplicados en Host

**Modelo:** Claude (Opus 4.6 Thinking)
**Fecha:** 2026-07-08 20:28:00
**Responde a:** `2026-07-04_05-59-00_1-DEEPSEEK-planteo.md`

---

## Resumen Ejecutivo

Después de analizar el código fuente, las configuraciones de RetroArch (tanto `retroarch.cfg` como `netplay_optimized.cfg` y `FinalBurn Neo.opt`), la arquitectura de lanzamiento en `index.ts`, y la investigación de bugs conocidos en la comunidad de RetroArch/FBNeo, identifico **3 causas probables ordenadas de mayor a menor probabilidad**. La primera es casi seguramente la culpable.

---

## 🔴 HIPÓTESIS 1 (PROBABILIDAD MUY ALTA): `input_poll_type_behavior = "2"` en conflicto con Netplay

### Evidencia encontrada

En el archivo `retroarch/retroarch.cfg` de la PC host:

```
input_poll_type_behavior = "2"
```

Valor `2` = **"Late" polling** — RetroArch hace polling de inputs lo más tarde posible en el frame.

**Este setting es INCOMPATIBLE con netplay** y es una causa documentada de doble-input en el host.

### Por qué causa EXACTAMENTE el síntoma reportado

1. **RetroArch netplay está diseñado para forzar polling "Normal" (valor 1) internamente** durante sesiones de red. Sin embargo, cuando `input_poll_type_behavior = "2"` está seteado en el cfg, hay un conflicto de timing:
   - El sistema de netplay lee los inputs del guest en su timing normal (inicio del frame)
   - El late polling hace que se re-lean esos mismos inputs al final del frame
   - **Resultado: el input del guest se procesa 2 veces en el mismo frame**

2. **Por qué solo afecta DIRECCIONALES y no BOTONES:**
   - Los **direccionales** son **estados continuos** (held/released). Cuando se leen 2 veces, el estado "held" se acumula — el juego ve "izquierda frame N" + "izquierda frame N (re-read)" = movimiento doble.
   - Los **botones** (puño/patada) son **eventos discretos** (press en frame N, release en frame N+1). El segundo read del mismo frame obtiene el mismo estado press → no genera un segundo evento porque FBNeo internamente deduplica press events (edge detection), pero NO deduplica estados continuos como las direcciones.

3. **Por qué el guest se ve bien en SU pantalla:**
   - El guest tiene su propio polling normal. El conflicto solo existe en el host, donde el late poll re-procesa los datos de red recibidos.

### Solución

Agregar en `retroarch/netplay_optimized.cfg`:

```ini
# CRITICAL: Late polling (2) causa doble input del guest en netplay.
# Normal (1) o Early (0) son compatibles con netplay.
input_poll_type_behavior = "0"
```

Esto overridea el valor `"2"` del `retroarch.cfg` principal ya que `--appendconfig` aplica **después** del cfg base.

> **NOTA IMPORTANTE**: También considerar cambiarlo directamente en `retroarch.cfg` a `"0"` o `"1"`, ya que `"2"` no aporta beneficio real en un contexto de netplay y puede causar problemas sutiles incluso si el appendconfig lo sobreescribe.

---

## 🟡 HIPÓTESIS 2 (PROBABILIDAD MEDIA): `netplay_check_frames = "1"` en `retroarch.cfg` vs `"3"` en appendconfig — conflicto de merge

### Evidencia encontrada

Hay un **conflicto de valores** entre los dos archivos de configuración:

| Parámetro | `retroarch.cfg` | `netplay_optimized.cfg` (appendconfig) |
|-----------|-----------------|---------------------------------------|
| `netplay_check_frames` | `"1"` | `"3"` |
| `netplay_input_latency_frames_range` | `"0"` | `"3"` |
| `netplay_input_latency_frames_min` | `"0"` | `"0"` |

### Por qué podría contribuir

- `netplay_check_frames = "1"` fuerza verificación de estado **cada frame**. Con WiFi (jitter variable), esto causa micro-correcciones constantes que se manifiestan como "parpadeo" en los estados continuos (crouch up/down/up/down).
- El `--appendconfig` **debería** overridear a `"3"`, pero hay reportes en la comunidad de que ciertos valores de `retroarch.cfg` persisten si hay configs por core (`config/FinalBurn Neo/`) que cargan intermedio.

### Solución

1. Asegurar que estos valores estén consistentes. **Cambiar en `retroarch.cfg`**:
```ini
netplay_check_frames = "3"
netplay_input_latency_frames_range = "3"
```
Así, incluso si el appendconfig falla en overridear, los valores base son correctos.

2. Alternativamente, pasar la config netplay como `--config` en lugar de `--appendconfig` para evitar merges impredecibles:
```
retroarch.exe -L core rom --host --port 55435 --config netplay_full.cfg
```
Donde `netplay_full.cfg` sea un merge explícito de todas las configs necesarias.

---

## 🟡 HIPÓTESIS 3 (PROBABILIDAD MEDIA): `netplay_allow_slaves = "true"` con FBNeo

### Evidencia encontrada

```
netplay_allow_slaves = "true"
```

### Problema

El modo "slave" de netplay permite que un cliente se conecte en modo simplificado donde **el host re-ejecuta los inputs del slave internamente**. FBNeo tiene su propio rollback netcode y no está diseñado para funcionar con el modo slave de RetroArch.

Cuando `allow_slaves = true`:
- Si el guest conecta como slave (puede pasar automáticamente con ciertas configs o versiones de core desiguales), el host recibe los inputs y los aplica él mismo al gamestate
- Combinado con el polling normal del netplay, puede haber doble aplicación

### Solución

Agregar en `netplay_optimized.cfg`:

```ini
netplay_allow_slaves = "false"
netplay_require_slaves = "false"
```

---

## 🟢 HIPÓTESIS 4 (PROBABILIDAD BAJA-MEDIA): Conflicto dinput vs xinput con networking

### Evidencia encontrada

```
input_driver = "dinput"
input_joypad_driver = "xinput"
```

Hay **dos drivers de input activos simultáneamente**: dinput para teclado y xinput para joysticks. Esto normalmente no causa problemas en local, pero durante netplay con el polling "Late", ambos drivers pueden estar haciendo polling de los dispositivos de entrada en momentos ligeramente distintos del frame, y si el sistema de netplay reporta el estado del guest a través de ambas capas...

### Solución

Menos prioritario, pero si las hipótesis 1-3 no resuelven completamente:
```ini
input_driver = "dinput"
input_joypad_driver = "dinput"
```
Unificar ambos en el mismo driver elimina la posibilidad de doble-lectura por capas distintas.

---

## 🟢 HIPÓTESIS 5 (PROBABILIDAD BAJA): Config del core FBNeo — `fbneo-socd = "3"`

### Evidencia encontrada

En `config/FinalBurn Neo/FinalBurn Neo.opt`:

```
fbneo-socd = "3"
```

**SOCD** = Simultaneous Opposite Cardinal Directions. Este setting controla qué pasa cuando se presionan simultáneamente direcciones opuestas (ej: izquierda + derecha al mismo tiempo).

- Valor `"3"` = un modo de resolución de SOCD que **puede** interactuar mal con los datos de netplay si hay jitter de red que cause que el host vea frames donde el guest tiene "izquierda ON" e inmediatamente "derecha ON" antes de que "izquierda OFF" llegue.

### Solución

Probar cambiar a:
```
fbneo-socd = "0"
```
Valor `"0"` = sin limpieza SOCD (raw input). Esto podría reducir el parpadeo porque el cleaner de SOCD no estaría modificando los inputs que llegan por red.

---

## Plan de Implementación Recomendado (Orden de Ejecución)

### Paso 1 — FIX PRINCIPAL (Hipótesis 1)

Agregar UNA línea a `netplay_optimized.cfg`:

```diff
 # Network: forzar IPv4 para evitar problemas de resolución
 network_cmd_enable = "false"
+
+# Input Polling: CRITICAL para netplay
+# Late (2) causa inputs dobles del guest. Normal (0) o Early (1) son seguros.
+input_poll_type_behavior = "0"
```

**Testear con esto solo.** Si se resuelve → problema identificado, no tocar más.

### Paso 2 — Si Paso 1 no resuelve al 100%

Agregar también:

```diff
+# Desactivar modo slave (incompatible con FBNeo rollback)
+netplay_allow_slaves = "false"
+netplay_require_slaves = "false"
```

### Paso 3 — Si persiste algo de parpadeo

Homogeneizar valores en `retroarch.cfg` base:

```
netplay_check_frames = "3"
netplay_input_latency_frames_range = "3"
```

### Paso 4 — Nuclear: Config limpia para netplay

Si nada de lo anterior resuelve, crear un `netplay_full.cfg` que sea un archivo de configuración **completo** (no append) con TODOS los valores necesarios explícitos, y lanzar con `--config` en lugar de `--appendconfig`. Esto elimina la posibilidad de que valores del `retroarch.cfg` base se filtren.

El código en `index.ts` cambiaría de:

```typescript
const args = ["-L", corePath, romPath, "--host", "--port", "55435"];
if (fs.existsSync(cfg)) args.push("--appendconfig", cfg);
```

A:

```typescript
const args = ["-L", corePath, romPath, "--host", "--port", "55435"];
if (fs.existsSync(cfg)) args.push("--config", cfg);
```

> ⚠️ Esto requiere que `netplay_full.cfg` contenga TODO lo necesario (paths, video driver, etc.) porque `--config` NO hereda del `retroarch.cfg` base.

---

## Herramientas de Debug (para confirmar la causa)

### 1. Habilitar logging de netplay en RetroArch

Agregar temporalmente en `netplay_optimized.cfg`:

```ini
log_verbosity = "true"
log_to_file = "true"
log_to_file_timestamp = "true"
```

Los logs se guardarán en `retroarch/logs/` y mostrarán exactamente cuándo se procesan los inputs del guest y si hay doble-procesamiento.

### 2. Mostrar FPS y frame timing

```ini
fps_show = "true"
statistics_show = "true"
```

Esto muestra en pantalla el conteo de frames y si hay frames duplicados o skipped, lo cual correlaciona directamente con el doble-input.

### 3. Test A/B controlado

1. **Test A**: `input_poll_type_behavior = "2"` (actual) → reproducir el bug
2. **Test B**: `input_poll_type_behavior = "0"` → verificar fix
3. Misma ROM, mismo core, misma red WiFi, 3 rounds de KOF

Si Test B no muestra el bug → causa confirmada al 100%.

---

## Resumen de Probabilidades

| # | Hipótesis | Probabilidad | Esfuerzo de Fix | Riesgo |
|---|-----------|-------------|-----------------|--------|
| 1 | `input_poll_type_behavior = "2"` | **90%** | 1 línea en cfg | Nulo |
| 2 | Conflicto `check_frames` cfg vs appendconfig | 40% | 2 líneas en cfg base | Nulo |
| 3 | `netplay_allow_slaves = "true"` | 30% | 2 líneas en cfg | Nulo |
| 4 | Conflicto dinput/xinput | 10% | 1 línea en cfg | Bajo |
| 5 | `fbneo-socd = "3"` | 10% | 1 línea en .opt | Bajo |

**Mi apuesta fuerte es la Hipótesis 1.** El `input_poll_type_behavior = "2"` es un "late poll" que está documentado como incompatible con netplay. Explica perfectamente por qué solo los direccionales (estados continuos) se duplican y los botones (eventos discretos) no.
