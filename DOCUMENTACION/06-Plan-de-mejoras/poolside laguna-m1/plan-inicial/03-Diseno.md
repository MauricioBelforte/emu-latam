# Plan de Mejoras - Poolside Laguna-M1 (Emu Latam)

## 3. Diseño

### 3.1 Arquitectura objetivo
Se mantiene la separación Main Process / Renderer Process. Los nuevos módulos se integran como handlers IPC paralelos:

```
┌─────────────────────────────────────┐
│  Renderer Process (React)           │
│  - AutoHostButton                   │
│  - RomSelector                      │
│  - NetworkMetricsPanel              │
└─────────────────┬───────────────────┘
                  │ IPC invoke
┌─────────────────▼───────────────────┐
│  Main Process (Electron)             │
│  - auto-host-bore (orquestador)    │
│  - scan-roms (escaneo dinámico)    │
│  - get-user-config / save-config     │
│  - collect-metrics (métricas red)  │
└─────────────────┬───────────────────┘
                  │ reutiliza
┌─────────────────▼───────────────────┐
│  Helpers existentes                 │
│  - startPortForwarder()             │
│  - startRelayTunnelV2()            │
│  - waitForPort()                    │
│  - getProjectRoot()                 │
└─────────────────────────────────────┘
```

### 3.2 Módulos nuevos

| Handler | Archivo | Responsabilidad |
|---------|---------|-----------------|
| `auto-host-bore` | index.ts | Orquesta forwarder → bore → RA host en secuencia automática |
| `scan-roms` | index.ts | Lee directorio roms y devuelve lista con metadata |
| `get-user-config` | index.ts | Lee configuración persistida del usuario |
| `save-user-config` | index.ts | Guarda configuración en userConfig.json |
| `collect-metrics` | metrics.ts (nuevo) | Recolecta ping/packet metrics via polling |

### 3.3 Flujo de orquestación automática

**Auto-Host-Bore (un solo click):**
1. Inicia forwarder en puerto 55436 (espera a puerto RA).
2. Lanza RetroArch en modo host (`--host --port 55435`).
3. Espera confirmación de puerto 55435 abierto (máx 8s).
4. Resuelve bore.pub a IPv4 (con fallback).
5. Inicia bore tunnel `local 55436 --to bore.pub`.
6. Extrae URL del túnel (regex amplio) y la expone.
7. Habilita botón "Listo para compañeros" con URL copiable.

### 3.4 Persistencia de configuración

```
userConfig.json
{
  "lastRom": "kof98.zip",
  "netplaySettings": {
    "delayFrames": 1,
    "checkFrames": 0,
    "inputLatencyMin": 1
  },
  "uiPreferences": {
    "showMetrics": true,
    "autoStartRelay": true
  }
}
```

### 3.5 Componentes UI nuevos

- `AutoHostButton`: Botón "Auto-Host + Bore" que maneja todo el flujo con spinners.
- `RomSelector`: Dropdown con ROMs detectadas + preview de metadata.
- `NetworkMetricsPanel`: Muestra ping promedio, jitter, paquetes por segundo.

### 3.6 Manejo de errores con retry

```typescript
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  const delays = [1000, 2000, 4000];
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === retries - 1) throw e;
      await sleep(delays[i]);
    }
  }
  throw new Error("Max retries exceeded");
}
```

---
**Documento:** 03-Diseno.md  
**Módulo:** 06-Plan-de-mejoras / poolside laguna-m1 / plan-inicial