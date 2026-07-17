# 04 - Código - Plan de Mejoras (minimax-m3)

## Archivos a crear

| Ruta | Propósito |
|------|-----------|
| `client/src/main/services/processRegistry.ts` | Registro centralizado de procesos hijos. |
| `client/src/main/services/ipcChannels.ts` | Whitelist y union types de canales IPC. |
| `client/src/main/services/relayConfigStore.ts` | Persistencia de la URL de relay en `userData` con fallback. |
| `client/src/main/services/shared/portUtils.ts` | Helpers `isPortInUse`, `assertPortFree`. |
| `client/src/main/services/shared/boreCore.ts` | Lógica común a `start-relay-tunnel` v1 y v2. |
| `client/src/renderer/hooks/useToast.ts` | Hook de notificaciones. |
| `client/src/renderer/context/ToastContext.tsx` | Provider compartido. |
| `client/src/renderer/components/ToastHost.tsx` | Render visual. |
| `client/src/renderer/hooks/useHostingActions.ts` | Extracción de handlers de `App.tsx`. |
| `client/test_process_registry.js` | Tests para el registry. |
| `client/test_ipc_whitelist.js` | Tests para el whitelist. |
| `client/test_port_utils.js` | Tests para portUtils. |

## Archivos a modificar (sin romper regla 15)

| Ruta | Cambio |
|------|--------|
| `client/src/main/index.ts` | Importar `IPC_CHANNELS`, registrar handlers en `processRegistry`, suscribir `before-quit`. Usar `boreCore.startBoreTunnel(...)` para v1 y v2. |
| `client/src/preload/index.ts` | Validar canal contra `IPC_WHITELIST` antes de invocar. Tipar el bridge. |
| `client/src/App.tsx` | Reemplazar `alert()` por `useToast()`. Usar `useHostingActions()`. |
| `client/src/main.tsx` | Envolver la app con `<ToastProvider>`. |
| `client/package.json` | Agregar scripts `test:registry`, `test:ipc`, `test:ports`. |
| `client/test_stable_flows.js` | Agregar 3 nuevos tests (RF-01, RF-03, RF-09). |

## Funciones clave

### `processRegistry.register(id, proc)`
- Inserta en el `Map`.
- Loguea: `[PROC] Registered ${id} (tag=${proc.tag}, pid=${proc.pid})`.
- Maneja IDs duplicados: si ya existe, mata el viejo antes de registrar el nuevo.

### `processRegistry.killByTag(tag)`
- Itera el map, mata los que coincidan con el tag.
- Loguea cuántos mató.
- Remueve del map.
- Espera hasta 2s a que el proceso termine (best-effort).

### `processRegistry.killAll(exceptTags?)`
- Itera todos, mata los que NO estén en `exceptTags`.
- Diseñado para llamarse en `before-quit`.

### `relayConfigStore.read()`
- Intenta leer `userData/emu_latam_relay.json`.
- Si no existe, lee legacy `relay-server/active_relay.txt`.
- Retorna `null` si ambos faltan o están vacíos.

### `relayConfigStore.write(url, setBy)`
- Escribe el JSON en userData.
- Mantiene el legacy file como espejo (escribe `url` plano).
- Loguea: `[RELAY CFG] Written userData=${url} legacy=${url}`.

### `portUtils.assertPortFree(port)`
- `net.createServer()` con `listen(port)`.
- Si `EADDRINUSE` → throw con mensaje legible.
- Si éxito → close inmediato y retorna.

### `boreCore.startBoreTunnel({ host, localPort, remotePort, timeoutMs })`
- Misma lógica que el actual v1 pero con `host` parametrizable.
- Retorna `{ success, url?, error? }` igual que antes.
- **No se exporta como IPC** — sólo lo consumen los handlers v1 y v2 existentes.

### `useToast().show(message, kind, durationMs)`
- Push al estado de toasts.
- Auto-dismiss después de `durationMs` (default 3000ms).
- Si ya hay 3 toasts, descarta el más viejo.

### `useHostingActions()` (hook)
- Encapsula `handleDirectHost`, `handleDirectJoin`, `handleTailscaleHost`, `handleTailscaleGuest`.
- Retorna `{ directHost, directJoin, tailscaleHost, tailscaleGuest, status, copyIp, copied }`.
- Usa `useToast()` internamente para feedback.

