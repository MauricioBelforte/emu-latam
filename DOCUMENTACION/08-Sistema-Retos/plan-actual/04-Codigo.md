# 04 - Código: Sistema de Retos

## Archivos Involucrados

| Archivo | Rol |
|---------|-----|
| `client/src/context/ChallengeContext.tsx` | Lógica del challenge (signaling, estados, flujo de conexión) |
| `client/src/components/ui/ChallengeModal.tsx` | Modal visual para estados del challenge |
| `client/src/components/layout/Sidebar.tsx` | Botón "RETAR" por jugador |
| `client/src/components/ui/MethodPicker.tsx` | **NUEVO** - Modal para elegir método al retar |
| `client/src/main/index.ts` | IPC handlers (`tailscale-host`, `start-relay-tunnel-v2`, `launch-game`, `kill-retroarch`) |
| `client/src/App.tsx` | Renderiza ChallengeModal |
| `client/src/context/SocialContext.tsx` | Lista de usuarios online |

## Funciones Clave (ChallengeContext.tsx)

### `initiateChallenge(targetId, targetName)`
- Cambia estado a `picking_method`
- Almacena target en `pendingTarget`
- El modal MethodPicker se encarga del resto

### `selectMethod(method)`
- Crea ChallengeData con `method` incluido
- Envía mensaje via Nakama
- Cambia estado a `sent`

### Event Listener (global)
- Escucha `nakama_message` events
- Filtra por `_type` y `targetId`
- Maneja: challenge, challenge_accept, challenge_reject, challenge_cancel, challenge_accept_tailscale_ip, challenge_accept_bore_url, challenge_accept_lan_ip

## Mensajes Nakama

| Tipo | Contenido | Emisor | Receptor |
|------|-----------|--------|----------|
| `challenge` | `{ method, challengerId, challengerName, targetId, targetName }` | Retador | Retado |
| `challenge_accept` | `{ targetId, acceptedBy, acceptedByName }` | Retado | Retador |
| `challenge_reject` | `{ targetId }` | Retado | Retador |
| `challenge_cancel` | `{ targetId }` | Retador | Retado |
| `challenge_accept_tailscale_ip` | `{ targetId, tailscaleIp, challengerName }` | Retador | Retado |
| `challenge_accept_bore_url` | `{ targetId, boreUrl, challengerName }` | Retador | Retado |
| `challenge_accept_lan_ip` | `{ targetId, lanIp, challengerName }` | Retador | Retado |
