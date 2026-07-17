# Plan de Mejoras - Stepfun Step-3.7-Flash (Emu Latam)
## 3. Diseño

### 3.1 Arquitectura objetivo
Se mantiene la separación **Main Process (Electron)** y **Renderer (React)**. Toda lógica de sistema vive en IPC handlers nuevos, sin modificar handlers existentes:

```
┌─────────────────────────┐     IPC      ┌────────────────────────┐
│  Renderer React         │◄────────────►│  Main Process          │
│  (UI + estado)          │              │  (handlers nuevos)     │
│  - NetworkStatus        │              │  - challenge-orchestrator
│  - SpinnerLayer         │              │  - metricsCollector    │
│  - CopyButton           │              │  - antiLagCalibrator  │
└─────────────────────────┘              └────────────────────────┘

┌──────────────────┐   comparten helpers   ┌───────────────────┐
│ Flujos estables  │◄──────────────────────►│ Utils comunes     │
│ (launch-game,    │   waitForPort()        │ - spawnRA()       │
│  start-relay-V1) │   startProxy()         │ - getLanIp()      │
└──────────────────┘                        └───────────────────┘
```

### 3.2 Módulos propuestos

| Módulo | Handler/Componente | Responsabilidad |
|--------|-------------------|-----------------|
| Health-check UI | `check-nakama-status` (nuevo) | Ping Nakama previo y muestra spinner. |
| Orquestación retos | `launch-challenge` (nuevo) | Crea/join a challenge con cleanup propio. |
| Auto-Bore | `auto-relay-tunnel` (nuevo) | Levantar bore/forwarder automático con detección de conflicto. |
| Anti-lag calibrado | `calibrate-anti-lag` | Detecta core/FPS, sugiere `input_poll_type` y frames. |
| Métricas por sesión | `session-metrics` | Registra tiempos de setup y latencias al finalizar. |
| Tailscale fallback | `tailscale-connect` | Verifica tailscale y la usa como red preferida. |

### 3.3 Flujos
**Flujo 1: Host directo mejorado (no modifica estable)**
1. React pide `check-nakama-status`.
2. Si éxito, habilita botón "HOST".
3. Al click, llama a `launch-challenge` como host → interno reusa helpers comunes → lanza RA host.
4. Muestra progreso por fases.

**Flujo 2: Join mejorado (no modifica estable)**
1. React obtiene datos del reto (relayIp/port).
2. `auto-relay-tunnel` negocia túnel automático (opcional) o usa forwarder.
3. `launch-challenge` como guest lanza RA.
4. Muestra progreso.

**Anti-lug calibración** es independiente y se ejecuta una vez al seleccionar ROM.

### 3.4 Limpieza de recursos
- Listas `proxyServers[]` y `forwarderServers[]` se limpian al terminar challenge.
- `bore` y `forwarder` se cierran con `kill()` + `force:true` si persisten.
- Se mide tiempo de setup:
  - `t0`: inicio handler
  - `t1`: puerto listo
  - `t2`: RA lanzado
  - `t3`: primer frame sincronizado (si es detectable)

### 3.5 UI y estado
Nuevos componentes (ejemplos):
- `NetworkStatusBar`: muestra icono + texto (Nakama: OK, Bore: iniciando, Listo).
- `ProgressSteps`: steps con spinner.
- `ActionGate`: botón deshabilitado mientras `networkBusy === true`.

### 3.6 Logging y métricas
- Todo handlers nuevos usan `console.log/error` (ya capturados por rotación).
- M étricas se vuelcan al final en `logs/session_metrics_YYYYMMDD_HHMMSS.json`.
- No se agrega archivo de log adicional sin rotación.

---
**Documento:** 03-Diseno.md
**Módulo:** 06-Plan-de-mejoras / stepfun / step-3.7-flash