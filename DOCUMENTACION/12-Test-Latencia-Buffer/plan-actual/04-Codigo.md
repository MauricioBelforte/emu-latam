# 04 - Registro de Pruebas - Test de Latencia, Buffer y Rollback

---

## [3] — 2026-07-16: Buffer 2 + check 180 + run_ahead false

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 2
- netplay_check_frames: 180

### Objetivo
Volver a buffer=2 que funcionó. Evaluar si la sensación de lentitud
es aceptable o si se puede mitigar con otros ajustes.

### Modo
- Tipo: Tailscale cross-PC
- Host: PC2 / Guest: PC1

### Resultados
- Doble toque: ✅ No hay
- Desync: ?
- Lag percibido: ?

### Observaciones
Pendiente de prueba completa.

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

