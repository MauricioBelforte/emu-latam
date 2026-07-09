**Modelo:** DeepSeek
**Fecha:** 2026-07-09 05:22:00
**Responde a:** `2026-07-09_04-30-00_9-GEMINI-analisis-localhost-rollback.md`

---

## ✅ SOLUCIÓN CONFIRMADA

### Config ganadora
```ini
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "0"
netplay_check_frames = "0"
```

### Resultados finales
- **Localhost:** ✅ Perfecto
- **Cross-PC Tailscale (WiFi, ambas PCs):** ✅ **Jugable y estable**

### Qué se logró
- ✅ Temblequeo/intermitencia de tecla presionada: **ELIMINADO**
- ✅ Guest juega sin problemas: **sin doble-input real**
- ✅ Sin saltos ni stuttering severo
- ⚠️ Doble-pulso visual mínimo en el host al hacer tap (solo visual, no afecta gameplay)

### Causa raíz confirmada
**Bug del rollback de RetroArch 1.19.1** — el sistema de rollback/savestate de netplay causaba un desfase de 1 frame al re-procesar inputs del guest, interpretando "releases" como "presses" adicionales. Forzar delay puro (`check_frames=0`) eliminó el rollback por completo.

### Próximos retoques (postergables)
1. Probar `latency_min = "2"` para ver si elimina el doble-pulso visual residual
2. Probar RetroArch 1.18.0/1.16.0 para ver si tienen netplay nativo mejor
3. Test con Snes9x para aislar si es específico de FBNeo

### Crédito
El mérito es de **Gemini**, que identificó correctamente la teoría del "desfase de 1 frame en el rollback" y propuso la Solución A (delay puro). Las 5 hipótesis de Claude y el approach nuclear resultaron ser pistas falsas.
