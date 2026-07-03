# 04 - Código - Integración Tailscale (Plan Inicial)

## Archivos a Modificar
- `client/src/main/index.ts` — Agregar handlers `tailscale-host`, `tailscale-guest`, `stop-tailscale`
- `client/src/App.tsx` — Agregar botones "HOST VÍA TAILSCALE" / "JOIN VÍA TAILSCALE"
- `client/src/preload/index.ts` — Exponer nuevos IPC handlers (si aplica)

## Archivos a Crear (ninguno — todo dentro de existentes)

## Funciones Nuevas en index.ts

### getTailscaleIp(): string | null
```javascript
function getTailscaleIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.address.startsWith("100.") && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}
```

### IPC tailscale-host
```javascript
ipcMain.handle("tailscale-host", async () => {
  const projectRoot = getProjectRoot();
  const retroArchPath = path.join(projectRoot, "retroarch", "retroarch.exe");
  const corePath = path.join(projectRoot, "retroarch", "cores", "fbneo_libretro.dll");
  const romPath = path.join(projectRoot, "retroarch", "roms", "kof98.zip");
  const cfg = path.join(projectRoot, "retroarch", "netplay_optimized.cfg");

  // 1. Detectar IP Tailscale
  const tailscaleIp = getTailscaleIp();
  if (!tailscaleIp) return { success: false, error: "Tailscale no detectado" };

  // 2. Matar instancias previas
  try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
  await new Promise(r => setTimeout(r, 1000));

  // 3. Spawn host RA
  const args = ["-L", corePath, romPath, "--host", "--port", "55435"];
  if (fs.existsSync(cfg)) args.push("--appendconfig", cfg);
  spawn(retroArchPath, args, { cwd: path.dirname(retroArchPath), detached: true, stdio: "ignore" }).unref();

  // 4. Esperar puerto
  const ready = await waitForPort(55435, 8000);
  if (!ready) return { success: false, error: "RA no abrió puerto 55435" };

  return { success: true, ip: tailscaleIp };
});
```

### IPC tailscale-guest
```javascript
ipcMain.handle("tailscale-guest", async (_event, { hostIp }) => {
  const projectRoot = getProjectRoot();
  const retroArchPath = path.join(projectRoot, "retroarch", "retroarch.exe");
  // ... similar a tailscale-host pero con --connect hostIp
});
```

### IPC stop-tailscale
```javascript
ipcMain.handle("stop-tailscale", async () => {
  try { execSync("taskkill /f /im retroarch.exe 2>nul", { stdio: "ignore" }); } catch {}
  return true;
});
```

## Tests (en test_stable_flows.js)
- `getTailscaleIp()` sin Tailscale → null
- Spawn args host: `--host --port 55435`
- Spawn args guest: `--connect 100.x.x.x --port 55435`
- Host args NO contienen `--connect`
- Guest args NO contienen `--host`
