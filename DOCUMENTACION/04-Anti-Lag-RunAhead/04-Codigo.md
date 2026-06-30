# Código Involucrado - Fase 1.3

A continuación se detallan los archivos a modificar y crear, así como las funciones clave.

## 1. Nuevos Archivos
- `retroarch/netplay_optimized.cfg` (Contiene las directivas anti-lag de RetroArch).

## 2. Modificaciones
- `client/src/main/index.ts`
  - Agregar handler IPC: `ipcMain.handle("check-nakama-health", ...)`
  - Modificar handler `launch-game`:
    ```typescript
    const optimizedCfg = path.join(retroArchDir, "netplay_optimized.cfg");
    if (fs.existsSync(optimizedCfg)) {
      spawnArgs.push("--appendconfig", optimizedCfg);
    }
    ```
- `client/src/App.tsx`
  - Añadir polling en React mediante un `useEffect`:
    ```typescript
    const [isServerReady, setIsServerReady] = React.useState(false);
    
    React.useEffect(() => {
      let interval: NodeJS.Timeout;
      const checkHealth = async () => {
        // @ts-ignore
        const isUp = await window.electron.ipcRenderer.invoke("check-nakama-health");
        if (isUp) {
          setIsServerReady(true);
          clearInterval(interval);
        }
      };
      
      checkHealth();
      interval = setInterval(checkHealth, 1000);
      return () => clearInterval(interval);
    }, []);
    ```
  - Actualizar botón "INSERT COIN":
    ```tsx
    <InsertCoinButton onClick={handleInsertCoin} disabled={!isServerReady}>
      {isServerReady ? "INSERT COIN" : "INICIANDO SERVIDOR..."}
    </InsertCoinButton>
    ```
  - En `handleTestGame` para el flujo Join:
    ```typescript
    if (!isHost) {
      localStorage.setItem("emu_latam_relay", customRelay);
    }
    ```