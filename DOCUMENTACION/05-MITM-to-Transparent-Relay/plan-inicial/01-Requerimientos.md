# 01 - Requerimientos - MITM Relay Node.js (Plan Inicial)

## Problema
- Los servidores MITM públicos de Fightcade están caídos.
- RetroArch eliminó `netplay_mitm_server.c` de su repositorio.
- No se puede compilar el servidor C (sin GCC, sin Qt5 SDK).
- Se necesita un reemplazo para conectar dos instancias de RetroArch sin usar `--host`.

## Objetivo
Implementar un relay MITM en Node.js puro que:
- Reemplace al servidor C `netplay_mitm_server.c`
- Permita que dos RAs se conecten ambos en modo `--connect` (sin `--host`)
- Maneje el handshake netplay completo: header echo, NICK, INFO, SYNC
- Forwardee comandos post-handshake entre ambos peers

## Alcance
- Relay implementado en `relay-server/mitm-relay.js`
- Handler Electron en `client/src/main/index.ts` (`start-mitm-local`/`stop-mitm-local`)
- Botón "TEST MITM LOCAL" en UI
- Usa `retroarch/netplay_mitm.cfg` con `netplay_use_mitm_server = "true"`

## Restricciones
- Sin dependencias externas (solo Node.js net module)
- No modificar flujos blindados (AGENTS.md §14-15)
- Ejecución local en misma PC
