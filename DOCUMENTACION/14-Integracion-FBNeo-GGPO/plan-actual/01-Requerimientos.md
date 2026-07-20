# Requerimientos: Integración FBNeo + GGPO

## Problema
RetroArch con netplay optimizado funciona bien para KOF '98 en Emu Latam, pero no es la solución óptima para fighting games. Fightcade utiliza un fork de FBNeo con GGPO integrado que ofrece rollback nativo de menor latencia. No existe actualmente un toggle en Emu Latam para elegir entre RetroArch y GGPO como motor de netplay.

## Objetivo
Integrar el binario `fcadefbneo` (fork de fightcade con GGPO) como motor de netplay alternativo en Emu Latam, permitiendo al usuario elegir entre RetroArch y GGPO mediante un toggle en la UI.

## Alcance
- Compilar `fcadefbneo` desde el fork `fightcadeorg/fightcade-fbneo`
- Agregar toggle en la UI (componente MethodPicker) para elegir motor: RetroArch / GGPO
- Crear nuevo IPC handler `launch-game-ggpo` en main process (independiente del handler RetroArch existente)
- Intercambio de IPs/puertos entre peers vía Nakama Storage
- Soporte para LAN directa y Tailscale
- Gestión de procesos separada (no interfiere con procesos de RetroArch)

## Fuera de alcance
- Modificar los flujos RetroArch existentes (AGENTS.md §14-15)
- Soporte para Bore (UDP incompatible con túneles TCP de Bore)
- Modo espectador
- Matchmaking automático (sigue siendo manual como el flujo actual)

## Restricciones
- **Licencia no-comercial**: El binario de FBNeo (fork de fightcade) tiene licencia no-comercial. Emu Latam debe mantenerse como proyecto gratuito y no-comercial.
- **UDP only**: `quark:direct` usa UDP. No funcionará sobre túneles TCP como Bore. Solo LAN y Tailscale.
- **Compilación**: Requiere Visual Studio 2015+, DirectX SDK, Perl, NASM en Windows.
- **Independencia**: El nuevo flujo no debe compartir procesos, puertos ni limpieza con los flujos RetroArch existentes.

## Criterios de aceptación
1. Usuario puede alternar entre RetroArch y GGPO desde la UI antes de crear una sala
2. Host puede crear sala GGPO y guest puede unirse (LAN o Tailscale)
3. IPs y puertos se intercambian automáticamente vía Nakama Storage
4. Ambos peers lanzan `fcadefbneo` con args `quark:direct` correctos
5. Cerrar la sala mata el proceso de `fcadefbneo` sin afectar RetroArch
6. El toggle GGPO se deshabilita automáticamente si el método seleccionado es Bore
