# Log 63 — Fix RA Bootstrap Relay (camino host→guest roto) + Performance GGPO Relay

**Fecha:** 2026-07-26 03:55:00

---

## Problema

El relay `bootstrapGgpoRelay.ts` se usaba tanto para GGPO como para RetroArch en el
flujo Sala Pública (bootstrap). Para GGPO funciona porque ambos lados configuran
`remotePort` apuntando al relay UDP. Para RetroArch, el host RA recibe datos del
guest a través del relay (TCP→UDP a 127.0.0.1:55435) pero responde a la IP origen
del paquete UDP entrante (puerto efímero), NO al `relayPort`. El camino host→guest
nunca funciona con el relay UDP para RA.

Además, `bootstrapGgpoRelay.ts` creaba sockets UDP nuevos por cada mensaje
(one socket per packet), lo cual es ineficiente.

---

## Solución

### 1. RA Bootstrap: reemplazar relay UDP por mecanismo estable existente

**Antes (roto):**
- Host: `launch-game { useRelay: false, isHost: true }` + `bootstrap-ggpo-relay-host`
- Guest: `bootstrap-ggpo-relay-guest` + `launch-game { useRelay: false, directConnectIp }`

**Después (estable):**
- Host: `bootstrap-start-game-relay` (nuevo) + `launch-game { useRelay: true, isHost: true }`
- Guest: `launch-game { useRelay: true, isHost: false, relayIp: boreUrl }`

Esto usa el mismo mecanismo proxy TCP + forwarder + bore que el flujo "Host con bore manual"
(probado y estable con 35 tests).

### 2. Nueva función `startGameBoreTunnel()` en `bootstrap.ts`

- Spawn `bore.exe local 55436 --to bore.pub`
- SIN `taskkill /f /im bore.exe` (no mata el bore de Nakama)
- Cleanup aislado para no interferir con otros procesos bore

### 3. Nuevos IPC handlers

- `bootstrap-start-game-relay` → llama a `startGameBoreTunnel()`
- `bootstrap-stop-game-relay` → llama a `stopGameBoreTunnel()`
- Cleanup registrado en `registerCleanup("bootstrap-game-relay")`

### 4. Performance: sockets UDP persistentes en `bootstrapGgpoRelay.ts`

- Eliminado handler vacío duplicado de `udpRelay.on("message")`
- Reemplazado `dgram.createSocket("udp4")` por mensaje con sockets persistentes
  (`ggpoHostToTargetSocket`, `ggpoGuestToTargetSocket`)
- Limpieza completa de todos los sockets en cleanup

---

## Archivos Modificados

| Archivo | Cambio |
|:--------|:--------|
| `client/src/main/bootstrap.ts` | + `startGameBoreTunnel()` / `stopGameBoreTunnel()` |
| `client/src/main/bootstrapGgpoRelay.ts` | Sockets UDP persistentes, cleanup, handler duplicado eliminado |
| `client/src/main/index.ts` | IPC + cleanup para bootstrap-start-game-relay |
| `client/src/main/services/ipcChannels.ts` | + `BOOTSTRAP_START_GAME_RELAY`, `BOOTSTRAP_STOP_GAME_RELAY` |
| `client/src/context/ChallengeContext.tsx` | RA host: usa game bore + forwarder; RA guest: usa proxy |

---

## Verificación

- `test_stable_flows.js`: 50/51 ✅ (1 fallo preexistente no relacionado)
- `npm run dev`: compilación exitosa, handlers registrados correctamente
- Todos los flujos estables (directo, bore manual) no fueron tocados

---

## Riesgos y Notas

- El flujo GGPO bootstrap sigue usando `bootstrapGgpoRelay.ts` con el relay UDP↔TCP.
  No fue modificado en su lógica central, solo en performance.
- El nuevo game bore NO mata procesos bore existentes (Nakama bore sigue funcionando).
- Limpieza separada: Nakama bore (`handleBootstrapClose`) y game bore (`stopGameBoreTunnel`) son independientes.
