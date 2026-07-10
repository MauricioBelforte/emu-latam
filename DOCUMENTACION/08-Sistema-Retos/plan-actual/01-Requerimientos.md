# 01 - Requerimientos: Sistema de Retos (Challenges)

## Problema
Los jugadores no tienen una forma integrada de enfrentarse entre sí. Actualmente deben coordinar manualmente qué método de conexión usar (Bore, Tailscale, LAN) y compartir IPs/URLs por fuera de la app.

## Objetivos
- Permitir que un jugador **rete a otro** desde la lista de jugadores online
- El retador elige el **método de conexión** al enviar el reto
- El retado recibe una notificación y puede **aceptar o rechazar**
- Al aceptar, ambos se conectan automáticamente sin intervención manual
- Timeout de 30s si el retado no responde

## Alcance
- Integración con Nakama para signaling (envío de mensajes entre pares)
- Soporte para 3 métodos: Tailscale, Bore, LAN directo
- Modal de selección de método al retar
- Modal de notificación al recibir reto
- Auto-lanzamiento de RetroArch con el método seleccionado

## Restricciones
- Nakama debe estar funcionando para el signaling
- Tailscale requiere que ambos tengan Tailscale instalado
- Bore requiere que el host pueda ejecutar bore.exe
- LAN requiere que ambos estén en la misma red
- No modificar los flujos manuales blindados (AGENTS.md §15)
