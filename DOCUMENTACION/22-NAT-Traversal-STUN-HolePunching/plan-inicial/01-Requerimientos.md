# 01 — Requerimientos: NAT Traversal (STUN + Hole Punching)

## Problema
Actualmente los únicos métodos WAN que funcionan son:
1. **Tailscale** — P2P real, requiere instalación externa
2. **Bore** — relay TCP público, latencia extra, no es P2P

El método P2P fucsia (UPnP) falló porque el router ISP acepta UPnP pero no aplica el forwarding. Sin Tailscale ni UPnP funcional, no hay forma de conectar P2P entre dos PCs en distintas redes.

## Objetivo
Agregar una capa de **NAT traversal via STUN + hole punching** que intente conexión P2P directa antes de caer en relay (bore). Debe ser transparente para el usuario y funcionar como fallback automático.

## Alcance
- Implementar cliente STUN para descubrir IP:puerto público
- Usar Nakama como canal de señalización para intercambiar endpoints
- Implementar UDP hole punching entre pares
- Mantener keep-alive periódico para mantener el mapeo NAT
- Si hole punching falla (timeout), caer automáticamente en bore
- NO modificar Tailscale ni los flujos existentes
- Integrar en el flujo de retos (ChallengeContext) como método preferente antes de bore

## Restricciones
- No requiere instalación externa ni configuración de router
- Debe funcionar con Node.js puro (sin binarios externos)
- Timeout máximo para hole punching: 5 segundos (antes de caer a bore)
- Compatible con NAT simétrica (fallback a bore si se detecta)
- Señalización via Nakama (canal existente)

## Criterios de Éxito
- [ ] STUN descubre IP:puerto público correctamente
- [ ] Hole punching exitoso en al menos 2 tipos de NAT (conejo completo, conejo restringido)
- [ ] Fallback a bore automático si hole punching falla
- [ ] Keep-alive mantiene conexión > 30s sin actividad
- [ ] 0 regresiones en flujos existentes (Tailscale, LAN, bore)
- [ ] Tests automatizados para componentes aislables
