# Plan de Mejoras - Poolside Laguna-M1 (Emu Latam)

## 4. Código

### 4.1 Archivos involucrados

| Archivo | Acción | Observaciones |
|---------|--------|---------------|
| `client/src/main/index.ts` | Modificar | Agregar handlers `auto-host-bore`, `scan-roms`, `get-user-config`, `save-user-config` |
| `client/src/renderer/App.tsx` | Modificar | Integrar nuevos componentes UI |
| `client/src/renderer/components/AutoHostButton.tsx` | Crear | Botón de orquestación automática |
| `client/src/renderer/components/RomSelector.tsx` | Crear | Selector dinámico de ROMs |
| `client/src/renderer/components/NetworkMetricsPanel.tsx` | Crear | Panel de métricas de red |
| `client/src/main/metrics.ts` | Crear | Módulo de recolección de métricas de red |

### 4.2 Funciones clave propuestas

#### Handler: `auto-host-bore`
```typescript
// client/src/main/index.ts
ipcMain.handle("auto-host-bore", async () => {
  const metrics = { t0: Date.now() };
  
  // Paso 1: Iniciar forwarder
  await startPortForwarder(55436, 55435);
  
  // Paso 2: Lanzar host RA
  const hostResult = await launchRetroArchHost();
  if (!hostResult.success) throw new Error(hostResult.error);
  
  // Paso 3: Esperar puerto
  const portReady = await waitForPort(55435, 8000);
  if (!portReady) throw new Error("Host RA no abrió puerto");
  
  // Paso 4: Resolver bore.pub
  const boreIp = await resolveBoreIp();
  
  // Paso 5: Iniciar túnel
  const tunnel = await startRelayTunnelV2();
  
  metrics.tRelayReady = Date.now();
  
  return {
    success: true,
    relayUrl: tunnel.url,
    setupTimeMs: metrics.tRelayReady - metrics.t0
  };
});
```

#### Función: `scan-roms`
```typescript
// client/src/main/index.ts
ipcMain.handle("scan-roms", async () => {
  const romsDir = path.join(getProjectRoot(), "retroarch", "roms");
  const files = fs.readdirSync(romsDir).filter(f => f.endsWith('.zip'));
  
  return files.map(f => ({
    name: f,
    size: fs.statSync(path.join(romsDir, f)).size,
    core: "fbneo_libretro.dll",
    lastUsed: Date.now()
  }));
});
```

#### Función: `withRetry` (helper)
```typescript
async function withRetry<T>(
  fn: () => Promise<T>, 
  maxRetries = 3, 
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, i));
    }
  }
  throw new Error("withRetry: max retries exceeded");
}
```

### 4.3 Logs relacionados
- Todos los handlers usan `console.log/error` con prefijo `[AUTO-HOST]`.
- Métricas de tiempo de setup se registran al finalizar.
- Errores detallados incluyen timestamp y estado del retry.

---
**Documento:** 04-Codigo.md  
**Módulo:** 06-Plan-de-mejoras / poolside laguna-m1 / plan-actual