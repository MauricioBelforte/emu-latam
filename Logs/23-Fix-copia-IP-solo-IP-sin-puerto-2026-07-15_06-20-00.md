# 23 — Fix copia IP: solo IP sin puerto

**Fecha:** 2026-07-15 06:20:00
**Tipo:** Corrección UX
**Componentes:** 01-Setup-Electron-Vite, 09-Testing

## Cambio

- **Antes:** `handleCopyIp` copiaba `myTailscaleIp:nakamaPort` (ej: `100.x.x.x:7350`)
- **Ahora:** Copia solo `myTailscaleIp` (ej: `100.x.x.x`). El amigo solo necesita la IP, el puerto 7350 va por defecto y se auto-completa al pegar en el campo correspondiente.

## Archivos modificados

- `client/src/App.tsx` — `handleCopyIp`: ya no concatena `:nakamaPort`, copia solo `myTailscaleIp`
- `client/test_ux_features.js` — eliminada función `buildCopyIp` y sus 4 tests (IP:puerto, localhost, custom, vacío). Reemplazados por 2 tests simples (solo IP, vacío). Total: 23→21 tests.
- `DOCUMENTACION/09-Testing/plan-inicial/04-Codigo.md` — eliminada referencia a `buildCopyIp`
- `DOCUMENTACION/09-Testing/plan-actual/04-Codigo.md` — idem
- `GUIA_JUEGO.md` — texto "100.98.148.11:7350" → "100.98.148.11"

## Verificación
- `node client/test_ux_features.js` → 21/21 passed
- `npm run build` → sin errores