## Logs relacionados

Cuando se implemente cada ítem, se generará un log en `Logs/` con el formato `NN-DESCRIPCION_AAAA-MM-DD_HH-MM-SS.md` siguiendo la regla 6 del `AGENTS.md`. Ejemplos previstos:

- `40-ProcessRegistry_2026-MM-DD_HH-MM-SS.md`
- `41-IpcWhitelist_2026-MM-DD_HH-MM-SS.md`
- `42-RelayConfigStore_2026-MM-DD_HH-MM-SS.md`
- `43-PortUtils_2026-MM-DD_HH-MM-SS.md`
- `44-Toasts_2026-MM-DD_HH-MM-SS.md`
- `45-HostingHook_2026-MM-DD_HH-MM-SS.md`

(El número exacto se obtiene leyendo `Logs/ULTIMO_NUMERO.txt` al momento de generar el log.)

## Cambios de tipos compartidos

En `client/src/types/electron.d.ts` (a crear si no existe):

```typescript
export interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IpcInvokeMap {
  "launch-game": (args: {
    isHost: boolean;
    useRelay: boolean;
    relayIp?: string;
    relayUrl?: string;
    directConnectIp?: string;
  }) => Promise<{ success: boolean; myIp?: string; error?: string }>;
  "start-relay-tunnel": () => Promise<{ success: boolean; url?: string; error?: string }>;
  "start-relay-tunnel-v2": () => Promise<{ success: boolean; url?: string; error?: string }>;
  "kill-retroarch": () => Promise<boolean>;
  "start-mitm-local": () => Promise<{ success: boolean; error?: string }>;
  "stop-mitm-local": () => Promise<boolean>;
  "save-relay-url": (url: string) => Promise<boolean>;
  "get-relay-url": () => Promise<string | null>;
  "get-nakama-server": () => Promise<{ host: string; port: string }>;
  "set-nakama-server": (cfg: { host: string; port: string }) => Promise<void>;
  "check-nakama-health": () => Promise<boolean>;
  "get-tailscale-ip": () => Promise<{ ip: string | null }>;
  "tailscale-host": () => Promise<{ success: boolean; ip?: string; message?: string; error?: string }>;
  "tailscale-guest": (args: { hostIp: string }) => Promise<{ success: boolean; error?: string }>;
  "check-peer-connectivity": (args: { host: string }) => Promise<{ reachable: boolean; latencyMs?: number }>;
  // Nuevos
  "assert-port-free": (args: { port: number }) => Promise<{ success: boolean; error?: string }>;
  "get-process-registry": () => Promise<Array<{ id: string; tag: string; pid?: number; startedAt: number }>>;
  "kill-by-tag": (args: { tag: string }) => Promise<{ killed: number }>;
}
```

Este mapa sirve de documentación viva y permite tipar el preload.

## Estrategia de testing

1. **Unit tests** (Node.js puro, sin Electron):
   - `test_process_registry.js` — mock de `app.on`, `process.kill`, `taskkill`.
   - `test_ipc_whitelist.js` — assert que canales no listados son rechazados.
   - `test_port_utils.js` — usa `net.createServer` para ocupar un puerto y testea `assertPortFree`.
2. **Integración** (manual):
   - Lanzar 2 sesiones de RetroArch → cerrar la app → `tasklist` debe estar limpio.
   - Llamar `invoke("canal-inexistente")` desde el renderer → debe retornar error.
3. **Regresión**: `npm run test:stable` corre completo antes y después.

## Riesgos de implementación

- **Cambiar el preload** rompe la convención actual `(window as any).electron.ipcRenderer.invoke(...)`. Mitigación: mantener el wrapper genérico pero agregar un método tipado `electron.invoke("launch-game", args)` que internamente valida el whitelist.
- **`useToast` agregado al provider global** implica que el `<AppShell>` debe estar dentro del provider. Mitigación: poner el provider en `main.tsx` antes de `<AppShell>`.
- **Migrar `alert()`** podría romper flujos donde se espera un alert bloqueante. Mitigación: usar `kind: "warning"` con duración 5000ms; el usuario puede leer igual.
