# 03 - Diseño - Editor de Configuración Netplay

## Arquitectura

### Componentes

```
┌──────────────────────────────────────────────┐
│ App.tsx                                       │
│  ├─ AppShell (showNetplayConfig, onToggle)    │
│  │   └─ Header (⚙ gear button)               │
│  └─ <NetplayConfigModal isOpen onClose />      │
│                                                │
│ Main Process (index.ts)                       │
│  ├─ ipcMain.handle("read-netplay-config")     │
│  ├─ ipcMain.handle("write-netplay-config")    │
│  └─ ipcMain.handle("restore-netplay-config")  │
└──────────────────────────────────────────────┘
```

### Flujo de datos

```
1. Usuario click ⚙ en Header
2. Header → onToggleNetplayConfig() en AppShell → App.tsx
3. App.tsx setShowNetplayConfig(true)
4. NetplayConfigModal se monta, llama a read-netplay-config
5. Main process lee netplay_optimized.cfg, parsea y devuelve valores
6. Modal muestra los valores en sliders
7. Usuario cambia valores y click GUARDAR
8. Modal llama write-netplay-config por cada valor cambiado
9. Main process reemplaza las líneas en el .cfg
10. Modal muestra "✅ Guardado"
11. Usuario puede click RESTAURAR para volver a defaults
```

### IPC Handlers

#### read-netplay-config
```
Entrada: ninguna
Salida: { check_frames: string, lat_min: string, lat_range: string, run_ahead: string }
Lógica: lee el .cfg, itera líneas con regex /^(w+)\s*=\s*"([^"]*)"/, devuelve solo las 4 claves
```

#### write-netplay-config
```
Entrada: { key: string, value: string }
Salida: { success: boolean }
Lógica: lee el .cfg, aplica regex /^(key\s*=\s*)"([^"]*)"/m → reemplaza value, escribe archivo
```

#### restore-netplay-config
```
Entrada: ninguna
Salida: { success: boolean }
Lógica: reemplaza solo las 4 líneas editables con los defaults probados
Defaults: check_frames=30, lat_min=1, lat_range=1, run_ahead=false
```

### Componente NetplayConfigModal

```
Props:
  isOpen: boolean
  onClose: () => void

Estado interno:
  config: { check_frames, lat_min, lat_range, run_ahead } | null
  saving: boolean
  statusMsg: string

Comportamiento:
  - Al abrirse (isOpen → true), carga la config actual
  - Muestra controles para cada variable
  - Validación: check_frames solo valores permitidos (0,30,60,120,180,300,600)
  - Botón GUARDAR: escribe cada valor cambiado
  - Botón RESTAURAR: vuelve a defaults y refresca
  - Feedback con timeout 2s
  - Cierre: click fuera del modal o botón X
```

### Integración en Header

Se agrega un botón ⚙ (react-icons: FiSettings o similar) al lado del
botón VOLVER en Header.tsx. Solo visible cuando hay una sessión activa
(usuario autenticado).

### Flujo de props desde App.tsx

```
App.tsx
  const [showNetplayConfig, setShowNetplayConfig] = useState(false);

  return (
    <ThemeProvider>
      <AppShell
        showBack={...}
        onBack={...}
        showNetplayConfig={showNetplayConfig}
        onToggleNetplayConfig={() => setShowNetplayConfig(prev => !prev)}
      >
        <GameCard />
      </AppShell>
      <NetplayConfigModal
        isOpen={showNetplayConfig}
        onClose={() => setShowNetplayConfig(false)}
      />
    </ThemeProvider>
  );
```
