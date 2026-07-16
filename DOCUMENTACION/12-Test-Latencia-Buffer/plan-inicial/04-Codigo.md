# 04 - Registro de Pruebas - Test de Latencia, Buffer y Rollback

---

## [1] — 2026-07-16: Buffer 2 + check 180 (config actual)

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
Usuario reporta sensación de lentitud con buffer=2. El desync ocurrió a pesar de check=180, lo que sugiere que el problema de desync puede deberse a otro factor (versión de RA, core, red).

---

