# Especificaciones Técnicas - Emu Latam

**Objetivo:** Launcher estilo Fightcade para jugar KOF '98 online P2P usando RetroArch.
**Frontend:** React + Vite (UI)
**Backend/Desktop:** Electron (Node.js) gestionando procesos hijos.
**Networking:**
- Matchmaking y Señalización: Nakama (local) + PostgreSQL (local port 5433 PC secundaria).
- Túneles: Bore (crea un túnel TCP público sin abrir puertos).
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
