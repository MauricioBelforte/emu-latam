# 03 — Diseño: NAT Traversal (STUN + Hole Punching)

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                          │
│                                                          │
│  ┌─────────────────┐     ┌──────────────────────────┐    │
│  │ natTraversal.ts  │     │   index.ts (IPC handler)  │    │
│  │                  │     │                          │    │
│  │ discoverEndpoint │────>│ nat-traversal-host       │    │
│  │                  │     │ nat-traversal-guest      │    │
│  │ attemptHolePunch │────>│ nat-traversal-keepalive  │    │
│  │                  │     │ nat-traversal-stop       │    │
│  │ keepAlive        │     │                          │    │
│  │ send/recv        │     └──────────────────────────┘    │
│  └────────┬────────┘              │                       │
│           │                       │ IPC                    │
│           │ dgram                 │                       │
│           ▼                       ▼                       │
│    ┌──────────────┐    ┌──────────────────┐               │
│    │ STUN server   │    │ ChallengeContext │               │
│    │ (UDP :19302) │    │ (Renderer)       │               │
│    └──────────────┘    └──────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

## Componentes

### 1. `natTraversal.ts` — Núcleo del módulo

```typescript
// Variables de estado
let stunSocket: dgram.Socket | null = null;
let punchSocket: dgram.Socket | null = null;
let keepAliveInterval: NodeJS.Timeout | null = null;
let peerEndpoint: { ip: string; port: number } | null = null;
let natType: "unknown" | "symmetric" | "compatible" = "unknown";

// Funciones principales
export async function discoverEndpoint(
  stunHost?: string,
  stunPort?: number
): Promise<{ publicIp: string; publicPort: number; natType: string }>

export async function attemptHolePunch(
  localPort: number,
  peerPublicIp: string,
  peerPublicPort: number,
  timeoutMs?: number
): Promise<{ success: boolean; localPort: number }>

export function startKeepAlive(intervalMs?: number): void
export function stopKeepAlive(): void
export function closeAll(): void
```

### 2. IPC Handlers (index.ts)

| Canal | Input | Output |
|-------|-------|--------|
| `nat-traversal-discover` | `{}` | `{ publicIp, publicPort, natType }` |
| `nat-traversal-punch` | `{ localPort, peerIp, peerPort }` | `{ success, localPort }` |
| `nat-traversal-keepalive` | `{ intervalMs }` | `{ success }` |
| `nat-traversal-stop` | `{}` | `{ success }` |

### 3. Integración en ChallengeContext

Nuevo método `"nat"` que se intenta ANTES de bore:

```typescript
// En flujo host (challenge accept):
if (method === "nat") {
  // 1. Descubrir endpoint público via STUN
  const ep = await electron.ipcRenderer.invoke("nat-traversal-discover");
  if (ep.natType === "symmetric") {
    // NAT simétrica → imposible hole punch, caer a bore inmediatamente
    return fallbackToBore();
  }
  // 2. Enviar endpoint al guest via connection_info
  await sendConnectionInfo(content.acceptedBy, {
    useNatTraversal: true,
    publicIp: ep.publicIp,
    publicPort: ep.publicPort,
    localPort: 55435, // o 6003 para GGPO
    hostName: username,
  });
  // 3. Esperar guest_ready con su endpoint, luego punch
}

// En flujo guest (connection info):
if (content.useNatTraversal) {
  const punchResult = await electron.ipcRenderer.invoke("nat-traversal-punch", {
    localPort: content.targetPort, // 55435 o 6004
    peerIp: content.publicIp,
    peerPort: content.publicPort,
  });
  // Enviar mi endpoint al host
  // Si success → lanzar juego conectando a 127.0.0.1:localPort
  // Si !success → fallback a bore
}
```

## Flujo Completo

```
Host:                         Guest:
  │                             │
  ├─ STUN discover ──► stun    │
  │◄─ ip:puerto ──────────┘    │
  │                             ├─ STUN discover ──► stun
  │                             │◄─ ip:puerto ──────────┘
  │                             │
  │──── Nakama challenge ──────►│
  │◄──── ACCEPT ───────────────│
  │                             │
  │──── conn_info (mi ep)──────►│
  │                             ├─ hole punch ──► host:puerto
  │◄── guest_ready (su ep)─────│
  │                             │
  ├─ hole punch ──► guest:puerto│
  │                             │
  │◄─── P2P establecido ───────►│
  │      (UDP directo)          │
  │                             │
  ├─ start keepalive (15s)      │
  │                             ├─ start keepalive (15s)
  │                             │
  │──── launch RetroArch/GGPO ──│
```

## Manejo de Fallos

| Escenario | Acción |
|-----------|--------|
| NAT simétrica detectada | Saltar hole punch, ir directo a bore |
| Hole punch timeout (5s) | Caer a bore (segundo bore o relay existente) |
| STUN timeout (3s) | Reintentar 1 vez, si falla → bore |
| Keep-alive recibe error | Reintentar hole punch 1 vez, si falla → desconectar |
| Guest no responde | Timeout general → cancelar con mensaje |

## Puertos

| Componente | Puerto | Protocolo |
|-----------|--------|-----------|
| STUN client | Puerto efímero (bind 0) | UDP |
| Hole punch (RA) | 55435 | UDP |
| Hole punch (GGPO) | 6003 (host) / 6004 (guest) | UDP |
| Keep-alive | Mismo que hole punch | UDP |
