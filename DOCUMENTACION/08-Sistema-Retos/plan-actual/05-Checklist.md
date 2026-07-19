# 05 - Checklist: Sistema de Retos

## Estado Actual — COMPLETADO

- [x] **Documentación del componente creada** (7 archivos en plan-inicial y plan-actual)
- [x] **Componente MethodPicker creado** (`client/src/components/ui/MethodPicker.tsx`)
- [x] **ChallengeContext implementado**:
  - [x] Estado `picking_method`
  - [x] Función `initiateChallenge(targetId, targetName)`
  - [x] Función `selectMethod(method)`
  - [x] Función `cancelMethodPicker()`
  - [x] ChallengeData incluye campo `method`
  - [x] Flujo Tailscale en event listener (host + guest)
  - [x] Flujo LAN en event listener (host + guest)
  - [x] Flujo Bore con reintento (3 intentos)
  - [x] Timeout de 30s con auto-reset
  - [x] Manejo de `challenge_accept_conn` para datos de conexión
- [x] **ChallengeModal actualizado**:
  - [x] Vista `picking_method` (renderiza MethodPicker)
  - [x] Vista `received` con método, ACEPTAR/RECHAZAR y timer bar
  - [x] Vista `sent` con CANCELAR y timer bar
  - [x] Vista `accepted` con "CARGANDO KOF '98..."
  - [x] Vista `rejected` con mensaje
  - [x] Vista `timeout` con mensaje
- [x] **Sidebar actualizado**: Botón "⚔️ RETAR" al seleccionar jugador, deshabilitado si hay reto en curso
- [x] **App.tsx**: Renderiza `<ChallengeModal />`
- [x] **main.tsx**: Envuelve app con `<ChallengeProvider>`
- [x] **Mensajes Nakama implementados**: challenge, challenge_accept, challenge_reject, challenge_cancel, challenge_accept_conn
- [x] **IPC handlers integrados**: kill-retroarch, tailscale-host, tailscale-guest, start-relay-tunnel-v2, save-relay-url, launch-game
- [x] **npm run dev**: Sin errores
- [x] **Log generado** en Logs/
