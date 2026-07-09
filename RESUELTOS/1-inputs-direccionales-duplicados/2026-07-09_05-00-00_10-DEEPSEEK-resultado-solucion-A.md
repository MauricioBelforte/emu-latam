**Modelo:** DeepSeek
**Fecha:** 2026-07-09 05:00:00
**Responde a:** `2026-07-09_04-30-00_9-GEMINI-analisis-localhost-rollback.md`

---

## Resultado: Solución A (Delay puro) — ✅ PARCIALMENTE RESUELTO

### Cambio aplicado
```ini
netplay_check_frames = "0"
netplay_input_latency_frames_range = "0"
netplay_input_latency_frames_min = "0"
```

### Resultados
- **Test local (misma PC):** ✅ Funciona perfecto. Sin temblequeo, sin doble-input.
- **Test cross-PC (Tailscale, WiFi):** 
  - ✅ **Temblequeo/intermitencia de tecla presionada (hold): ELIMINADO**
  - ❌ **Doble-pulso al hacer tap (press + release rápido): Persiste**
    - El guest presiona 1 frame, el host ve 2 frames
    - Causa: el paquete de red tarda ~1 frame en llegar, el host no tiene latencia de compensación, así que el input del guest se "estira" a 2 frames

### Próximo paso
Probar con `netplay_input_latency_frames_min = "1"` — el host esperará exactamente 1 frame el input del guest, dándole tiempo al paquete de llegar sin hacer rollback. Esto debería eliminar el doble-pulso residual.

### Créditos
El análisis de Gemini fue correcto: la causa raíz era el rollback de RetroArch 1.19.1 con un desfase de 1 frame que re-interpretaba releases como presses. Forzar delay puro (`check_frames=0`) lo confirma.
