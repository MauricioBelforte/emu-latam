# Log 17 - Fixes: INSERT COIN, Nakama Fallback y Parpadeo en Host

**Fecha:** 2026-07-04 05:59
**Agente:** DeepSeek

## Cambios Realizados

### 1. INSERT COIN desacoplado de Nakama
- **Archivo:** `client/src/App.tsx`
- **Problema:** El botón INSERT COIN se deshabilitaba mientras Nakama no respondiera (`disabled={!isServerReady}`), mostrando "INICIANDO SERVIDOR..." permanentemente en PCs sin Nakama funcionando.
- **Solución:** Se eliminó el health check bloqueante. Ahora el botón siempre está habilitado. Se agregó un indicador "○ NAKAMA OFFLINE" / "● NAKAMA ONLINE" informativo.

### 2. loginGhost con fallback local
- **Archivo:** `client/src/context/AuthContext.tsx`
- **Problema:** Si Nakama no respondía, `loginGhost()` lanzaba un alert de error y no dejaba avanzar.
- **Solución:** Se agregó un `catch` que crea un usuario local anónimo (`local-{uuid}`, `Player{random}`) cuando Nakama no está disponible. El usuario puede usar los botones TAILSCALE sin necesidad de Nakama.

### 3. Timeout en execSync taskkill
- **Archivo:** `client/src/main/index.ts`
- **Problema:** `execSync("taskkill /f /im retroarch.exe...")` sin timeout podía colgar el handler `tailscale-host` para siempre si `taskkill` se trababa en la otra PC.
- **Solución:** Se agregó `timeout: 5000` a todas las llamadas `execSync` de taskkill (5 ocurrencias). También se agregó console.log al inicio del handler `tailscale-host` para debugging.

### 4. Fragment JSX faltante
- **Archivo:** `client/src/App.tsx`
- **Problema:** Al agregar el párrafo de Nakama status, quedaron dos elementos JSX adyacentes sin wrap en fragment.
- **Solución:** Se agregó `<>...</>` alrededor del botón y el indicador.

### 5. netplay_optimized.cfg trackeado en git
- **Archivo:** `.gitignore` y `retroarch/netplay_optimized.cfg`
- Se agregó excepción en gitignore para trackear el archivo de configuración de netplay.

## Pruebas de Netplay (No Solucionado)

### Síntoma
- En la PC host, los inputs direccionales (flechas) del guest se ven duplicados:
  - Presionar izquierda/derecha → el personaje se mueve 2 casilleros
  - Mantener abajo → el sprite parpadea entre parado y agachado ~10 veces en 5 segundos
- **Solo ocurre en la pantalla del host**. El guest ve su personaje moverse suavemente.
- Los botones de puño/patada (letras) no tienen este problema.
- Probado con teclado USB y teclado inalámbrico — mismo resultado. No es falla de teclado.

### Intentos de solución (todos fallaron)
1. `netplay_delay_frames = 4` → el juego se puso lento, no solucionó
2. `netplay_delay_frames = 6` → más lento aún
3. `netplay_delay_frames = 10` → muy lento, no solucionó
4. `netplay_input_latency_frames_min = 2` → sin cambio
5. `netplay_shared_input = false` → sin cambio
6. `video_vsync = true` + `video_threaded = false` → sin cambio (VSync ya estaba ON en el host)
7. `netplay_input_latency_frames_range = 0` + `check_frames = 1` → **empeoró**, el guest también empezó a verse afectado
8. Se revirtió todo a la config original

### Hipótesis
- El host procesa los inputs del guest con alguna forma de "doble aplicación" o "rollback" visible solo en su renderizado.
- Algo en la configuración de RetroArch de la PC host (no el `--appendconfig` sino el `retroarch.cfg` principal) podría estar causando el problema.
- WiFi en la PC host podría generar latencia variable que RetroArch maneja mal en el lado del host.

### Pendiente para mañana
- Probar con cable Ethernet en la PC host (o guest) para descartar WiFi.
- Si persiste con cable, probablemente sea un bug de RetroArch netplay en modo host.
- Explorar opciones de RetroArch directamente en el menú de Configuración > Red.
