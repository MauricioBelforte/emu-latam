# Diseño: Integración FBNeo + GGPO

## Arquitectura general

```
[Renderer - React]                       [Main Process - Electron]
┌────────────────────────────┐           ┌──────────────────────────────────┐
│ GgpoToggle (engine toggle)  │           │  IPC: ggpo-launch               │
│ GgpoHostView (pantalla host)│──IPC──▶  │  - Recibe: GgpoLaunchArgs       │
│ GgpoGuestView (descubrim.)  │           │  - Arma args quark:direct       │
│ GgpoContext (estado global) │           │  - Spawn fcadefbneo.exe (cwd!)  │
└────────────────────────────┘           │  - Track ggpoProcess            │
          │                              └──────────────────────────────────┘
          │                                          │
          ▼                                          ▼
┌──────────────────┐                      ┌──────────────────────┐
│ Nakama Storage   │                      │ fcadefbneo.exe       │
│ (cada peer pub.) │                      │ UDP :6003 / :6004    │
│ key: active_room │                      │ quark:direct,rom,... │
└──────────────────┘                      └──────────────────────┘
```

## Flujo manual (GgpoGuestView)

### Host
```
1. Usuario activa toggle GGPO
2. Hace clic en "HOST GGPO (TAILSCALE)" o "HOST GGPO (LAN)"
3. GgpoContext.startHosting(method, ip):
   a. Publica sala en Nakama Storage: { hostId, hostIp, hostPort: 6003, status: "waiting" }
   b. Inicia polling cada 2s buscando salas con targetHostId == myId
   c. UI cambia a GgpoHostView (muestra IP con click-to-copy)
4. Guest descubre sala, hace clic en "UNIRSE"
5. Guest publica su sala: { status: "joining", targetHostId, hostIp: guestIp }
6. Host detecta guest room via findGuestRoomsForHost()
7. Host lanza fcadefbneo como player 0 con IP del guest
```

### Guest
```
1. GgpoGuestView polla cada 3s: findActiveGgpoRooms(onlineUserIds)
   - Busca salas con status "waiting" en Storage de usuarios online
2. Guest ve lista de salas disponibles, hace clic en una
3. GgpoContext.joinRoom(hostUserId, room):
   a. Obtiene IP propia (get-lan-ip)
   b. Lanza fcadefbneo como player 1 con IP del host
   c. Publica su propia sala: { status: "joining", targetHostId, hostIp }
   d. UI cambia a "GGPO conectado"
```

## Flujo de retos (challenges) con GGPO

```
HOST (retador)                          GUEST (retado)
│                                       │
├─ envía challenge ───────────────────▶ │
│                                       ├─ acceptChallenge()
│                                       │
├─ recibe "accepted"                    │
│  engine === "ggpo"?                   │
│  ├─ detecta IP propia                 │
│  ├─ envía ggpoHostIp ───────────────▶ │
│  │                                    ├─ recibe _conn
│  │  (NO lanza GGPO aún)              │  ├─ detecta IP propia
│  │                                    │  ├─ lanza ggpo-launch (player 1)
│  │                                    │  ├─ envía guest_ready ─────▶
│  │                                    │
│  ├─ recibe guest_ready                │
│  ├─ lanza ggpo-launch (player 0) ────│── (UDP directo)
│  │                                    │
```

## Toggle en UI

### Componente GgpoToggle (nuevo, en `client/src/ggpo/components/`)

```tsx
// Estado global en GgpoContext
const [engine, setEngine] = useState<'retroarch' | 'ggpo'>('retroarch')

// Toggle deshabilitado si el URL de relay contiene bore.pub
<GgpoToggle
  disabled={customRelay?.includes("bore.pub")}
  disabledReason="GGPO no es compatible con el túnel Bore (TCP)"
/>
```

### Layout unificado (App.tsx)
- Mismas 4 secciones (Tailscale, LAN, Bore, Debug) para ambos engines
- Cada sección adapta sus botones según `engine`
- `GgpoGuestView` fuera del Collapsible, visible solo en idle GGPO

## Handler IPC: ggpo-launch

### Canal: `ggpo-launch`

```typescript
interface GgpoLaunchArgs {
  rom: string           // "kof98"
  localPort: number     // 6003 (P1) o 6004 (P2)
  remoteIp: string      // IP del otro peer
  remotePort: number    // Puerto del otro peer
  playerNumber: 0 | 1   // 0 = P1 (host/listener), 1 = P2 (guest/connector)
}
```

Args generados: `quark:direct,{rom},{localPort},{remoteIp},{remotePort},{playerNumber},0 -w`

### Funciones clave en ggpoHandler.ts
- `buildQuarkArgs(args)` — arma array de strings para spawn
- `findFcadefbneo(projectRoot)` — busca en resources/fcadefbneo/ primero
- `spawnFcadefbneo(binary, args)` — spawn con cwd correcto
- `spawnLocalTest(binary)` — dos instancias (host+guest) en misma PC
- `killGgpo()` — mata procesos ggpoProcess y ggpoProcess2

## Almacenamiento en Nakama

### Cada usuario publica su propia sala

```
Collection: "emu_latam_ggpo"
Key: "active_room"
User ID: <userId del publicador>
Value: {
  hostId: string,
  hostIp: string,
  hostPort: number,
  method: "lan" | "tailscale",
  status: "waiting" | "joining" | "playing",
  targetHostId?: string,    // solo en salas "joining" (guest apuntando a host)
  timestamp: number
}
Permission: read=2 (público), write=1 (solo owner)
```

### Funciones en ggpoNet.ts
- `publishGgpoRoom(room)` — escribe en Storage propio
- `fetchGgpoRoom(userId)` — lee Storage de otro usuario
- `deleteGgpoRoom()` — borra Storage propio
- `findActiveGgpoRooms(userIds)` — busca salas con `status: "waiting"`
- `findGuestRoomsForHost(hostId, userIds)` — busca salas con `targetHostId == hostId`

## Challenge integration

### Nuevo tipo de mensaje
```
CHALLENGE_GUEST_READY_MSG_TYPE = "challenge_guest_ready"
Payload: { targetId: hostUserId, guestIp: <ip del guest> }
```

### Providers
```
GgpoProvider debe envolver a ChallengeProvider (main.tsx)
ChallengeContext usa useGgpo() para leer engine
```

### Manejo de errores

| Escenario | Comportamiento |
|-----------|---------------|
| fcadefbneo no encontrado | IPC reject con error, UI muestra "fcadefbneo.exe no encontrado" |
| Guest no aparece en 30s | Timeout en GgpoContext (por implementar timeout explícito) |
| Nakama Storage no accesible | updateGgpoRoom eliminado; cada peer publica su propia sala |
| Challenge con GGPO + Bore | Se cancela con alert: "GGPO no es compatible con el túnel Bore" |
