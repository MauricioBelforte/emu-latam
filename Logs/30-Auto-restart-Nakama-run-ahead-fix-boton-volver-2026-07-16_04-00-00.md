# Log 30 — Auto-restart Nakama, Fix doble input (run-ahead), Botón VOLVER

**Fecha:** 2026-07-16 04:00:00

---

## Cambios realizados

### 1. Auto-restart de Nakama al crashear
- **Archivo:** `client/src/main/index.ts`
- **Qué:** Se agregó reinicio automático cuando Nakama se cae + health check periódico
- **Detalle:**
  - Variables: `nakamaProcess`, `nakamaRestartAttempts`, `nakamaRestartTimer`, `nakamaHealthTimer`, `nakamaKilledIntentionally`
  - Constantes: `MAX_NAKAMA_RESTART_ATTEMPTS = 5`, `NAKAMA_RESTART_DELAY_MS = 2000`, `NAKAMA_HEALTH_INTERVAL_MS = 30000`
  - `launchNakama()`: agrega `on("close")` que reinicia Nakama tras 2s si cerró inesperadamente
  - `startNakamaHealthCheck()`: setInterval cada 30s verifica health; si no responde mata y reinicia
  - `before-quit`: limpia timers y marca `nakamaKilledIntentionally = true` para evitar reinicio al cerrar app
- **Logs debug:** `[NAKAMA CFG]` en IPC handler + `[AUTH]` en AuthContext.tsx

### 2. Fix doble input del guest: run-ahead era la causa real
- **Archivo:** `retroarch/netplay_optimized.cfg`
- **Qué:** Se desactivó run-ahead y se aumentó buffer de latencia a 2 frames
- **Detalle:**
  - `run_ahead_enabled = "true"` → `"false"` (predicción causaba inputs duplicados)
  - `netplay_input_latency_frames_min = "1"` → `"2"` (1 frame de buffer no alcanzaba)
  - Se documentaron todas las secciones con comentarios técnicos detallados

### 3. Botón VOLVER en navbar
- **Archivos:** `client/src/App.tsx`, `client/src/context/AuthContext.tsx`, `client/src/lib/nakama.ts`, `client/src/components/layout/Header.tsx`, `client/src/components/layout/AppShell.tsx`
- **Qué:** Botón `← VOLVER` en la barra superior para salir de sala o cancelar unión
- **Detalle:**
  - `AuthContext.tsx`: nueva función `logout()` que resetea estado y desconecta socket
  - `nakama.ts`: nuevo método `disconnect()` para limpiar conexión
  - `Header.tsx`: nuevas props `showBack`/`onBack`, botón `← VOLVER` en StatusBox
  - `AppShell.tsx`: pasa `showBack`/`onBack` al Header
  - `App.tsx`: useEffect resetea `joinMode` al desautenticarse

### 4. Documentación de fallas
- **Archivo:** `DOCUMENTACION/11-Posibles-Fallas/plan-actual/04-Codigo.md`
- **Entradas agregadas:**
  - [6] Doble input persistió: run-ahead era la causa real (corrige entrada [2])
  - [5] Nakama ERR_CONNECTION_REFUSED por IP incorrecta
  - [4] Auto-restart de Nakama al crashear

---

## Código Original vs Nuevo

### launchNakama() (antes → después)
**Antes:** Solo spawn sin manejo de crash, sin health check.
**Después:** spawn + on("close") con auto-restart + health check cada 30s + límite 5 reintentos.

### netplay_optimized.cfg (antes)
```ini
run_ahead_enabled = "true"    # CAUSABA DOBLE INPUT
netplay_input_latency_frames_min = "1"  # INSUFICIENTE
```

### netplay_optimized.cfg (después)
```ini
run_ahead_enabled = "false"   # SOLUCIÓN
netplay_input_latency_frames_min = "2"  # BUFFER SEGURO
```

---

## Verificación
- `npm run dev` → compila sin errores
- Auto-restart Nakama: matar proceso con taskkill → se reinicia solo en ≤2s
- Doble input: probado cross-PC Tailscale, ambos sentidos host/guest ✅
- Botón VOLVER: funciona desde pantalla de unirse y desde vista autenticada
