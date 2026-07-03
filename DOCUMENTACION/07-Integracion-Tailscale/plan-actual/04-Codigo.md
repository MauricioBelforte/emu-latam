# 04 - Código - Integración Tailscale (Plan Actual)

## Archivos a Modificar
- `client/src/main/index.ts`
- `client/src/App.tsx`
- `client/src/preload/index.ts`

## Funciones Nuevas
- `getTailscaleIp()` en index.ts
- Handler `tailscale-host` en index.ts
- Handler `tailscale-guest` en index.ts
- Handler `stop-tailscale` en index.ts
- Botones + estados en App.tsx

## Tests (test_stable_flows.js)
- `getTailscaleIp()` sin Tailscale → null
- Spawn args host: `--host --port 55435`
- Spawn args guest: `--connect 100.x.x.x --port 55435`
