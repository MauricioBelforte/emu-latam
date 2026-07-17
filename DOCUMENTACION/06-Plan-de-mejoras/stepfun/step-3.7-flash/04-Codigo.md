# Plan de Mejoras - Stepfun Step-3.7-Flash (Emu Latam)
## 4. Código

### 4.1 Archivos involucrados
| Archivo | Rol |
|---------|-----|
| `client/src/main/index.ts` | IPC handlers nuevos (`launch-challenge`, `auto-relay-tunnel`, `calibrate-anti-lag`, `check-nakama-status`) |
| `client/src/main/ipc/challenge.ts` (nuevo) | Orquestación reto |
| `client/src/main/ipc/relay-auto.ts` (nuevo) | Bore/forwarder automático |
| `client/src/main/ipc/antiLag.ts` (nuevo) | Calibración anti-lag |
| `client/src/main/utils/network.ts` | Helpers: `waitForPort`, `getLanIp`, `isPortInUse` |
| `client/src/renderer/src/hooks/useNetworkStatus.ts` (nuevo) | Estado global de red en React |
| `client/src/renderer/src/components/NetworkStatusBar.tsx` (nuevo) | Barra de estado |
| `client/src/renderer/src/components/ProgressSteps.tsx` (nuevo) | Progreso por fases |
| `client/src/renderer/src/components/ActionGate.tsx` (nuevo) | Desactivador de botones |
| `client/src/renderer/src/stores/networkStore.ts` (nuevo) | Store de red (si se usa Zustand) |
| `client/src/renderer/src/stores/sessionMetrics.ts` (nuevo) | Acumula métricas por sesión |

### 4.2 IPC handlers (ejemplos mínimos)

#### 4.2.1 `check-nakama-status`
```ts
ipcMain.handle('check-nakama-status', async () => {
  console.log('[HEALTH] Nakama health-check iniciado');
  // Usar cliente Nakama existente o http client liviano.
  return { ok: true, latencyMs: 42 };
});
```

#### 4.2.2 `auto-relay-tunnel`
```ts
ipcMain.handle('auto-relay-tunnel', async (_e, mode: 'host' | 'guest', port: number) => {
  console.log('[RELAY-AUTO] mode=', mode);
  const lanIp = getLanIp();
  if (mode === 'host') {
    const fwd = await startForwarder(port, lanIp, 55435);
    forwarderServers.push(fwd);
    return { forwarderPort: fwd.localPort };
  }
  // guest: puede usar proxy local 55435 o tunnel automático.
  return {};
});
```

#### 4.2.3 `launch-challenge` (nuevo; NO reemplaza `launch-game`)
```ts
ipcMain.handle('launch-challenge', async (_e, role: 'host' | 'guest', opts) => {
  console.log('[CHALLENGE] role=', role, 'opts=', JSON.stringify(opts));
  const start = Date.now();
  const steps = role === 'host'
    ? [autoRelayHost, waitForPort, spawnRAHost]
    : [autoRelayGuest, spawnRAGuest];
  const metrics = { t0: start, t1: 0, t2: 0, t3: 0 };
  for (const step of steps) {
    await step(metrics);
  }
  await writeSessionMetrics(metrics);
  return { ok: true };
});
```

### 4.3 Helpers a reutilizar (sin tocar estables)
- `waitForPort(host, port, timeout)` — ya existe en el proyecto (proxy/forwarder).
- `getLanIp()` — ya existe.
- `spawn retroarch --host --port 55435` / `--connect 127.0.0.1` — wrappers existentes.

### 4.4 Anti-lag calibración
```ts
function detectCore(cfgPath: string): string {
  const cfg = readFileSync(cfgPath, 'utf8');
  const m = cfg.match(/core\s*=\s*"(.+?)"/);
  return m ? m[1] : 'unknown';
}
ipcMain.handle('calibrate-anti-lag', async (_e, core: string) => {
  const defaults = core.includes('fbn') ? { frames: 2, poll: '0' } : { frames: 0, poll: '1' };
  console.log('[ANTILAG] core=', core, 'defaults=', defaults);
  return defaults;
});
```

### 4.5 React: hooks y componentes claves
```tsx
// useNetworkStatus.ts (conceptual)
const useNetworkStatus = () => {
  const [state, setState] = useState({ busy: false, message: '', progress: 0 });
  const setBusy = (busy: boolean, message = '') => setState(s => ({ ...s, busy, message }));
  return { ...state, setBusy };
};

// ActionGate.tsx (conceptual)
const ActionGate: React.FC<{ busy: boolean; children }> = ({ busy, children }) => (
  <button disabled={busy} onClick={() => !busy && children.props.onClick?.()}>
    {busy ? 'Procesando...' : children.props.children}
  </button>
);
```

### 4.6 Métricas por sesión
Se guarda en: `logs/session_metrics_YYYYMMDD_HHMMSS.json`
```json
{
  "date":"2026-07-17T16:00:00Z",
  "role":"host",
  "t0_ms":0,
  "t1_ms":420,
  "t2_ms":890,
  "t3_ms":1200,
  "latencyMs":42,
  "core":"fbneo",
  "antiLagFrames":2
}
```

---
**Documento:** 04-Codigo.md
**Módulo:** 06-Plan-de-mejoras / stepfun / step-3.7-flash