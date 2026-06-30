# Especificaciones Técnicas - Emu Latam

**Objetivo:** Launcher estilo Fightcade para jugar KOF '98 online P2P usando RetroArch.
**Frontend:** React + Vite (UI)
**Backend/Desktop:** Electron (Node.js) gestionando procesos hijos.
**Networking:** 
- Matchmaking y Señalización: Nakama (local) + PostgreSQL (local port 5433 PC secundaria).
- Túneles: Bore (crea un túnel tcp público sin abrir puertos).
- Emulación: RetroArch (core FBNeo).