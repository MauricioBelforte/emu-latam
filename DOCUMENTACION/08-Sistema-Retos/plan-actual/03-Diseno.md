# 03 - Diseño: Sistema de Retos

## Arquitectura

```
[Sidebar] → click RETAR → ChallengeContext.initiateChallenge()
                                ↓
                      MethodPickerModal (elige método)
                                ↓
                      ChallengeContext.sendChallenge(method)
                                ↓
                      Nakama chat message → [LOBBY]
                                ↓
                      [Guest] recibe mensaje → ChallengeModal
                                ↓
                      Guest click ACEPTAR → Nakama message
                                ↓
                      [Host] recibe aceptación
                                ↓
         ┌─────────────────────────────────┐
         │ Tailscale     │ Bore          │ LAN          │
         │ host:         │ host:         │ host:        │
         │ tailscale-host│ start-relay-  │ launch-game  │
         │               │ tunnel-v2     │ (direct)     │
         │ send IP       │ send bore URL │ send LAN IP  │
         └─────────────────────────────────┘
                                ↓
                      [Guest] recibe datos conexión
                                ↓
                      Guest lanza RA como cliente
```

## Flujo Detallado

### 1. Envío de reto
1. Usuario A hace click en "RETAR" sobre Usuario B
2. Se abre modal "ELEGÍ MÉTODO DE CONEXIÓN" con 3 botones
3. Usuario A elige Tailscale / Bore / LAN
4. Se envía mensaje a Nakama: `{ _type: "challenge", method: "tailscale", challengerId, challengerName, targetId, targetName, timestamp }`

### 2. Recepción de reto
1. Usuario B recibe mensaje de Nakama
2. Se muestra modal "RETO RECIBIDO" con el nombre del retador y el método
3. Usuario B tiene 30s para aceptar o rechazar
4. Si acepta → se envía `{ _type: "challenge_accept", ... }`
5. Si rechaza → se envía `{ _type: "challenge_reject", ... }`

### 3. Conexión (aceptado)
1. Host recibe `challenge_accept`
2. Según el método:
   - **Tailscale**: Llama `tailscale-host` → obtiene IP → envía IP al guest
   - **Bore**: Llama `start-relay-tunnel-v2` (con reintento) → obtiene URL → envía URL al guest
   - **LAN**: Llama `launch-game` como host directo → obtiene LAN IP → envía IP al guest
3. Guest recibe los datos de conexión → lanza RA como cliente

## Estados del Challenge

```
idle → picking_method → sent → received → accepted → (juego)
                                      → rejected → idle (2.5s)
                                      → timeout → idle (3s)
```

## IPC Handlers Utilizados

| Handler | Método | Propósito |
|---------|--------|-----------|
| `tailscale-host` | Tailscale | Inicia RA como host, devuelve IP |
| `tailscale-guest` | Tailscale | Inicia RA como cliente conectando a IP |
| `start-relay-tunnel-v2` | Bore | Crea túnel bore, devuelve URL |
| `launch-game` | Bore/LAN | Inicia RA como host o cliente |
| `kill-retroarch` | Todos | Mata procesos RA previos |
| `save-relay-url` | Bore | Guarda URL en archivo |
