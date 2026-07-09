# Especificaciones Técnicas - Emu Latam

**Objetivo:** Launcher estilo Fightcade para jugar KOF '98 online P2P usando RetroArch.
**Frontend:** React + Vite (UI)
**Backend/Desktop:** Electron (Node.js) gestionando procesos hijos.
**Networking:**
- Matchmaking y Señalización: Nakama (local) + PostgreSQL (local port 5433 PC secundaria).
- Túneles: Bore (crea un túnel TCP público sin abrir puertos).
- P2P: Tailscale (WireGuard, baja latencia, sin abrir puertos).
- Emulación: RetroArch (core FBNeo).

## Hallazgo crítico: RetroArch ignora `--port`
- En **modo cliente**: `--port` es ignorado. Siempre conecta al puerto default 55435.
- En **modo host**: `--port` también es ignorado. Siempre escucha en 55435.
- `netplay_port` vía `--appendconfig` también es ignorado.
- **Solución:** TCP proxy en guest (55435 → bore URL) + TCP forwarder en host (55436 → LAN IP:55435).

## Arquitectura de puertos
| Componente | Puerto | Propósito |
|-----------|--------|-----------|
| Host RA | 55435 | Netplay host (default, no se puede cambiar) |
| Guest proxy | 55435 (127.0.0.1) | Forward guest RA → bore.pub |
| Forwarder | 55436 (127.0.0.1) | Forward bore tunnel → host RA (vía LAN IP) |
| bore tunnel | 55436 → bore.pub | Túnel TCP público |
| Transparent Relay | 55436 (Node.js) | Forwarder TCP para test local host→guest |

## Arquitectura Transparent Relay (reemplaza MITM)
- **Host RA** usa `--host --port 55435` (escucha, tiene estado del juego)
- **Relay** es un forwarder TCP: escucha en 55436 → pipe a 127.0.0.1:55435
- **Guest RA** usa `--connect 127.0.0.1 --port 55436`
- **Sin lógica MITM.** El relay solo pipea bytes. RA maneja todo el protocolo.
- **Config:** `netplay_optimized.cfg` (sin `netplay_use_mitm_server`)
- **Handler:** `start-mitm-local` en index.ts (paralelo, no toca flujos blindados)

## Cambios Recientes (Julio 2026)

### INSERT COIN independiente de Nakama
- El botón INSERT COIN ya no se bloquea esperando health check de Nakama.
- `loginGhost()` crea usuario local anónimo si Nakama no responde (fallback).
- Indicador visual "○ NAKAMA OFFLINE" informativo, no bloqueante.

### netplay_optimized.cfg trackeado en git
- Se agregó excepción en `.gitignore` para trackear `retroarch/netplay_optimized.cfg`.
- Config original: `input_latency_frames_range=3`, `check_frames=3`, sin `delay_frames`.

### ✅ Problema Resuelto: Inputs duplicados del guest (Julio 2026)

**Causa raíz:** Bug del rollback de RetroArch 1.19.1 — desfase de 1 frame al re-procesar inputs del guest, interpretando releases como presses adicionales.

**Solución:** Forzar delay puro en netplay:
```ini
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "0"
netplay_check_frames = "0"
```

**Resultado:** El temblequeo desapareció. Jugable cross-PC vía Tailscale.
