# 04 — Código del Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN
> **Estado:** Plan actual (implementado y corregido)

---

## 1. Archivos Involucrados

| Archivo | Descripción |
|:--------|:------------|
| `client/src/main/bootstrap.ts` | Gestión de bore Nakama (7350) + bore game relay (55436) |
| `client/src/main/bootstrapGgpoRelay.ts` | Relay UDP↔TCP para GGPO (segundo bore) |
| `client/src/main/index.ts` | IPC handlers: bootstrap, relay, game relay |
| `client/src/main/services/ipcChannels.ts` | Canales IPC whitelist |
| `client/src/context/ChallengeContext.tsx` | Flujo de retos (aceptar, conectar info, guest ready) |
| `client/src/App.tsx` | UI botón verde "SALA PÚBLICA" |

---

## 2. Cambios Realizados (26-Jul-2026)

### 2.1 Fix RA Bootstrap — Camino host→guest roto

**Problema original:** El relay `bootstrapGgpoRelay.ts` canaliza UDP host GGPO → TCP → bore → TCP guest → UDP guest GGPO. Para GGPO funciona porque ambos lados configuran `remotePort` apuntando al relay. Para RetroArch, el host RA recibe datos del guest (TCP→UDP a 127.0.0.1:55435) pero responde a la IP origen del paquete UDP (puerto efímero), no al `relayPort`. El camino host→guest nunca funciona con el relay UDP.

**Solución:** Reemplazar el relay UDP↔TCP para RA con el mecanismo estable existente (proxy TCP + forwarder + bore), que usa pipes TCP bidireccionales:

| Componente | Antes (roto) | Después (estable) |
|:-----------|:-------------|:------------------|
| Host RA | `launch-game { useRelay: false }` + `bootstrap-ggpo-relay-host` | `bootstrap-start-game-relay` + `launch-game { useRelay: true, isHost: true }` |
| Guest RA | `bootstrap-ggpo-relay-guest` + `launch-game { useRelay: false, directConnectIp }` | `launch-game { useRelay: true, isHost: false, relayIp: boreUrl }` |

### 2.2 Nueva función: `startGameBoreTunnel()` en `bootstrap.ts`

```typescript
// Spawn bore para tráfico de juego (puerto 55436)
// SIN taskkill global (no mata bore de Nakama)
export function startGameBoreTunnel(): Promise<{ success: boolean; url?: string; error?: string }>
export function stopGameBoreTunnel(): void
```

### 2.3 Nuevos IPC handlers

| Canal | Función |
|:------|:--------|
| `bootstrap-start-game-relay` | Inicia bore game relay (55436) |
| `bootstrap-stop-game-relay` | Detiene bore game relay |

### 2.4 Mejoras a `bootstrapGgpoRelay.ts`

- Eliminado handler vacío duplicado de `udpRelay.on("message")`
- Reemplazados sockets UDP temporales (uno por mensaje) por sockets persistentes:
  - `ggpoHostToTargetSocket`: host TCP→UDP (guest→host)
  - `ggpoGuestToTargetSocket`: guest TCP→UDP (host→guest)
- Limpieza completa en `handleBootstrapGgpoRelayCleanup()`

---

## 3. Funciones Clave (estado actual)

### `bootstrap.ts`

| Función | Propósito |
|:--------|:----------|
| `handleBootstrapHost()` | Inicia bore Nakama (7350), genera room code |
| `handleBootstrapGuest(roomCode, lanIp?)` | Configura Nakama guest (bore.pub:port o LAN) |
| `handleBootstrapClose()` | Mata bore Nakama, restaura localhost |
| `startGameBoreTunnel()` | Spawn bore game relay (55436), sin taskkill global |
| `stopGameBoreTunnel()` | Mata bore game relay |

### `bootstrapGgpoRelay.ts`

| Función | Propósito |
|:--------|:----------|
| `handleBootstrapGgpoRelayHost(targetUdpPort)` | Relay UDP↔TCP + bore para GGPO host |
| `handleBootstrapGgpoRelayGuest(fwdPort, boreUrl, targetUdpPort)` | Conexión TCP bore + forwarder UDP guest GGPO |
| `handleBootstrapGgpoRelayCleanup()` | Cleanup completo (bore, TCP server, UDP sockets) |

---

## 4. Flujo de Datos

### Bootstrap RA (Sala Pública + Bore)

```
=== HOST ===
[Guest RA] --connect 127.0.0.1
  → proxy TCP (127.0.0.1:55435 → bore.pub:XXXXX)
    → bore tunnel
      → bore.exe local (127.0.0.1:55436)
        → forwarder TCP (127.0.0.1:55436 → LAN_IP:55435)
          → [Host RA] escucha en 55435

=== GGPO ===
[Host GGPO (6003)] → UDP → relayPort → TCP → bore → bore.pub
                                                          ↓
[Guest GGPO (6004)] ← UDP ← forwarderPort ← TCP ← bore connection
```

### Bootstrap Nakama (matchmaking)

```
Host Nakama (7350) ← bore local 7350 → bore.pub:XXXXX
Guest Nakama → configura remote host = bore.pub:XXXXX
```

---

## 5. Manejo de Errores

| Escenario | Comportamiento |
|:----------|:---------------|
| bore Nakama falla | Error "No se pudo iniciar túnel Nakama" |
| bore game relay falla | Error "Error creando túnel para RA" |
| Guest con código inválido | Error "Código inválido" |
| Relay GGPO falla | Error "Error iniciando relay bootstrap" |
| Conexión Nakama cae (game bore kill) | No afecta — game bore NO mata Nakama bore |
| Cleanup game relay | Solo mata su propio bore, no afecta Nakama |
