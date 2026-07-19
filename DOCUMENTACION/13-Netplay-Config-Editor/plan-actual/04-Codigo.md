# 04 - Código - Editor de Configuración Netplay

## Archivos involucrados

| Archivo | Acción |
|---------|--------|
| `client/src/main/index.ts` | +3 IPC handlers + `netplay_input_block_timeout` en lists |
| `client/src/components/ui/NetplayConfigModal.tsx` | **NUEVO** — modal con sliders, tooltips |
| `client/src/components/layout/Header.tsx` | +props + botón ⚙ |
| `client/src/components/layout/AppShell.tsx` | +props pass-through |
| `client/src/App.tsx` | +estado + montaje del modal |
| `retroarch/netplay_optimized.cfg` | Archivo objetivo + nueva clave `netplay_input_block_timeout` |

## Funciones clave

### Main Process — IPC handlers (index.ts)

```typescript
const NETPLAY_EDITABLE_KEYS = [
  "netplay_check_frames",
  "netplay_input_latency_frames_min",
  "netplay_input_latency_frames_range",
  "run_ahead_enabled",
  "netplay_input_block_timeout",    // AGREGADO 19-Jul
];
const NETPLAY_DEFAULTS: Record<string, string> = {
  netplay_check_frames: "30",
  netplay_input_latency_frames_min: "1",
  netplay_input_latency_frames_range: "1",
  run_ahead_enabled: "false",
  netplay_input_block_timeout: "0",  // AGREGADO 19-Jul
};

// read-netplay-config — parsea el .cfg y devuelve solo claves editables
// write-netplay-config — reemplaza valor vía regex preservando comentarios
// restore-netplay-config — restaura todos los defaults
```

### NetplayConfigModal.tsx — Características implementadas

```tsx
// Props: isOpen, onClose
// Estados: loading, config (datos), saving, statusMsg

// Campos editables:
// - check_frames: SegmentedControl con OFF/30/60/120/180/300/600
// - latency min: Botones −/+ con rango 0-3
// - latency range: Botones −/+ con rango 0-3
// - run-ahead: Toggle ON/OFF
// - input block timeout: SegmentedControl con OFF/1/3/10 (AGREGADO 19-Jul)

// Tooltips con CSS puro (AGREGADO 19-Jul):
// - TooltipLabel con ::after (texto) y ::before (flecha)
// - Aparecen tras 1s de hover, max-width 380px
// - Explicaciones en español para cada campo

// Botones:
// - GUARDAR: escribe cada clave vía write-netplay-config
// - RESTAURAR: restore-netplay-config + recarga
// - CERRAR (×) o click fuera del modal
```

### Header.tsx — Botón ⚙

```tsx
interface HeaderProps {
  // ... existentes ...
  showNetplayConfig?: boolean;
  onToggleNetplayConfig?: () => void;
}

// En StatusBox, junto a VOLVER:
{onToggleNetplayConfig && (
  <button onClick={onToggleNetplayConfig} title="Configuración netplay">⚙</button>
)}
```

### AppShell.tsx — Props pass-through

```tsx
interface AppShellProps {
  // ... existentes ...
  showNetplayConfig?: boolean;
  onToggleNetplayConfig?: () => void;
}
```

### App.tsx — Integración

```tsx
const [showNetplayConfig, setShowNetplayConfig] = useState(false);

<AppShell
  showNetplayConfig={showNetplayConfig}
  onToggleNetplayConfig={() => setShowNetplayConfig((o) => !o)}
>
  ...
</AppShell>

{showNetplayConfig && (
  <NetplayConfigModal isOpen={showNetplayConfig} onClose={() => setShowNetplayConfig(false)} />
)}
```

## Cambios relacionados (19-Jul-2026)

### ChallengeModal.tsx — Botón de cierre en estados bloqueantes
- Se expuso `resetChallenge()` en `ChallengeContext`
- Se agregó CloseButton (×) en estados `accepted`, `rejected`, `timeout`
- Permite cerrar el modal cuando se traba y reiniciar el flujo de retos

### netplay_optimized.cfg
- Se agregó `netplay_input_block_timeout = "0"` con comentario explicativo
