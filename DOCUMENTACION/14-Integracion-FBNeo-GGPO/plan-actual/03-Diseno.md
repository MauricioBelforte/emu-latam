# Diseño: Integración FBNeo + GGPO

## Arquitectura general

```
[Renderer - React]                    [Main Process - Electron]
┌─────────────────────┐              ┌─────────────────────────────┐
│  MethodPicker        │              │  IPC: launch-game-ggpo      │
│  (toggle RA/GGPO)    │──IPC──────▶ │  - Recibe: mode, peerInfo   │
│                      │              │  - Arma args quark:direct   │
│  GameView            │              │  - Spawn fcadefbneo.exe     │
│  (estado conexión)   │              │  - Track proceso GGPO      │
└─────────────────────┘              └─────────────────────────────┘
                                              │
       ┌──────────────────────────────────────┼──────────────────────┐
       │                                      │                      │
       ▼                                      ▼                      ▼
┌──────────────┐                    ┌──────────────────┐  ┌──────────────────┐
│ Nakama       │                    │ fcadefbneo.exe    │  │ Gestión de       │
│ Storage      │                    │ (proceso hijo)    │  │ limpieza         │
│ (intercambio │                    │ UDP :6003 / :6004 │  │ kill GGPO +      │
│  IP:puerto)  │                    └──────────────────┘  │ cleanup puertos  │
└──────────────┘                                         └──────────────────┘
```

## Flujo de conexión (GGPO)

### Host (P1)

```
1. Usuario selecciona GGPO en toggle
2. Usuario selecciona método (LAN / Tailscale)
3. Usuario hace clic en "CREAR SALA GGPO"
4. UI envía IPC 'launch-game-ggpo' con:
   - rom: "kof98"
   - localPort: 6003
   - playerNumber: 0 (P1)
   - mode: "lan" | "tailscale"
5. Main process publica en Nakama Storage:
   - Key: "emu_latam_ggpo_room"
   - Value: { hostIp, port: 6003, method }
6. Main process spawns:
   fcadefbneo quark:direct,kof98,6003,<pendiente>,<pendiente>,0,0 -w
   (remote_ip y remote_port se completan cuando guest se une)
7. UI muestra "ESPERANDO OPONENTE..."
```

### Guest (P2)

```
1. Usuario selecciona GGPO en toggle
2. Usuario ve sala GGPO disponible (detectada por el cambio en Storage)
3. Usuario hace clic en "UNIRSE A SALA GGPO"
4. UI envía IPC 'launch-game-ggpo' con:
   - rom: "kof98"
   - localPort: 6004
   - playerNumber: 1 (P2)
   - hostIp: (obtenido de Nakama Storage)
   - hostPort: 6003
5. Main process publica en Nakama Storage (actualiza el registro existente):
   - Value actualizado: { ..., guestIp, guestPort: 6004 }
6. Main process spawns:
   fcadefbneo quark:direct,kof98,6004,<hostIp>,6003,1,0 -w
7. El host detecta el cambio en Storage (polling cada 2s) y actualiza sus args:
   - Actualiza remote_ip y remote_port con los datos del guest
   - (Opcional: reinicia fcadefbneo con los args completos)
```

## Toggle en UI

### Componente MethodPicker (modificado)

```tsx
// Nuevo estado
const [engine, setEngine] = useState<'retroarch' | 'ggpo'>('retroarch')

// El toggle se deshabilita si el método es Bore
<EngineToggle
  value={engine}
  onChange={setEngine}
  disabled={selectedMethod === 'bore'}
  tooltip={selectedMethod === 'bore'
    ? 'GGPO no compatible con Bore (usa UDP)'
    : 'Elegir motor de netplay'}
/>
```

## Nuevo IPC handler

### Canal: `launch-game-ggpo`

```typescript
interface GgpoLaunchRequest {
  rom: string           // "kof98"
  localPort: number     // 6003 (P1) o 6004 (P2)
  remoteIp?: string     // IP del otro peer (undefined en host inicial)
  remotePort?: number   // Puerto del otro peer (undefined en host inicial)
  playerNumber: 0 | 1   // 0 = P1 (host), 1 = P2 (guest)
  mode: 'lan' | 'tailscale'
}
```

### Funciones auxiliares compartidas (reutilizadas de flujos existentes)
- `getLanIp()` — obtener IP LAN
- `waitForPort()` — esperar a que un puerto esté disponible
- `getProjectRoot()` — ruta base del proyecto

### Funciones nuevas (solo para flujo GGPO)
- `spawnFcadefbneo(args)` — lanza el proceso hijo
- `pollHostStorage()` — poll cada 2s a Nakama Storage esperando datos del guest
- `publishGgpoHostInfo()` / `fetchGgpoHostInfo()` — store helpers en Nakama
- `killGgpoProcess()` — mata fcadefbneo y libera puertos

## Gestión de procesos

### Procesos tracked (separados de RetroArch)
```typescript
let ggpoProcess: ChildProcess | null = null
const GGPO_PORTS = [6003, 6004]
```

### Limpieza
- `kill-gpgo-process` IPC handler: mata `fcadefbneo.exe` y libera los puertos UDP
- Se integra con el botón "CERRAR SALA" y con `app.on('before-quit')`
- **No toca** `retroarchProcess`, `proxyServers[]`, `forwarderServers[]` ni `boreProcess`

## Almacenamiento en Nakama

### Storage keys
```
Key: "emu_latam_ggpo_rooms/active_host"
Value: {
  hostId: string,
  hostIp: string,
  hostPort: number,     // default 6003
  guestPort: number,    // default 6004
  method: 'lan' | 'tailscale',
  status: 'waiting' | 'ready' | 'playing',
  guestId?: string,
  guestIp?: string,
  timestamp: number
}
```

### Lectura por guest
- Guest itera `onlineUsers` (desde SocialContext) y lee Storage de cada usuario online
- Busca aquellos con status `waiting` y method compatible

## Manejo de errores

| Escenario | Comportamiento |
|-----------|---------------|
| fcadefbneo no encontrado | IPC reject con error, UI muestra "Binario GGPO no encontrado. ¿Compilaste fcadefbneo?" |
| Puerto ocupado | Intentar puerto+1 hasta 3 intentos, si falla mostrar error |
| Guest no aparece en 30s | Timeout, host cancela sala, UI muestra "Tiempo de espera agotado" |
| Guest se desconecta | Host detecta por polling, cierra sala, UI muestra "Oponente desconectado" |
| Nakama caído | No se puede usar GGPO (depende de Storage para intercambio de IPs) |
