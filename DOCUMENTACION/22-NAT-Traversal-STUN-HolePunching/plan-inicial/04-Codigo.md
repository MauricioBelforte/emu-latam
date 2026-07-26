# 04 — Código: NAT Traversal (STUN + Hole Punching)

## Archivos a Crear

| Archivo | Descripción |
|:--------|:------------|
| `client/src/main/natTraversal.ts` | Módulo principal: STUN client, hole punch, keep-alive |
| `client/src/main/services/natTraversal.test.ts` | Tests unitarios del módulo |

## Archivos a Modificar

| Archivo | Cambio |
|:--------|:--------|
| `client/src/main/index.ts` | Registrar 4 IPC handlers `nat-traversal-*` + cleanup |
| `client/src/main/services/ipcChannels.ts` | Agregar 4 canales al whitelist |
| `client/src/context/ChallengeContext.tsx` | Agregar método `"nat"` con fallback a bore |
| `client/src/App.tsx` | (Opcional) Indicador visual del método activo |

## Funciones Clave (planificadas)

### `natTraversal.ts`

```typescript
// Constantes
const STUN_HOST = "stun.l.google.com";
const STUN_PORT = 19302;
const PUNCH_TIMEOUT_MS = 5000;
const KEEPALIVE_INTERVAL_MS = 15000;
const STUN_TIMEOUT_MS = 3000;
const STUN_RETRIES = 1;
const SYMMETRIC_CHECK_COUNT = 2;

// Interfaces
export interface Endpoint {
  publicIp: string;
  publicPort: number;
}

export interface StunResult {
  publicIp: string;
  publicPort: number;
  natType: "unknown" | "symmetric" | "compatible";
}

export interface PunchResult {
  success: boolean;
  localPort: number;
}

// Funciones
export async function discoverEndpoint(
  stunHost?: string,
  stunPort?: number
): Promise<StunResult>

export async function attemptHolePunch(
  localPort: number,
  peerPublicIp: string,
  peerPublicPort: number,
  timeoutMs?: number
): Promise<PunchResult>

export function startKeepAlive(intervalMs?: number): void
export function stopKeepAlive(): void
export function closeAll(): void

// Función interna: enviar STUN binding request y parsear respuesta
function createStunBindingRequest(): Buffer
function parseStunResponse(msg: Buffer): { ip: string; port: number } | null
```

### `index.ts` — IPC Handlers

```typescript
ipcMain.handle("nat-traversal-discover", async () => {
  return discoverEndpoint();
});

ipcMain.handle("nat-traversal-punch", async (_e, { localPort, peerIp, peerPort }) => {
  return attemptHolePunch(localPort, peerIp, peerPort);
});

ipcMain.handle("nat-traversal-keepalive", async (_e, { intervalMs }) => {
  startKeepAlive(intervalMs);
  return { success: true };
});

ipcMain.handle("nat-traversal-stop", async () => {
  closeAll();
  return { success: true };
});

registerCleanup("nat-traversal", () => {
  closeAll();
});
```

### `ChallengeContext.tsx` — Flujo NAT

```typescript
// MÉTODO PRIORITARIO: "nat" se intenta antes de "bore"
// Si el método es "nat":
//   Host: descubre endpoint → envía en connection_info → espera guest_ready → punch → launch
//   Guest: recibe connection_info → descubre endpoint → punch → envía guest_ready → launch
// Si algo falla → fallback automático a bore

// Host (challenge accept):
if (method === "nat") {
  try {
    const ep = await electron.ipcRenderer.invoke("nat-traversal-discover");
    if (ep.natType === "symmetric") {
      console.log("NAT simétrica, fallback a bore");
      return handleBoreMethod();
    }
    // ... enviar conn_info con endpoint, esperar guest_ready, punch, launch
  } catch (e) {
    console.error("NAT traversal falló, fallback a bore:", e);
    return handleBoreMethod();
  }
}

// Guest (connection info):
if (content.useNatTraversal) {
  try {
    const ep = await electron.ipcRenderer.invoke("nat-traversal-discover");
    const punch = await electron.ipcRenderer.invoke("nat-traversal-punch", {
      localPort: targetPort,
      peerIp: content.publicIp,
      peerPort: content.publicPort,
    });
    if (!punch.success) {
      console.log("Hole punch falló, fallback a bore");
      return handleBoreGuestMethod();
    }
    // ... lanzar juego conectando a 127.0.0.1:targetPort
  } catch (e) {
    return handleBoreGuestMethod();
  }
}
```

## Protocolo STUN (RFC 5389)

### Binding Request (client → server)
```
0                   1                   2                   3
0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|0 0|     STUN Message Type     |         Message Length        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Magic Cookie                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
|                     Transaction ID (96 bits)                  |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- Message Type: 0x0001 (Binding Request)
- Magic Cookie: 0x2112A442
- Transaction ID: 12 bytes aleatorios
- Sin atributos adicionales

### Binding Response (server → client)
- Message Type: 0x0101 (Binding Response)
- Contiene atributo MAPPED-ADDRESS (type 0x0001) con IP:puerto público
