# 02 - Análisis - Plan de Mejoras (minimax-m3)

## Dominio del problema

Emu Latam es un orquestador de netplay con tres dominios superpuestos:

1. **Procesos del sistema (Electron main):** spawn de `nakama.exe`, `bore.exe`, `retroarch.exe`, `node mitm-relay.js`.
2. **Red local/remota:** proxy TCP, forwarder TCP, túnel bore, optional Tailscale.
3. **UI reactiva:** React 19 con styled-components, sin gestión de estado global madurada (sólo `Context`s puntuales).

El análisis a continuación se hizo leyendo directamente los archivos clave del proyecto, no copiando conclusiones de otros modelos.

## Análisis de la base de código actual

### `client/src/main/index.ts` (≈700 líneas)

- **Fortalezas:**
  - Inyección de logs a archivo con rotación automática (líneas 11-58).
  - Health check de Nakama cada 30s con auto-restart.
  - Manejo diferenciado entre `proxyServers` y `forwarderServers` (correcto).
  - Resolver DNS a IPv4 antes de levantar proxy (necesario en algunas ISPs).
- **Problemas detectados:**
  1. **`waitForPort(55435, 8000)` es silencioso en fallo:** sólo loguea `❌ Puerto 55435 no disponible después de 8s` y continúa. El usuario en `App.tsx:handleTestGame` no recibe error; sigue como si todo estuviera bien.
  2. **Cleanup incompleto al crash:** `child.on("close", code => ...)` llama `stopAllForwarders()` / `stopAllProxies()` pero **no** mata `bore` ni `mitmRelayProcess`. Si el host cierra RetroArch, el túnel queda abierto.
  3. **`start-relay-tunnel` y `start-relay-tunnel-v2` son casi idénticos:** 50 líneas duplicadas. Es deuda técnica clara.
  4. **No hay un mapa de procesos hijos:** si en el futuro hay 5 procesos, no hay forma de listarlos/terminarlos todos de forma centralizada.
  5. **`mitmRunning` es un boolean sin lock real:** dos clicks concurrentes pueden entrar a `start-mitm-local` antes de que se setee la flag. `App.tsx` ya tiene `loading.mitm` que lo mitiga, pero la defensa en profundidad falta.
  6. **`save-relay-url` y `get-relay-url` escriben en `relay-server/active_relay.txt`:** ruta que dentro del EXE vive en `extraResources/relay-server/...` (lectura OK, escritura podría ser bloqueada por permisos en algunos escenarios). RF-07.
  7. **Ausencia de tipado de canales IPC:** el preload expone un `invoke(channel: string, data?: any)` sin whitelist. Cualquier string llega al main. Riesgo de typos silenciosos.

### `client/src/App.tsx` (≈400 líneas)

- **Fortalezas:** Estados separados para `loading.bore / mitm / tsHost / tsJoin / directJoin`, timeouts y aborts claros.
- **Problemas detectados:**
  1. **Mezcla de responsabilidades:** `App.tsx` contiene 5+ handlers grandes (`handleTestGame`, `handleDirectHost`, `handleDirectJoin`, `handleTailscaleHost`, `handleTailscaleGuest`). Cada uno debería ser un hook o un componente con su propio estado.
  2. **`handleSaveNakamaServer` usa `alert()`:** rompe la inmersión de la UI estilo arcade. Debe ser un toast/inline message.
  3. **`handleInsertCoin` siempre crea un `username` nuevo si no hay Nakama:** no preserva identidad entre sesiones. RF de UX secundario.
  4. **Polling con `while (active) { ... await sleep(3000) }`:** correcto pero el componente no expone forma de forzar refresh manual.

### `client/src/preload/index.ts`

- **Problema crítico:** expone `ipcRenderer.invoke` y `ipcRenderer.on` sin restricción. Un componente malicioso (XSS vía RCE improbable, pero) podría escuchar cualquier canal. Debe haber una **whitelist** de canales.

### `client/src/context/`

- `AuthContext`, `ChallengeContext`, `SocialContext` — bien diseñados.
- **Falta:** un `ProcessContext` o `HostingContext` que centralice el estado de los procesos hijos (Nakama, bore, RetroArch) para que múltiples componentes puedan mostrar el estado.

### `client/src/lib/nakama.ts`

- Bien estructurado, usa singleton con `connectionPromise` para evitar race conditions. **Es el patrón a replicar en otros servicios.**

### `relay-server/mitm-relay.js`

- No lo inspeccioné en detalle en este análisis, pero su existencia está confirmada.

## Alternativas evaluadas

### A. Reemplazar el polling de Nakama por una conexión WebSocket
- **Pro:** Estado reactivo en tiempo real.
- **Contra:** Mayor cambio, riesgo de romper suite de tests. Nakama ya provee eventos por socket, pero el health check actual es independiente de la app y útil para diagnóstico.

### B. Mover toda la lógica de proceso a un servicio singleton `ProcessManager`
- **Pro:** Centraliza cleanup, logging, listado.
- **Contra:** Refactor mediano. Mejor hacerlo incremental: empezar con un módulo `processRegistry.ts` que sólo registre y permita listar/cleanup.

### C. Tipar canales IPC con TypeScript union types
- **Pro:** Autocompletado, errores en compile time.
- **Contra:** Requiere mover tipos al preload (posible con `exposeInMainWorld` tipado vía `global.d.ts`).

### D. Reemplazar `alert()` por toasts
- **Pro:** UX consistente.
- **Contra:** Toca CSS/theme; requiere decisión de librería (¿`react-hot-toast`? ¿custom?). Mejor: implementación custom mínima con styled-components ya disponibles.

## Decisiones tomadas

| Decisión | Justificación |
|----------|---------------|
| Crear `client/src/main/services/processRegistry.ts` | Resuelve RF-03, RF-10 y el problema #4 de `index.ts`. |
| Crear `client/src/main/services/ipcChannels.ts` con union types | Resuelve RF-04 y el problema crítico del preload. |
| Crear `client/src/renderer/hooks/useToast.ts` y un `<ToastHost />` | Resuelve el problema de `alert()`. |
| Crear un único `start-relay-tunnel-core` y deprecar v1/v2 | Reduce duplicación. Mantiene `start-relay-tunnel` como wrapper para no romper la regla 15. |
| No tocar handlers de `launch-game` | Cumple regla 15. |
| Preservar escritura en `active_relay.txt` pero añadir fallback a `app.getPath("userData")` | Cumple RF-07 sin romper flujos actuales. |

## Riesgos identificados

- **R1:** Refactor del preload podría romper la suite de tests. Mitigación: agregar tests que cubran el whitelist antes del cambio.
- **R2:** El `ProcessRegistry` debe ser inicializado en `app.whenReady()` antes de cualquier IPC handler. Orden importa.
- **R3:** Almacenar la config de relay en `userData` introduce una segunda fuente de verdad. Mitigación: helper que lee userData primero y fallback al archivo legacy.
