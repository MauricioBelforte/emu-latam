# 04 - Código - Editor de Configuración Netplay

## Archivos involucrados

| Archivo | Acción |
|---------|--------|
| `client/src/main/index.ts` | +3 IPC handlers |
| `client/src/components/ui/NetplayConfigModal.tsx` | **NUEVO** |
| `client/src/components/layout/Header.tsx` | +prop + botón |
| `client/src/components/layout/AppShell.tsx` | +prop pass-through |
| `client/src/App.tsx` | +estado + montaje |
| `retroarch/netplay_optimized.cfg` | Archivo objetivo (solo lectura/escritura) |

## Funciones clave

### Main Process — IPC handlers

```typescript
// read-netplay-config
ipcMain.handle("read-netplay-config", async () => {
  const cfgPath = path.join(getProjectRoot(), "retroarch", "netplay_optimized.cfg");
  const content = fs.readFileSync(cfgPath, "utf-8");
  const config: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^(\w+)\s*=\s*"([^"]*)"\s*$/);
    if (match && ["netplay_check_frames", "netplay_input_latency_frames_min",
                  "netplay_input_latency_frames_range", "run_ahead_enabled"].includes(match[1])) {
      config[match[1]] = match[2];
    }
  }
  return config;
});

// write-netplay-config
ipcMain.handle("write-netplay-config", async (_event, { key, value }) => {
  const cfgPath = path.join(getProjectRoot(), "retroarch", "netplay_optimized.cfg");
  let content = fs.readFileSync(cfgPath, "utf-8");
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  content = content.replace(new RegExp(`^(${escapedKey}\\s*=\\s*)"([^"]*)"`, "m"), `$1"${value}"`);
  fs.writeFileSync(cfgPath, content, "utf-8");
  return { success: true };
});

// restore-netplay-config
ipcMain.handle("restore-netplay-config", async () => {
  const cfgPath = path.join(getProjectRoot(), "retroarch", "netplay_optimized.cfg");
  let content = fs.readFileSync(cfgPath, "utf-8");
  const defaults: Record<string, string> = {
    netplay_check_frames: "30",
    netplay_input_latency_frames_min: "1",
    netplay_input_latency_frames_range: "1",
    run_ahead_enabled: "false",
  };
  for (const [key, value] of Object.entries(defaults)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content.replace(new RegExp(`^(${escapedKey}\\s*=\\s*)"([^"]*)"`, "m"), `$1"${value}"`);
  }
  fs.writeFileSync(cfgPath, content, "utf-8");
  return { success: true };
});
```

### NetplayConfigModal.tsx

```tsx
// Patrón: Overlay + ModalBox (como ChallengeModal)
// Estados: loading, editing, saving
// Sliders para check_frames (valores discretos), lat_min, lat_range, run_ahead toggle
// Botones: GUARDAR, RESTAURAR, CERRAR
```

### Header.tsx — Nuevo botón

```tsx
// Se agrega a HeaderProps:
interface HeaderProps {
  // ... existentes ...
  showNetplayConfig?: boolean;
  onToggleNetplayConfig?: () => void;
}

// Botón en el StatusBox (junto a VOLVER):
{showBack && onBack && (
  <BackButton onClick={onBack}>◀ VOLVER</BackButton>
)}
{onToggleNetplayConfig && (
  <ConfigButton onClick={onToggleNetplayConfig} title="Configuración netplay">⚙</ConfigButton>
)}
```

### AppShell.tsx — Props pass-through

```tsx
interface AppShellProps {
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  showPlayers?: boolean;
  showNetplayConfig?: boolean;       // NUEVO
  onToggleNetplayConfig?: () => void; // NUEVO
}

// Pasar a Header:
<Header
  ...
  showNetplayConfig={showNetplayConfig}
  onToggleNetplayConfig={onToggleNetplayConfig}
/>
```

### App.tsx — Integración

```tsx
const [showNetplayConfig, setShowNetplayConfig] = useState(false);

// En el return:
<AppShell
  ...
  showNetplayConfig={showNetplayConfig}
  onToggleNetplayConfig={() => setShowNetplayConfig(prev => !prev)}
>
  ...
</AppShell>
<NetplayConfigModal
  isOpen={showNetplayConfig}
  onClose={() => setShowNetplayConfig(false)}
/>
```
