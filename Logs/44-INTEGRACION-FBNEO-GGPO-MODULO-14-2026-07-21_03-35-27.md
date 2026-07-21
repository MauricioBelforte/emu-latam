# Log de Cambios - Integración FBNeo-GGPO (Módulo 14)

**Fecha:** 2026-07-21 03:35:27
**Número:** 44
**Descripción:** Integración completa de FBNeo con GGPO (fightcade-fbneo) como backend alternativo a RetroArch

## Cambios Realizados

### 1. Handler IPC (Main Process) — `client/src/ggpo/main/ggpoHandler.ts`
- `findFcadefbneo()` busca en `client/resources/fcadefbneo/` (self-hosted, evita hardcodear ruta Fightcade)
- `spawnFcadefbneo()` lanza con `cwd` = directorio del binario para que DLLs se carguen
- `spawnLocalTest()` lanza dos instancias (host:6003, guest:6004) para test local
- `killGgpo()` / `getGgpoProcess()` para gestión del ciclo de vida

### 2. Red GGPO — `client/src/ggpo/lib/ggpoNet.ts`
- `publishGgpoRoom()` guarda sala en Nakama Storage con IP + puerto + timestamp
- `fetchGgpoRooms()` descubre salas activas de otros usuarios
- `deleteGgpoRoom()` limpia al cancelar

### 3. Contexto — `client/src/ggpo/context/GgpoContext.tsx`
- Máquina de estados: idle → waiting_guest → connected | joining → connected | error
- Polling de salas cada 3s para guest
- Auto-refresh IP (Tailscale > LAN) cada 30s

### 4. UI — `client/src/App.tsx`
- `GgpoToggle` para switchear entre RetroArch y GGPO
- **Estructura unificada:** mismas 4 secciones para ambos engines
  - Tailscale (turquesa): en GGPO muestra IP + HOST GGPO (TAILSCALE)
  - LAN (verde): en GGPO muestra IP + HOST GGPO (LAN)
  - Bore (azul): en GGPO muestra mensaje deshabilitado (UDP ≠ TCP)
  - Debug (violeta): en GGPO muestra TEST LOCAL GGPO
- `GgpoGuestView` fuera del Collapsible, visible solo en idle GGPO
- Cuando partida GGPO en curso: muestra estado (waiting_guest, joining, connected, error)
- Se eliminó el alert molesto "GGPO local iniciado. Revisá las ventanas"

### 5. Archivos Auxiliares
- `client/src/main/services/ipcChannels.ts` — whitelist: ggpo-launch, ggpo-kill, ggpo-launch-local, get-lan-ip
- `client/src/preload/index.ts` — expone ggpoLaunch, ggpoKill, ggpoLaunchLocal, getLanIp
- `client/resources/fcadefbneo/` — self-hosted fbneo runtime (exe, DLLs, ROMs) — gitignored

## Archivos Creados
- `client/src/ggpo/index.ts` — barrel
- `client/src/ggpo/main/ggpoHandler.ts` — handler IPC
- `client/src/ggpo/lib/ggpoNet.ts` — red Nakama Storage
- `client/src/ggpo/context/GgpoContext.tsx` — contexto React
- `client/src/ggpo/components/GgpoToggle.tsx` — toggle engine
- `client/src/ggpo/components/GgpoHostView.tsx` — pantalla host
- `client/src/ggpo/components/GgpoGuestView.tsx` — descubrimiento salas

## Archivos Modificados
- `client/src/App.tsx` — rediseño unificado GGPO/RetroArch, +185 LOC
- `client/src/main/index.ts` — IPC handlers registrados
- `client/src/main/services/ipcChannels.ts` — whitelist actualizada
- `client/src/preload/index.ts` — API expuesta al renderer
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` — tareas completadas
- `Logs/44-...` — este archivo
- `Logs/ULTIMO_NUMERO.txt` — actualizado a 44

## Archivos Eliminados
- `fcadefbneo/` (carpeta vacía en raíz del proyecto)

## Próximos Pasos
- Probar HOST GGPO por Tailscale con segunda PC
- Integrar sistema de retos (challenges) para lanzar GGPO en vez de RetroArch

## Commits Asociados
- eb97aea — "Se agregó el módulo 14 de integración FBNeo-GGPO al proyecto"
- d2cd8b9 — "Se rediseñó la interfaz GGPO para que coincida con la estructura de RetroArch"
- 8a5933a — "Se eliminó el alert 'GGPO local iniciado' del test local GGPO"
