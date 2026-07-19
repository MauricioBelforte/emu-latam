# 04 - Código: Sistema de Retos

## Archivos Involucrados

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `client/src/context/ChallengeContext.tsx` | 263 | Provider con lógica completa: estados, signaling Nakama, flujo host y guest |
| `client/src/components/ui/ChallengeModal.tsx` | 266 | Modal visual para todos los estados del reto |
| `client/src/components/ui/MethodPicker.tsx` | 122 | Modal con 3 botones para elegir método de conexión |
| `client/src/components/layout/Sidebar.tsx` | 178 | Botón "⚔️ RETAR" al clickear un jugador (líneas 164-171) |
| `client/src/App.tsx` | — | Renderiza `<ChallengeModal />` (línea 627) |
| `client/src/main.tsx` | — | Envuelve la app con `<ChallengeProvider>` (líneas 8-16) |

## Estructura del ChallengeContext (ChallengeContext.tsx)

### Tipos

```typescript
type ChallengeStatus = "idle" | "picking_method" | "sent" | "received" | "accepted" | "rejected" | "timeout";

interface ChallengeData {
  challengerId: string;
  challengerName: string;
  targetId: string;
  targetName: string;
  timestamp: number;
  method?: "tailscale" | "bore" | "lan";
}
```

### Funciones Clave

| Función | Rol |
|---------|-----|
| `initiateChallenge(targetId, targetName)` | Abre el MethodPicker (cambia a `picking_method`) |
| `cancelMethodPicker()` | Vuelve a `idle` sin enviar nada |
| `selectMethod(method)` | Envía el reto via Nakama, pasa a `sent`, inicia timeout 30s |
| `sendChallenge(targetId, targetName, method)` | Envía reto directo sin MethodPicker |
| `cancelChallenge()` | Envía `challenge_cancel` y resetea |
| `acceptChallenge()` | Acepta reto, pasa a `accepted`, envía `challenge_accept` |
| `rejectChallenge()` | Rechaza reto, pasa a `rejected`, auto-resetea tras 2.5s |
| `sendConnectionInfo(targetId, data)` | Envía datos de conexión al guest (`challenge_accept_conn`) |
| `resetChallenge()` | Vuelve todo a `idle` |

### Flujo Host (cuando el retador recibe `challenge_accept`)

```
recibe challenge_accept
  → kill-retroarch
  → según method:
      tailscale: invoke("tailscale-host") → sendConnectionInfo({ tailscaleIp })
      bore:      invoke("start-relay-tunnel-v2") x3 intentos → save-relay-url → launch-game({ isHost: true, useRelay: true }) → sendConnectionInfo({ boreUrl })
      lan:       invoke("launch-game", { isHost: true, useRelay: false }) → sendConnectionInfo({ lanIp })
  → resetChallenge() a los 5s
```

### Flujo Guest (cuando recibe `challenge_accept_conn`)

```
recibe challenge_accept_conn
  → según method:
      tailscale: invoke("tailscale-guest", { hostIp })
      bore:      save-relay-url → launch-game({ isHost: false, useRelay: true, relayIp })
      lan:       launch-game({ isHost: false, useRelay: false, directConnectIp })
  → resetChallenge() a los 5s
```

### Mensajes Nakama (chat en lobby)

| Tipo | Contenido | Emisor → Receptor |
|------|-----------|-------------------|
| `challenge` | `{ method, challengerId, challengerName, targetId, targetName, timestamp }` | Retador → Retado |
| `challenge_accept` | `{ targetId, acceptedBy, acceptedByName }` | Retado → Retador |
| `challenge_reject` | `{ targetId }` | Retado → Retador |
| `challenge_cancel` | `{ targetId }` | Retador → Retado |
| `challenge_accept_conn` | `{ targetId, tailscaleIp / boreUrl / lanIp, hostName }` | Retador → Retado |

### IPC Handlers Utilizados

| Handler | Método | Propósito |
|---------|--------|-----------|
| `kill-retroarch` | Todos | Mata procesos RA previos |
| `tailscale-host` | Tailscale | Inicia RA como host, devuelve IP |
| `tailscale-guest` | Tailscale | Inicia RA como cliente conectando a IP |
| `start-relay-tunnel-v2` | Bore | Crea túnel bore con reintento (3 intentos) |
| `save-relay-url` | Bore | Guarda URL del relay en archivo |
| `launch-game` | Bore/LAN | Inicia RA como host o cliente |

## Estados del Challenge

```
idle → picking_method → sent → received → accepted → (juego, reset 5s)
                          ↘ (timeout 30s) → idle (3s)
                                    → rejected → idle (2.5s)
```

## MethodPicker (MethodPicker.tsx)

Modal con 3 métodos:

| Método | Label | Color | Descripción |
|--------|-------|-------|-------------|
| `tailscale` | TAILSCALE (P2P) | `#0af` | Conexión directa, ambos necesitan Tailscale |
| `bore` | BORE (TÚNEL) | `#00f3ff` | Túnel por internet, sin configuración |
| `lan` | LAN DIRECTO | `#0f0` | Solo funciona en la misma red local |

## ChallengeModal (ChallengeModal.tsx)

6 vistas renderizadas según `challengeStatus`:

| Estado | Elementos visuales |
|--------|-------------------|
| `picking_method` | Renderiza `<MethodPicker />` |
| `received` | ⚔️ "RETO RECIBIDO!" + nombre + método + ACEPTAR / RECHAZAR + timer bar |
| `sent` | 🕐 "ESPERANDO RESPUESTA..." + nombre + método + CANCELAR + timer bar |
| `accepted` | 🔥 "PELEA!" + "CARGANDO KOF '98..." + botón cerrar |
| `rejected` | 🚫 "RETO RECHAZADO" + botón cerrar |
| `timeout` | ⏰ "TIEMPO AGOTADO" + botón cerrar |
