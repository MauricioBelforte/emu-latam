# 04 - Registro de Pruebas - Test de Latencia, Buffer y Rollback

---

## [5] — 2026-07-16: Buffer dinámico + check=30

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_input_latency_frames_range: 1
- netplay_check_frames: 30 (↓ desde 180)

### Objetivo
Reducir check_frames de 180 a 30 (0.5s) para corregir desyncs más rápido.
El desync ocurría con 180 porque tardaba 3s en detectarse.

### Resultados (PENDIENTE)
- Desync: ?
- Doble toque: ?
- Select personajes: ?

---

## [4] — 2026-07-16: Buffer dinámico 1-2 (min=1, range=1) ✅ JUGABLE

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_input_latency_frames_range: 1
- netplay_check_frames: 180

### Objetivo
Probar buffer dinámico: arranca en 1 frame (rápido) pero sube a 2
automáticamente si hay fluctuación.

### Modo
- Tipo: Tailscale cross-PC
- Host: PC2 / Guest: PC1 (guest presiona ← en select, host ve doble)
- Sentido inverso también probado

### Resultados
- **Jugabilidad general**: ✅ MUY BUENA. Sin lag perceptible. Respuesta rápida.
- **Doble input en juego**: ✅ No hay. Los movimientos durante la pelea son correctos.
- **Select de personajes**: ⚠️ En PC del host se ve un doble movimiento visual
  cuando el guest elige personaje (se mueve 2 slots y vuelve), pero en la
  PC del guest se ve normal. Es solo visual, no afecta la selección real.
- **Lag percibido**: 1 (instantáneo, mejor que buffer=2 fijo)
- **Audio**: Sin cortes durante la pelea.

### Conclusión
Esta es la mejor configuración hasta ahora. El doble movimiento en el select
de personajes parece ser un artefacto visual de netplay en esa pantalla
específica (FBNeo maneja distinto los inputs en select), no un problema real
de input duplicado. Durante la pelea el comportamiento es correcto en ambos lados.

### Recomendación
Usar esta configuración como estable: `min=1, range=1, check=180, run_ahead=false`.
El doble visual en select es aceptable y no afecta la jugabilidad.

---

## [3] — 2026-07-16: Buffer 2 + check 180 + run_ahead false (suspendido)

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 2 (no probado, saltamos a [4])
- netplay_check_frames: 180

---

## [2] — 2026-07-16: Buffer 1 + check 180 + run_ahead false ❌

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_check_frames: 180

### Resultados
- Doble toque: ❌ VOLVIÓ (confirmado, misma configuración que [1] pero con buffer=1)
- Desync: ?
- Lag percibido: 1 (instantáneo)

### Conclusión
El buffer de 1 frame es insuficiente. Incluso con run_ahead=false,
el doble toque aparece. El mínimo necesario es 2 frames.
Run-ahead no era la causa principal; el buffer de 1 frame no da
margen para que los inputs del guest lleguen a tiempo.

---

## [1] — 2026-07-16: Buffer 2 + check 180 ✅

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 2
- netplay_check_frames: 180

### Modo
- Tipo: Tailscale cross-PC
- Host: PC2 / Guest: PC1

### Resultados
- Doble toque: ✅ No hay
- Desync: ❌ Se detectó desync (personaje muerto en una PC, vivo en otra)
- Lag percibido: 3 (notorio, "lento")

### Observaciones
Usuario reporta sensación de lentitud con buffer=2. El desync ocurrió a pesar de check=180.

---

