# Código: Integración FBNeo + GGPO (Estado Actual)

## Archivos involucrados

### Nuevos (carpeta `client/src/ggpo/`)

| Archivo | Propósito |
|---------|-----------|
| `main/ggpoHandler.ts` | Handler IPC `ggpo-launch`, `ggpo-kill`, `ggpo-launch-local`. Funciones: `buildQuarkArgs()`, `findFcadefbneo()`, `spawnFcadefbneo()`, `spawnLocalTest()`, `killGgpo()` |
| `lib/ggpoNet.ts` | Helpers Nakama Storage: `publishGgpoRoom()`, `fetchGgpoRoom()`, `deleteGgpoRoom()`, `findActiveGgpoRooms()`, `findGuestRoomsForHost()` |
| `context/GgpoContext.tsx` | Estado global: `GgpoEngine`, `GgpoStatus`, `startHosting()`, `joinRoom()`, `cancelHosting()`, polling de guest/discovery |
| `components/GgpoToggle.tsx` | Toggle visual RetroArch / GGPO |
| `components/GgpoHostView.tsx` | Pantalla de espera del host con IP clickeable |
| `components/GgpoGuestView.tsx` | Descubrimiento automático de salas GGPO |
| `index.ts` | Barrel export |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/main/index.ts` (líneas 931-968) | IPC handlers `ggpo-launch`, `ggpo-kill`, `ggpo-launch-local` registrados + `registerCleanup("ggpo", killGgpo)` |
| `client/src/main/services/ipcChannels.ts` | Whitelist: `GGPO_LAUNCH`, `GGPO_KILL`, `GGPO_LAUNCH_LOCAL`, `GET_LAN_IP`, `GET_TAILSCALE_IP` |
| `client/src/preload/index.ts` | Expone: `ggpoLaunch`, `ggpoKill`, `ggpoLaunchLocal`, `getLanIp` |
| `client/src/App.tsx` | Layout unificado: 4 secciones adaptadas por engine, `GgpoToggle`, `GgpoGuestView`, status views |
| `client/src/context/ChallengeContext.tsx` | Importa `useGgpo()`, nuevo mensaje `CHALLENGE_GUEST_READY_MSG_TYPE`, host espera guest_ready antes de lanzar |
| `client/src/main.tsx` | Reorden de providers: `GgpoProvider` ahora envuelve a `ChallengeProvider` |

### No modificados (protegidos)

| Handler | Motivo |
|---------|--------|
| `launch-game` (index.ts:336) | Flujo estable RetroArch (AGENTS.md §15) |
| `start-relay-tunnel` / `start-relay-tunnel-v2` | Flujo estable Bore |
| `tailscale-host` / `tailscale-guest` | Flujo estable Tailscale RetroArch |
| `save-relay-url` / `get-relay-url` | Flujo estable Relay |

## Funciones clave

### ggpoHandler.ts

```typescript
buildQuarkArgs(args: GgpoLaunchArgs): string[]
// Retorna: ["quark:direct,{rom},{localPort},{remoteIp},{remotePort},{playerNumber},0", "-w"]

findFcadefbneo(projectRoot: string): string | null
// Busca en orden:
//   1. client/resources/fcadefbneo/fcadefbneo.exe
//   2. projectRoot/fcadefbneo/fcadefbneo.exe
//   3. projectRoot/resources/fcadefbneo.exe
//   4. extraResources/fcadefbneo.exe

spawnFcadefbneo(binaryPath, args): ChildProcess
// spawn con cwd = directorio del binario (necesario para DLLs)
// Trackea en variable global ggpoProcess

spawnLocalTest(binaryPath, rom = "kof98"): void
// Lanza dos instancias:
//   P1 (host):   quark:direct,kof98,6003,127.0.0.1,6004,0,0 -w
//   P2 (guest):  quark:direct,kof98,6004,127.0.0.1,6003,1,0 -w

killGgpo(): void
// Mata ggpoProcess y ggpoProcess2
```

### ggpoNet.ts

```typescript
publishGgpoRoom(room: GgpoRoom): Promise<void>
// Escribe en Storage propio: collection="emu_latam_ggpo", key="active_room"
// permission_read=2, permission_write=1

fetchGgpoRoom(userId: string): Promise<GgpoRoom | null>
// Lee Storage de otro usuario por userId

deleteGgpoRoom(): Promise<void>
// Borra Storage propio

findActiveGgpoRooms(onlineUserIds: string[]): Promise<{ userId, room }[]>
// Itera usuarios online, busca salas con status="waiting"

