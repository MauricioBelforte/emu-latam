# 04 - Registro de Pruebas - Test de Latencia, Buffer y Rollback

---

## [4] — 2026-07-16: Buffer dinámico 1-2 (min=1, range=1)

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_input_latency_frames_range: 1
- netplay_check_frames: 180

### Objetivo
Probar buffer dinámico: arranca en 1 frame (rápido) pero sube a 2
automáticamente si hay fluctuación. Busca el punto medio entre
velocidad (buffer=1) y estabilidad (buffer=2).

### Resultados (PENDIENTE)
- Doble toque: ?
- Lag percibido: ?

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

