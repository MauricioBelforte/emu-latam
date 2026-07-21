# Requerimientos: Integración FBNeo + GGPO

## Problema
RetroArch con netplay optimizado funciona para KOF '98 en Emu Latam, pero no es la solución óptima para fighting games. Fightcade utiliza un fork de FBNeo con GGPO integrado que ofrece rollback nativo de menor latencia. No existía un toggle en Emu Latam para elegir entre RetroArch y GGPO como motor de netplay.

## Objetivo
Integrar el binario `fcadefbneo.exe` (fork de fightcade con GGPO) como motor de netplay alternativo, permitiendo al usuario elegir entre RetroArch y GGPO mediante un toggle en la UI.

## Alcance
- Usar el binario `fcadefbneo.exe` directamente desde una copia self-hosted en `client/resources/fcadefbneo/` (sin compilación manual)
- Toggle GGPO/RetroArch en la UI (componente `GgpoToggle`)
- Handler IPC `ggpo-launch` en main process (independiente del handler RetroArch existente)
- Intercambio de IPs/puertos entre peers vía Nakama Storage (cada peer publica su propia sala)
- Soporte para LAN directa y Tailscale
- Sistema de retos (challenges) respeta el toggle GGPO
- Flujo manual de descubrimiento de salas (GgpoGuestView + GgpoHostView)
- Gestión de procesos separada (no interfiere con procesos de RetroArch)

## Fuera de alcance
- Modificar los flujos RetroArch existentes (AGENTS.md §14-15)
- Soporte para Bore (UDP incompatible con túneles TCP de Bore)
- Modo espectador
- Matchmaking automático

## Restricciones
- **UDP only**: `quark:direct` usa UDP. No funcionará sobre túneles TCP como Bore. Solo LAN y Tailscale.
- **Independencia**: El flujo GGPO no comparte procesos, puertos ni limpieza con RetroArch.
- **cwd obligatorio**: `fcadefbneo.exe` requiere `cwd` = su directorio para cargar DLLs.
- **Copia self-hosted**: El binario y ROMs están en `client/resources/fcadefbneo/`, gitignored.

## Criterios de aceptación
1. Usuario puede alternar entre RetroArch y GGPO desde la UI
2. Host puede crear sala GGPO y guest puede unirse (LAN o Tailscale)
3. IPs y puertos se intercambian mediante Nakama Storage (cada peer publica su propia sala)
4. Ambos peers lanzan `fcadefbneo` con args `quark:direct` correctos
5. Sistema de retos lanza GGPO si el toggle está activo
6. TEST LOCAL GGPO funciona (dos ventanas en la misma PC)
7. Cerrar la sala mata `fcadefbneo` sin afectar RetroArch
8. El toggle GGPO se deshabilita si el método es Bore
