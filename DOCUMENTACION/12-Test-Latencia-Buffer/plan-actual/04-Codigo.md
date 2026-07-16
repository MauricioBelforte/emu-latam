# 04 - Registro de Pruebas - Test de Latencia, Buffer y Rollback

---

## [2] — 2026-07-16: Buffer 1 + check 180 + run_ahead false

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_check_frames: 180

### Objetivo
Verificar si con run_ahead=false el buffer=1 sigue sin doble toque.
Si es así, ganamos capacidad de respuesta (16ms vs 33ms) y el fix real era run_ahead todo el tiempo.

### Modo
- Tipo: Tailscale cross-PC
- Host: PC2 / Guest: PC1

### Resultados (PENDIENTE)
- Doble toque: ?
- Desync: ?
- Lag percibido: ?

### Observaciones
Prueba en curso. Se cambió netplay_optimized.cfg en esta PC.
La otra PC debe actualizar con git pull.

---

## [1] — 2026-07-16: Buffer 2 + check 180

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

