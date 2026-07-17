**Modelo:** DeepSeek
**Fecha:** 2026-07-16 21:18
**Responde a:** (ninguno, es el planteo inicial)
**Tema:** Optimización de RetroArch netplay — latencia, desync, y audio cortado

---

## Contexto del Proyecto

Emu Latam es un launcher para jugar KOF '98 (FBNeo core) en RetroArch v1.19.1
en red (Tailscale, LAN directa, o túnel Bore). Usamos netplay de RetroArch.
El archivo de configuración compartido está en `retroarch/netplay_optimized.cfg`
(adjunto al final).

## Estado actual (lo que ya probamos y sabemos)

### Config actual en ambas PCs
```ini
run_ahead_enabled = "false"                     # Desactivado por doble input
netplay_input_latency_frames_min = "1"          # Mínimo 1 frame
netplay_input_latency_frames_range = "1"        # Rango +1 (buffer dinámico 1-2)
netplay_check_frames = "180"                    # Cada 3s chequea sync
video_frame_delay = "0"                         # Sin delay de video
video_hard_sync = "false"
input_poll_type_behavior = "0"
```

### Lo que ya descubrimos (pruebas reales, no teoría)

| Prueba | Config | Resultado |
|--------|--------|-----------|
| buffer=2, check=180, run_ahead=false | ✅ Sin doble toque ❌ Se siente lento | 
| buffer=1, check=180, run_ahead=false | ❌ Vuelve el doble toque | 
| min=1, range=1 (dinámico 1-2) | 🔄 En prueba ahora | 

### Síntomas principales (sin resolver)

1. **Doble toque del guest en host**: Cuando el buffer de latencia es 1 frame,
   los inputs del guest aparecen duplicados en la pantalla del host. Con buffer=2
   se soluciona, pero el juego se siente más lento (33ms de latencia agregada).

2. **Desync**: El juego se desincroniza (un personaje muere en una PC pero está
   vivo en la otra). Ocurre incluso con check_frames=180.

3. **Audio cortado**: El audio se escucha entrecortado, como si hubiera
   micro-cortes. Probablemente relacionado con stuttering por desync o buffer.

### Hipótesis descartadas
- run_ahead_enabled = true → ❌ Causaba doble input (incluso con check_frames=0)
- input_poll_type_behavior = "2" → ❌ Causaba doble input (peor que "0")
- netplay_nat_traversal / netplay_public_announce / netplay_use_mitm_server → ya están en false

---

## Qué necesitamos investigar

### Preguntas concretas:

1. **¿Hay alguna configuración de RetroArch/netplay que permita buffer=1
   SIN doble toque?** Por ejemplo:
   - `netplay_allow_slaves = "false"`
   - `netplay_require_slaves = "false"`
   - `netplay_shared_input = "false"`
   - ¿Algún timing específico de input polling?
   - ¿Alguna combinación de `run_ahead_enabled = "true"` pero SIN `run_ahead_secondary_instance`?

2. **¿Cómo evitar el desync?** Con check_frames=180 debería detectar desync
   cada 3s, pero a veces no corrige. ¿Hay otro mecanismo?
   - `netplay_sync_frames`?
   - ¿Core específico (FBNeo) tiene problemas de sync conocidos?
   - ¿RetroArch 1.19.1 tiene bugs de netplay conocidos?

3. **Audio cortado / stuttering**: ¿Qué configs de audio en RetroArch ayudan?
   - `audio_rate_control`?
   - `audio_sync`?
   - `audio_latency`?

4. **¿Algún fork de RetroArch con mejor netplay?** Recomendaciones de forks
   estables con netplay mejorado o con rollback netcode real.

5. **¿Solución alternativa?** ¿Conviene migrar a Fightcade en vez de RetroArch
   para este tipo de juego? (KOF '98 está en Fightcade con rollback nativo)

---

## Archivos relevantes
- `retroarch/netplay_optimized.cfg` — Config completa actual
- `DOCUMENTACION/12-Test-Latencia-Buffer/plan-actual/04-Codigo.md` — Registro de pruebas
- `DOCUMENTACION/11-Posibles-Fallas/plan-actual/04-Codigo.md` — Historial de fallas
- `DOCUMENTACION/04-Anti-Lag-RunAhead/` — Documentación del componente

---

## Criterios de éxito
1. Sin doble input del guest en host (tolerancia 0)
2. Sin desync visible (ambos jugadores ven lo mismo siempre)
3. Audio limpio (sin cortes)
4. Latencia percibida aceptable (ideal = buffer 1 frame, aceptable = buffer 2 frames)
5. Compatible con todos los modos (Tailscale, LAN directa, túnel Bore)
