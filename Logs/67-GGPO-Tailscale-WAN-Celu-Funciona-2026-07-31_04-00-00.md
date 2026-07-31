# Log 67 — GGPO + Tailscale WAN con datos del celu FUNCIONA (31-Jul-2026)

## Resumen
Se verificó el flujo completo **GGPO + Tailscale** entre PC1 (WiFi Fibertel) y PC2 (datos del celu Personal Argentina). **FUNCIONA PERFECTO.**

## Pruebas realizadas
1. **Ping Tailscale desde PC2 (datos del celu)**:
   ```
   ping 100.91.21.22 → 4/4 respuestas, 0% pérdida, 0ms
   ```
   Tailscale atraviesa el bloqueo del carrier (usa puerto 443/DERP como fallback, no bloqueado).

2. **Flujo completo en la app (engine GGPO)**:
   - PC1: "CREAR SALA" (botón turquesa)
   - PC2: "UNIRME A SALA" (botón turquesa)
   - Ambos se ven dentro de la sala
   - PC1 envía reto por Tailscale en GGPO
   - PC2 acepta
   - **Resultado: ✅ fcadefbneo abre en ambas, conexión player 0/player 1 exitosa**

## Conclusión clave
- El bloqueo del carrier (Personal Argentina) **solo afecta puertos TCP altos** (bore.pub)
- **Tailscale es la solución para WAN con datos del celu**: usa WireGuard + fallback DERP en puerto 443
- El flujo de retos (ChallengeContext) con método "tailscale" en GGPO funciona end-to-end

## Alternativas para WAN sin Tailscale
- bore.pub: ❌ bloqueado por Personal Argentina
- Relay propio en VPS con puerto 443: pendiente (requiere VPS), sería el reemplazo de bore
- NAT traversal (módulo 22): no probado aún WAN real

## Pendientes
- [ ] Probar **RetroArch + Tailscale** WAN (JOIN directo por IP, no retos)
- [ ] Probar **NAT traversal** WAN real (sin Tailscale ni bore)
- [ ] Probar **Sala Pública (verde/bore)** desde otro carrier que no bloquee puertos
- [ ] Relay propio en VPS 443 si se quiere eliminar dependencia de Tailscale

## Archivos involucrados
- `client/src/App.tsx` — flujo sala turquesa, retos
- `client/src/context/ChallengeContext.tsx` — envío/aceptación de retos
- `client/src/main/index.ts` — handlers tailscale-host/tailscale-guest/ggpo
