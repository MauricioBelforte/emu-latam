# Log 60: Resumen sesión — Testing bootstrap, arreglos, documentación

**Fecha:** 2026-07-25 02:30 UTC-3

## Cambios en código

### `client/src/main/bootstrap.ts`
- Retry automático en startNakamaBore (3 intentos con delays progresivos)
- Test TCP no bloqueante en handleBootstrapGuest (warning en vez de error)
- `handleBootstrapHost` ahora detecta y retorna `lanIp`
- `handleBootstrapGuest` acepta `lanIp` opcional para conectar directo por LAN

### `client/src/main/index.ts`
- IPC bootstrap-guest ahora pasa `lanIp` opcional

### `client/src/lib/nakama.ts`
- Username más único (UUID fragment en vez de random 1-999)
- Retry hasta 5 veces si Nakama responde 409 (username collision)

### `client/src/App.tsx`
- Botón CREAR CONEXIÓN P2P: `disabled={bootstrapLoading}`, loading se mantiene hasta después de loginGhost
- Guest: campo opcional "IP local del host" para modo test local
- Después de bootstrap-guest, llama `set-nakama-server` explícitamente
- IP local visible en ambas secciones de código de sala y en sala activa

### `client/src/components/ui/MethodPicker.tsx`
- Tailscale movido al PRIMER lugar con ⭐ RECOMENDADO

### `client/src/components/ui/ChallengeModal.tsx`
- METHOD_META actualizado: Tailscale primero

## Pruebas realizadas

| Prueba | Resultado |
|:---|:---|
| Tailscale + GGPO desde celular | ✅ Funcional |
| Bootstrap verde WAN (bore.pub) | ❌ bore.pub bloqueado por red celular (host y guest) |
| Bootstrap test local (IP LAN) | ❌ AP isolation del hotspot del teléfono |
| MethodPicker reordenado | ✅ Build compila |

## Documentación actualizada
- `DOCUMENTACION/18-P2P-Propio/plan-actual/05-Checklist.md` — Refleja estado REAL del módulo
- Explicación: p2p-module/ standalone EXISTE completo (29 tests), pero integración Electron parcial
- Tailscale documentado como método recomendado

## Hallazgos
1. El hotspot del teléfono aísla clientes (AP isolation) — imposible test local sin router real
2. bore.pub no es accesible desde la red celular (ni host ni guest)
3. El p2p-module/ tiene TODO el código del P2P propio pero falta probarlo en WAN real
4. Tailscale es actualmente el único método que funciona consistentemente en cualquier red
