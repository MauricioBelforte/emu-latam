# Código - Reestructuración UI de Conexión

## Archivos Involucrados

### Archivos a Modificar

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `client/src/App.tsx` | 1338 | **Cambio mayor:** Refactorizar completamente sección pre-auth (L793-L971) y post-auth (L1063-L1315) |
| `client/src/components/ui/MethodPicker.tsx` | 124 | Hacer dinámico: recibir `salaType` y `engine`, filtrar métodos |
| `client/src/components/ui/ChallengeModal.tsx` | 268 | Actualizar `METHOD_META`, pasar props al MethodPicker |
| `client/src/context/ChallengeContext.tsx` | 502 | Agregar `salaType` a ChallengeData, ajustar `isBootstrapChallenge` |

### Archivos SIN Cambios (Main Process)

| Archivo | Razón |
|---------|-------|
| `client/src/main/index.ts` | Los IPC handlers se mantienen intactos |
| `client/src/ggpo/context/GgpoContext.tsx` | El toggle y salas GGPO no cambian |
| `client/src/ggpo/components/GgpoToggle.tsx` | Sin cambios |
| `client/src/components/layout/AppShell.tsx` | Sin cambios |
| `client/src/components/layout/Sidebar.tsx` | Sin cambios |
| `p2p-module/*` | Sin cambios |

## Detalle de Cambios por Archivo

### 1. App.tsx — Sección Pre-Autenticación (L793-L971)

**Estado actual:** 3 secciones × 2 botones = 6 botones

**Estado deseado:** 2 secciones × 2 botones = 4 botones

#### Variables de estado a cambiar:

```typescript
// ELIMINAR:
const [isP2pSala, setIsP2pSala] = useState(false);
const [isBootstrapSala, setIsBootstrapSala] = useState(false);
const [showOtherMethods, setShowOtherMethods] = useState(false);

// AGREGAR:
const [salaType, setSalaType] = useState<"tailscale" | "p2p" | null>(null);

// Derivados:
const isP2pSala = salaType === "p2p";       // compatibilidad
const isBootstrapSala = salaType === "p2p"; // unificado
```

#### Botón "CREAR SALA TAILSCALE" (se mantiene igual):
- Ubicación actual: L802-L818
- Lógica: set-nakama localhost → loginGhost → get-tailscale-ip → publishHostInfo → open-firewall-port
- **Cambio:** Agregar `setSalaType("tailscale")`

#### Botón "UNIRSE A SALA TAILSCALE" (se mantiene igual):
- Ubicación actual: L820-L833
- Lógica: setJoinMode("join") → input IP → set-nakama remoto → check health → loginGhost
- **Cambio:** Agregar `setSalaType("tailscale")`

#### Botón "CREAR SALA P2P" (unifica fucsia L841-L856 + verde L929-L953):
- **Nueva lógica:**
  1. `setSalaType("p2p")`
  2. `setJoinMode("create")`
  3. `set-nakama-server` a localhost
  4. `bootstrap-host` → obtener roomCode
  5. `p2p-start-broadcast` → broadcast LAN simultáneo
  6. `loginGhost`
  7. Mostrar código al usuario

#### Botón "UNIRSE A SALA P2P" (unifica fucsia L857-L884 + verde L954-L962):
- **Nueva lógica:**
  1. `setSalaType("p2p")`
  2. Intentar `p2p-discover-host` (4 segundos)
  3. Si encontró → `set-nakama-server` con IP LAN → loginGhost
  4. Si no encontró → `setJoinMode("p2p-code")` → pedir código numérico
  5. Con código → `bootstrap-guest` → set-nakama con bore URL → loginGhost

### 2. App.tsx — Sección Post-Autenticación (L1063-L1315)

**Eliminar:** Toda la sección `Collapsible` con `showOtherMethods` (L1157-L1308)

**Mantener:**
- Info de sala (L1069-L1113 y L1115-L1137) — simplificado con `salaType`
- GgpoToggle (L1141)
- GGPO host/guest views (L1143-L1154)
- Status text y websocket indicator

**Agregar:** Botón pequeño de DEBUG al fondo (reemplaza la sección colapsable)

### 3. MethodPicker.tsx — Dinámico

```typescript
// Cambiar interface:
interface MethodPickerProps {
  targetName: string;
  salaType: "tailscale" | "p2p" | null;  // NUEVO
  engine: "retroarch" | "ggpo";           // NUEVO
  onSelect: (method: string) => void;
  onCancel: () => void;
}

// Cambiar array estático por función:
function getAvailableMethods(salaType, engine) {
  // Ver 03-Diseno.md para la tabla de filtrado
}
```

### 4. ChallengeModal.tsx

- Pasar `salaType` y `engine` al MethodPicker
- Actualizar `METHOD_META` si cambian labels/colores

### 5. ChallengeContext.tsx

- Agregar `salaType` a `ChallengeData`
- En `selectMethod`: determinar `isBootstrapChallenge` automáticamente desde `salaType`
- En `acceptChallenge`: mantener toda la lógica existente pero usar `salaType` del challenge

## Funciones Clave

### `handleCreateSalaP2p()` — NUEVA (combina bootstrap + broadcast)

```typescript
const handleCreateSalaP2p = async () => {
  setSalaType("p2p");
  setJoinMode("create");
  discoveryDoneRef.current = false;
  
  // 1. Nakama localhost
  await electron.ipcRenderer.invoke("set-nakama-server", { host: "127.0.0.1", port: "7350" });
  setNakamaHost("127.0.0.1"); setNakamaPort("7350");
  
  // 2. Bootstrap: bore + paste → código
  setBootstrapLoading(true);
  setBootstrapStatus("Iniciando sala P2P...");
  const result = await electron.ipcRenderer.invoke("bootstrap-host");
  setBootstrapLoading(false);
  
  if (result.success && result.roomCode) {
    setBootstrapRoomCode(result.roomCode);
    setBootstrapBoreUrl(result.boreUrl || "");
    setBootstrapStatus("Sala P2P activa — Compartí el código");
  }
  
  // 3. Broadcast LAN simultáneo
  const lan = await electron.ipcRenderer.invoke("get-lan-ip");
  if (lan.ip) await electron.ipcRenderer.invoke("p2p-start-broadcast", { host: lan.ip, port: "7350" });
  
  // 4. Login
  await loginGhost();
  await electron.ipcRenderer.invoke("open-firewall-port");
};
```

### `handleJoinSalaP2p()` — NUEVA (auto-detecta LAN, fallback a código)

```typescript
const handleJoinSalaP2p = async () => {
  setSalaType("p2p");
  setP2pStatus("🔍 Buscando sala en la red local...");
  
  // 1. Intentar descubrimiento LAN (4 segundos)
  const discovery = await electron.ipcRenderer.invoke("p2p-discover-host");
  
  if (discovery.success) {
    // 2a. Encontró en LAN → conectar directo
    await electron.ipcRenderer.invoke("set-nakama-server", { host: discovery.host, port: discovery.port });
    const ok = await electron.ipcRenderer.invoke("check-nakama-health");
    if (ok) {
      setNakamaHost(discovery.host);
      setNakamaPort(discovery.port);
      setNakamaReady(true);
      setP2pStatus("");
      await loginGhost();
      return;
    }
  }
  
  // 2b. No encontró → pedir código
  setP2pStatus("");
  setJoinMode("p2p-code");  // Muestra input de código numérico
};
```

## Logs Relacionados

Los cambios se documentarán en `Logs/57-Reestructuracion-UI-Conexion_YYYY-MM-DD_HH-MM-SS.md` cuando se implemente.
