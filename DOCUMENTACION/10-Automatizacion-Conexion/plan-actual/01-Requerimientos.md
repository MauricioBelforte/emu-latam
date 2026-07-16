# 01 - Requerimientos - Automatización de Conexión (Plan Inicial)

## Problema
- Actualmente, para conectar dos PCs por Tailscale, el host debe compartir manualmente su IP Tailscale (100.x.x.x) con el guest.
- El guest debe copiar esa IP, ponerla en el campo "IP del servidor", conectar, y luego copiarla de nuevo en el campo "JOIN VÍA TAILSCALE".
- Este proceso manual es propenso a errores (IP mal tipeada, IP desactualizada) y rompe la experiencia "un click".

## Objetivo
Eliminar la necesidad de compartir la IP manualmente. El guest debe poder unirse a la sala del host sin intervención del host, aprovechando que ambos comparten la misma red Tailscale y están conectados al mismo Nakama.

## Alcance
- El host publica automáticamente su IP Tailscale (y cualquier dato necesario para la conexión) al crear la sala.
- El guest, al conectarse a Nakama y seleccionar la sala del host, recibe automáticamente la IP y puede lanzar RetroArch sin escribir nada.
- Compatible con los flujos existentes (Tailscale, directo, bore) — o al menos con Tailscale como primera implementación.
- No rompe los flujos manuales actuales (AGENTS.md §14-15).

## Restricciones
- No reemplazar los flujos blindados existentes (host directo, bore manual).
- Si se implementa vía Storage de Nakama, no requiere matchmaking ni cambios en el servidor Nakama.
- Si se implementa vía Retos, requiere arreglar bugs existentes en ChallengeContext.tsx.
- Si se implementa vía Matchmaking, requiere entender la API de Nakama Matchmaker.
