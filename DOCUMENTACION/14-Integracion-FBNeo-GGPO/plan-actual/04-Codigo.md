# Código: Integración FBNeo + GGPO

## Archivos involucrados

### Nuevos

| Archivo | Propósito |
|---------|-----------|
| `client/src/main/ggpo-handler.ts` | Nuevo IPC handler `launch-game-ggpo`, lógica de spawn, polling, limpieza |
| `client/src/lib/ggpo.ts` | Funciones helper: validación de binario, armado de args, resolución de puertos |
| `client/src/scripts/compile-fbneo.ps1` | Script PowerShell para compilar fcadefbneo desde el fork |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/main/index.ts` | Registrar nuevo handler IPC `launch-game-ggpo` y `kill-gpgo-process` |
| `client/src/main/index.ts` | Incluir `ggpoProcess` en la limpieza global (`app.on('before-quit')`) |
| `client/src/components/ui/MethodPicker.tsx` | Agregar toggle RetroArch / GGPO |
| `client/src/App.tsx` | Nuevo flujo de UI cuando engine === 'ggpo' (botones "CREAR SALA GGPO" / "UNIRSE A SALA GGPO") |
| `client/src/lib/nakama.ts` | Nuevos métodos Storage: `publishGgpoRoom()`, `fetchGgpoRoom()`, `updateGgpoRoom()` |

### No modificados (protegidos)

| Archivo | Motivo |
|---------|--------|
| `client/src/main/index.ts` - handler `launch-game` | Flujo estable RetroArch (AGENTS.md §15) |
| `client/src/main/index.ts` - handler `start-relay-tunnel` | Flujo estable Bore |
| `client/src/main/index.ts` - handler `save-relay-url` / `get-relay-url` | Flujo estable Relay |
| `client/src/context/AuthContext.tsx` | No tocar lógica de auth existente |
| `client/src/context/ChallengeContext.tsx` | No tocar sistema de retos |

## Funciones clave

### `ggpo-handler.ts`
```typescript
// Handler IPC principal
ipcMain.handle('launch-game-ggpo', async (_, request: GgpoLaunchRequest) => {
  // 1. Validar binario fcadefbneo existe en resources
  // 2. Resolver IPs según mode (lan | tailscale)
  // 3. Si es host (playerNumber === 0): publicar en Nakama Storage, iniciar polling
  // 4. Armar comando quark:direct
  // 5. Spawn fcadefbneo como child process
  // 6. Trackear proceso en variable global ggpoProcess
})

ipcMain.handle('kill-ggpo-process', async () => {
  // 1. Matar ggpoProcess si existe
  // 2. Liberar puertos UDP 6003/6004
  // 3. Limpiar Nakama Storage
})
```

### `ggpo.ts`
```typescript
function buildQuarkArgs(
  rom: string,
  localPort: number,
  remoteIp: string,
  remotePort: number,
  playerNumber: 0 | 1
): string[]

function findFcadefbneo(): string
// Busca en: projectRoot/fcadefbneo/fcadefbneo.exe
//          projectRoot/resources/fcadefbneo.exe

function resolveGgpoIp(mode: 'lan' | 'tailscale'): string
// LAN: getLanIp()
// Tailscale: getTailscaleIp() o 100.x.x.x

function findAvailableUdpPort(startPort: number): Promise<number>
// Intentar startPort, startPort+1, startPort+2
```

### `nakama.ts` (adiciones)
```typescript
async publishGgpoRoom(hostIp: string, port: number, method: string): Promise<void>
async fetchGgpoRoom(userId: string): Promise<GgpoRoom | null>
async updateGgpoRoom(guestIp: string, guestPort: number): Promise<void>
async deleteGgpoRoom(): Promise<void>
```

### `MethodPicker.tsx` (modificaciones)
```tsx
// Nuevo estado local
const [engine, setEngine] = useState<'retroarch' | 'ggpo'>('retroarch')

// Render condicional del toggle (solo visible si method no es bore)
{method !== 'bore' && (
  <EngineToggle engine={engine} onChange={setEngine} />
)}
```

## Compilación de fcadefbneo

### Script `compile-fbneo.ps1`
```powershell
# 1. git clone https://github.com/fightcadeorg/fightcade-fbneo
# 2. cd fightcade-fbneo
# 3. games.bat (genera lista de juegos)
# 4. Abrir projectfiles/visualstudio-2015/fbneo_vs2015.sln
# 5. Build: Release, x86, Platform Toolset v140
# 6. Copiar fcadefbneo.exe + DLLs a projectRoot/fcadefbneo/
```

### DLLs necesarias
(Dependencias por determinar — ejecutar `dumpbin /dependents fcadefbneo.exe` post-compilación)

## Logging

### Logs específicos del módulo
```
[GGPO] Launching fcadefbneo: quark:direct,kof98,6003,192.168.1.10,6004,0,0 -w
[GGPO] fcadefbneo PID: 12345
[GGPO] Waiting for guest... (polling Nakama Storage)
[GGPO] Guest connected: 192.168.1.20:6004
[GGPO] Cleaning up - killing PID 12345
```

## Tests asociados

Ver `06-Plan-Testings.md` para el plan completo. Los tests se integrarán en el módulo 09-Testing como suite separada.