findGuestRoomsForHost(hostUserId: string, onlineUserIds: string[]): Promise<{ userId, room }[]>
// Itera usuarios online (excepto host), busca salas con status="joining" y targetHostId == hostUserId
```

### GgpoContext.tsx

```typescript
// Estado
engine: GgpoEngine          // "retroarch" | "ggpo"
status: GgpoStatus          // "idle" | "hosting" | "waiting_guest" | "joining" | "connected" | "error"
hostRoom: GgpoRoom | null
discoveredRooms: { userId, room }[]

startHosting(method, myIp):
  // Publica sala con status="waiting"
  // Inicia polling cada 2s: findGuestRoomsForHost() buscando guests
  // Cuando guest aparece → ggpo-launch como player 0

joinRoom(hostUserId, room):
  // Lee IP del host desde room
  // get-lan-ip para IP propia
  // ggpo-launch como player 1
  // Publica sala propia con status="joining", targetHostId

cancelHosting:
  // ggpo-kill, deleteGgpoRoom, limpia polling
```

### ChallengeContext.tsx (adiciones)

```typescript
// Nuevo tipo de mensaje
const CHALLENGE_GUEST_READY_MSG_TYPE = "challenge_guest_ready"

// Host (acepta reto, engine === "ggpo"):
//   1. Detecta IP (get-tailscale-ip o get-lan-ip según method)
//   2. Envía ggpoHostIp via sendConnectionInfo
//   3. NO lanza GGPO todavía
//   4. Espera CHALLENGE_GUEST_READY_MSG_TYPE
//   5. Al recibir guest_ready → ggpo-launch como player 0 con guestIp

// Guest (recibe _conn, content.useGgpo):
//   1. Lee ggpoHostIp del mensaje
//   2. Detecta IP propia
//   3. ggpo-launch como player 1 con hostIp
//   4. Envía CHALLENGE_GUEST_READY_MSG_TYPE con guestIp propia
```

## Recursos self-hosted

### `client/resources/fcadefbneo/` (gitignored)

```
fcadefbneo.exe
freetype6.dll
gd.dll
ggponet.dll
jpeg62.dll
libgd2.dll
libiconv2.dll
libpng13.dll
lua51.dll
zlib1.dll
config/
fightcade/
support/
ui/
ROMs/          ← kof98.zip (~40 MB) incluido
avi/
neocdiso/
recordings/
savestates/
screenshots/
```

### cwd requirement
`spawnFcadefbneo` y `spawnLocalTest` setean `cwd` al directorio del binario. Sin esto, el proceso termina con exit code "" (no encuentra DLLs ni config/data).

## Estructura de UI (App.tsx)

```
GgpoToggle
├─ engine === "ggpo" && ggpoStatus !== "idle" → status view
│  ├─ waiting_guest: GgpoHostView
│  ├─ joining: "Conectando..."
│  ├─ connected: "GGPO conectado"
│  └─ error: "Error GGPO" + CANCELAR
└─ idle → ToggleBtn + Collapsible
   ├─ TAILSCALE (turquesa): GGPO→IP+Host / RA→Host+Join
   ├─ LAN (verde): GGPO→IP+Host / RA→Host+Join
   ├─ BORE (azul): GGPO→deshabilitado / RA→Host+Join
   └─ DEBUG (violeta): GGPO→TEST LOCAL / RA→MITM
   + GgpoGuestView (solo GGPO idle, fuera del collapsible)
```

## IPC channels whitelisted

```
ggpo-launch           → lanza fcadefbneo con args
ggpo-kill             → mata procesos GGPO
ggpo-launch-local     → test local (dos instancias)
get-lan-ip            → detecta IP LAN
get-tailscale-ip      → detecta IP Tailscale
```

## Logging

```
[GGPO] Lanzando: <path> quark:direct,kof98,6003,192.168.1.10,6004,0,0 -w
[GGPO] fcadefbneo PID: 12345
[GGPO] fcadefbneo cerrado (código: 0)
[GGPO] Matando fcadefbneo...
[GGPO] === INICIANDO TEST LOCAL GGPO ===
[GGPO] P1 PID: 12345
[GGPO] P2 PID: 12346
```

## Commits principales

| Hash | Descripción |
|------|-------------|
| eb97aea | Módulo 14 creado con handler, net, context, componentes toggle/host/guest |
| d2cd8b9 | Rediseño unificado: 4 secciones adaptadas por engine |
| 8a5933a | Eliminado alert molesto de test local |
| 252786f | Integración toggle GGPO con sistema de retos |
| af848e8 | Fix flujo retos: host espera guest_ready antes de lanzar |
| 46e88d0 | Fix flujo manual: joinRoom publica sala propia, findGuestRoomsForHost |
