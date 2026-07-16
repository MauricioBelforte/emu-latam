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

## 3. Fix de doble input guest en host (15-Jul-2026)

### Problema
El guest (player 2) se movía uno de más en la pantalla del host. Causado por `netplay_check_frames = "30"` que forzaba a RetroArch a hacer rollback/verificación de inputs cada 30 frames, re-procesando inputs del guest y duplicándolos.

### Solución
En `retroarch/netplay_optimized.cfg`:
- `netplay_check_frames` cambiado de `"30"` a `"0"`: desactiva la verificación periódica de frames, evitando el re-procesamiento de inputs del guest.
- Backup guardado en `Obsoletos/retroarch/`.

### Archivos afectados
- `retroarch/netplay_optimized.cfg` (local, no commiteado por .gitignore)

### Verificación
- ✅ MITM local: sin doble input, inputs del guest se ven correctos en el host.
- El fix aplica a todos los flujos (MITM, Bore, Tailscale, Directo) porque todos usan `--appendconfig netplay_optimized.cfg`.