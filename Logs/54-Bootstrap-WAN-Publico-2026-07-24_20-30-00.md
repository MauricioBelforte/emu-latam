# Log 54: Bootstrap Público WAN — Módulo 20

## Descripción
Se creó el módulo **20-Bootstrap-WAN** que permite conectar el Nakama del host a través de un túnel bore público, y compartir la URL automáticamente mediante un paste service (dpaste.org), usando room codes de 6 caracteres. El guest ingresa el código y automáticamente se configura para conectar al Nakama remoto.

## Archivos creados
- `client/src/main/bootstrap.ts` — Módulo completo con 7 funciones:
  - `publishBoreUrl()`: POST a dpaste.org con la bore URL, retorna room code (hash)
  - `fetchBoreUrl()`: GET de dpaste.org por room code, retorna bore URL
  - `startNakamaBore()`: spawn bore local 7350 → bore.pub, extrae URL por regex
  - `setNakamaConfigRemote()`: escribe emu_latam_nakama.json con host/port remoto
  - `restoreNakamaLocalhost()`: restaura emu_latam_nakama.json a 127.0.0.1:7350
  - `handleBootstrapHost()`: orquestación completa (bore + publish)
  - `handleBootstrapGuest()`: fetch + config Nakama remoto
  - `handleBootstrapClose()`: cleanup (kill bore + restore localhost)
- `client/test_bootstrap.js` — 34 tests, 100% éxito

## Archivos modificados
- `client/src/main/index.ts` — Registro de 3 IPCs: `bootstrap-host`, `bootstrap-guest`, `bootstrap-close`
- `client/src/main/services/ipcChannels.ts` — 3 canales agregados al whitelist
- `client/src/App.tsx`:
  - Estados: `bootstrapStatus`, `bootstrapRoomCode`, `bootstrapBoreUrl`, `bootstrapLoading`, `bootstrapRoomInput`
  - Handlers: `handleBootstrapHost()`, `handleBootstrapGuest()`, `handleBootstrapClose()`
  - UI: Sección verde "SALA PÚBLICA" entre P2P y DEBUG, con botón ABRIR SALA + input código + estado visual

## Documentación
- `DOCUMENTACION/20-Bootstrap-WAN/plan-inicial/` y `plan-actual/` — 7 archivos cada uno

## Tests
- `test_bootstrap.js` — 34 tests, 100% (inline logic + verificación archivos fuente)
- Regresión: test_stable_flows.js 50/51, test_p2p_ggpo.js 39/39, test_ggpo_p2p_wan.js 17/17
- TypeScript build + Vite build sin errores

## UI
- Botón **"ABRIR SALA PÚBLICA"** (verde) en OTROS MÉTODOS DE CONEXIÓN
- En éxito: muestra room code grande + botón COPIAR + botón CERRAR SALA
- Si dpaste falla: muestra fallback con URL manual para copiar
- Guest: input de código + botón CONECTAR
- Estados con colores: verde (ok), naranja (fallback), rojo (error)
