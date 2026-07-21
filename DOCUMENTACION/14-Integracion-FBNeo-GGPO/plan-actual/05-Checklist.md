# Checklist: Integración FBNeo + GGPO (Estado Actual)

## Fase 1: Binario y recursos
- [x] Copiar `fcadefbneo.exe` desde instalación de Fightcade a `client/resources/fcadefbneo/`
- [x] Copiar DLLs necesarias (freetype6.dll, gd.dll, ggponet.dll, jpeg62.dll, libgd2.dll, libiconv2.dll, libpng13.dll, lua51.dll, zlib1.dll)
- [x] Copiar config/, support/, ui/, ROMs/
- [x] Verificar que `cwd` = directorio del binario permite cargar DLLs
- [x] Agregar `client/resources/fcadefbneo/` a `.gitignore`
- [x] Probar `quark:direct` manual local: dos ventanas funcionales
- [x] Eliminar carpeta vacía `fcadefbneo/` en raíz del proyecto

## Fase 2: Backend (Main Process)
- [x] Crear `client/src/ggpo/main/ggpoHandler.ts` con `buildQuarkArgs()`, `findFcadefbneo()`, `spawnFcadefbneo()`, `spawnLocalTest()`, `killGgpo()`
- [x] Registrar handler `ggpo-launch` en `index.ts` (línea 931)
- [x] Registrar handler `ggpo-kill` en `index.ts` (línea 945)
- [x] Registrar handler `ggpo-launch-local` en `index.ts` (línea 950)
- [x] Registrar handler `get-lan-ip` en `index.ts` (línea 646)
- [x] Registrar handler `get-tailscale-ip` en `index.ts` (línea 642)
- [x] Whitelist en `ipcChannels.ts`: `GGPO_LAUNCH`, `GGPO_KILL`, `GGPO_LAUNCH_LOCAL`, `GET_LAN_IP`, `GET_TAILSCALE_IP`
- [x] Preload expone: `ggpoLaunch`, `ggpoKill`, `ggpoLaunchLocal`, `getLanIp`
- [x] `registerCleanup("ggpo", killGgpo)` en `index.ts`

## Fase 3: Nakama Storage
- [x] Crear `client/src/ggpo/lib/ggpoNet.ts`
- [x] `publishGgpoRoom()` — publica sala en Storage propio
- [x] `fetchGgpoRoom()` — lee sala de otro usuario
- [x] `deleteGgpoRoom()` — borra sala propia
- [x] `findActiveGgpoRooms()` — descubre salas `status: "waiting"`
- [x] `findGuestRoomsForHost()` — descubre guests apuntando al host
- [x] Diseño: cada peer publica su propia sala (no se actualiza sala ajena)

## Fase 4: Contexto y Estado
- [x] Crear `client/src/ggpo/context/GgpoContext.tsx`
- [x] Tipos: `GgpoEngine`, `GgpoStatus`
- [x] `startHosting(method, myIp)`: publica sala, polling cada 2s para detectar guest
- [x] `joinRoom(hostUserId, room)`: lanza GGPO como guest, publica sala propia con targetHostId
- [x] `cancelHosting()`: ggpo-kill, deleteGgpoRoom, limpia polling
- [x] Auto-descubrimiento de salas (polling cada 3s, filtrado por onlineUsers)
- [x] `onlineUsersRef` para evitar closures stale en intervalos

## Fase 5: UI (Renderer)
- [x] Crear `GgpoToggle.tsx` — toggle RetroArch / GGPO
- [x] Crear `GgpoHostView.tsx` — pantalla de espera con IP clickeable
- [x] Crear `GgpoGuestView.tsx` — descubrimiento automático de salas
- [x] Layout unificado en `App.tsx`: 4 secciones (Tailscale, LAN, Bore, Debug) adaptadas por engine
- [x] Bore deshabilitado en modo GGPO con mensaje explicativo
- [x] TEST LOCAL GGPO en sección Debug (sin alert)
- [x] Status views: waiting_guest → GgpoHostView, joining/connected/error → textos

## Fase 6: Integración con Retos
- [x] Reordenar providers en `main.tsx`: GgpoProvider → ChallengeProvider
- [x] ChallengeContext importa `useGgpo()` para leer `engine`
- [x] Host: si `engine === "ggpo"`, detecta IP, envía ggpoHostIp, espera guest_ready
- [x] Host: al recibir `CHALLENGE_GUEST_READY`, lanza ggpo-launch como player 0
- [x] Guest: al recibir `_conn` con `useGgpo`, detecta IP, lanza ggpo-launch como player 1
- [x] Guest: envía `CHALLENGE_GUEST_READY_MSG_TYPE` con guestIp
- [x] Bore rechazado explícitamente en GGPO (alert + cancel)

## Fase 7: Testing
- [x] Build exitoso (`npm run build`)
- [x] TEST LOCAL GGPO funcional (dos ventanas fcadefbneo en misma PC)
- [x] Test retos: Host y guest conectan vía Tailscale (verificado con segunda PC)
- [x] Test manual: GgpoGuestView descubre salas y guest se une
- [x] Sin regresiones en flujos RetroArch existentes (directo, bore, tailscale)
- [ ] Tests automatizados para findGuestRoomsForHost y joinRoom
- [ ] Timeout explícito si guest no aparece en 30s

## Fase 8: Documentación
- [x] 7 archivos en `plan-inicial/` (creados al inicio del módulo)
- [x] 7 archivos en `plan-actual/` (actualizados con estado real)
- [x] `DOCUMENTACION/README.md` actualizado con entrada del módulo 14
- [x] `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` actualizado
- [x] Logs creados (#44 integración, #45 documentación)
- [x] AGENTS.md §10 actualizado con reglas de chat entre modelos

## Pendientes
- [ ] Tests automatizados para findGuestRoomsForHost y joinRoom
- [ ] Timeout explícito si guest no aparece en 30s en GgpoContext
- [ ] Soporte para roms seleccionables (actualmente hardcodeado "kof98")
