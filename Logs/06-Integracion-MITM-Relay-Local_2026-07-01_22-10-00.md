# Log 06: Integración Relay MITM Local

**Fecha:** 2026-07-01 22:10
**Autor:** IA (asistente)

## Descripción
Se implementó un relay MITM (Man-In-The-Middle) local en Node.js para que dos instancias de RetroArch se conecten sin usar `--host`. Ambas se conectan como "guest" al relay, y el relay maneja el handshake netplay completo (header echo, NICK, INFO, SYNC) y el forwarding de comandos post-handshake.

## Archivos modificados

### Nuevos
- `relay-server/mitm-relay.js` — Relay MITM Node.js con handshake completo del protocolo netplay.
- `retroarch/netplay_mitm.cfg` — Config RetroArch con `netplay_use_mitm_server = "true"`.

### Modificados
- `client/src/main/index.ts` — IPC handlers `start-mitm-local` / `stop-mitm-local`. Cleanup en `before-quit`.
- `client/src/App.tsx` — Botón "TEST MITM LOCAL" con estado `isLaunchingMitm`.

## Código original (índice.ts)

```typescript
// No existía el handler start-mitm-local
```

## Código nuevo (índice.ts — extracto)

```typescript
// Variable global
let mitmRelayProcess: ChildProcess | null = null;

// IPC handler
ipcMain.handle("start-mitm-local", async () => {
  const relayScript = path.join(relayDir, "mitm-relay.js");
  if (!fs.existsSync(relayScript)) return { success: false, error: "No existe mitm-relay.js" };
  if (nakamaProcess && waitForPort(55435, 30000)) {
    // Spawn relay + ambos RAs
  }
  return { success: true };
});

ipcMain.handle("stop-mitm-local", async () => {
  if (mitmRelayProcess) { mitmRelayProcess.kill(); mitmRelayProcess = null; }
});

// before-quit
app.on("before-quit", () => {
  if (mitmRelayProcess) mitmRelayProcess.kill();
});
```

## Código nuevo (App.tsx — extracto)

```typescript
const [isLaunchingMitm, setIsLaunchingMitm] = useState(false);

const handleTestMitmLocal = async () => {
  setIsLaunchingMitm(true);
  setStatusText("Iniciando relay MITM local...");
  const result = await ipcRenderer.invoke("start-mitm-local");
  if (!result.success) alert("Error MITM local: " + result.error);
  setIsLaunchingMitm(false);
  setStatusText("");
};
```

## Verificación
- ✅ Build Vite exitoso (renderer + main + preload)
- ✅ Tests estables: 35/35 sin regresiones
- ✅ Relay Node.js acepta conexiones TCP y responde con header echo (`RANP`)
- ✅ App Electron arranca sin errores en consola

## Pendiente
- Prueba real: hacer clic en "TEST MITM LOCAL" y verificar que ambos RAs se conectan al relay y establecen netplay.
- Posible ajuste de timeouts en `waitForPort` (el relay tarda ~1s en estar listo).
