# Análisis: Notificaciones, Utilidades Compartidas y Seguridad IPC

## Análisis del dominio

### Estado actual de feedback al usuario
- **ErrorBanner** (módulo 15): muestra errores del main process, barra superior, auto-dismiss 5s
- **No hay toasts**: acciones exitosas o informativas no tienen confirmación visual
- **alert()** nativo: se usa en algunos lugares, UX pobre, bloqueante

### Estado actual de los canales IPC
- `index.ts` usa strings literales: `"launch-game"`, `"start-relay-tunnel"`, etc.
- `preload/index.ts` tiene un `invoke(channel, data)` genérico sin validación
- Cualquier canal puede ser invocado desde el renderer

### Estado actual de helpers de red
- `waitForPort()` existe en `index.ts` (línea 93)
- No hay `assertPortFree()` ni `isPortInUse()` como funciones exportables

### Estado actual de relay config
- Se guarda en `relay-server/active_relay.txt` (archivo plano)
- No hay versión en `userData` (se pierde si se re-instala la app)

## Alternativas evaluadas

| Alternativa | Toast | IPC Types | Port Utils | Relay Config |
|-------------|-------|-----------|------------|--------------|
| **Minimax (elegido)** | Cola FIFO, max 3, hook useToast | Enum + whitelist + tipos | net.createServer | userData + legacy fallback |
| react-toastify | ✅ Librería externa, mucha funcionalidad | ❌ | ❌ | ❌ Sobredimensionado |
| zod/io-ts para IPC | ❌ | ✅ Schemas runtime | ❌ | ❌ Dependencia extra |
| wait-port (npm) | ❌ | ❌ | ✅ CLI helper | ❌ Dependencia extra |

## Decisiones

1. **Toast system**: Hook `useToast()` con estado local, sin dependencias externas. Cola FIFO, max 3 visibles. Auto-dismiss configurable (default 3000ms). Provider `ToastContext` envuelve la app, `ToastHost` renderiza en posición top-right.
2. **IPC Channels**: Enum `IPC_CHANNELS` con todos los canales existentes + los nuevos. Archivo `ipcChannels.ts` en `client/src/main/services/`. Sin schema runtime para mantenerlo liviano.
3. **IPC Whitelist**: En preload, antes de invocar, verificar que el canal esté en un `Set<string>`. Si no está, rechazar con error legible.
4. **Port Utils**: Archivo `portUtils.ts` con `isPortInUse()` (Promise<boolean>) y `assertPortFree()` (Promise<void>). Usa `net.createServer().listen()` y detecta `EADDRINUSE`.
5. **relayConfigStore**: Archivo `relayConfigStore.ts` con `read()`, `write()`, `clear()`. Escribe JSON en `app.getPath("userData")/emu_latam_relay.json`. Mantiene `active_relay.txt` como espejo para compatibilidad.
