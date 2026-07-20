# 05-Checklist — DeepSeek V4 Flash Free

## Progreso General: 0% — Plan propuesto, no implementado

---

## Fase 0 — Correcciones Críticas (Semana 1-2)

### Tipado y Eliminación de @ts-expect-error
- [ ] Crear `client/src/shared/types.ts` con interfaces ElectronAPI, LaunchGameArgs, etc.
- [ ] Crear `client/src/renderer/types/electron.d.ts` para declaración global
- [ ] Actualizar `client/src/preload/index.ts` con tipos y whitelist
- [ ] Refactorizar `AuthContext.tsx` — reemplazar `@ts-expect-error` por tipos
- [ ] Refactorizar `SocialContext.tsx` — reemplazar `@ts-expect-error` por tipos
- [ ] Refactorizar `ChallengeContext.tsx` — reemplazar `@ts-expect-error` por tipos
- [ ] Refactorizar `App.tsx` — reemplazar `(window as any)` por tipos
- [ ] Verificar que `npm run lint` pase sin errores

### Whitelist de Canales IPC
- [ ] Definir `ALLOWED_INVOKE_CHANNELS` en preload
- [ ] Definir `ALLOWED_ON_CHANNELS` en preload
- [ ] Validar que canales no autorizados devuelvan error
- [ ] Verificar que todos los canales existentes sigan funcionando

### Health Check Inteligente
- [ ] Modificar loop en `App.tsx` para detenerse cuando `isAuthenticated = true`
- [ ] Reanudar loop cuando socket Nakama se desconecte
- [ ] Verificar reducción de tráfico de red (menos fetch a localhost:7350)

### Cacheo de IPs de Red
- [ ] Implementar caché con TTL en `network-utils.ts`
- [ ] Implementar `invalidateNetworkCache()` para cambios de red
- [ ] Reemplazar llamadas directas a `getLanIp()` / `getTailscaleIp()` en handlers

---

## Fase 1 — Refactor Arquitectura (Semana 2-4)

### Extraer Constantes
- [ ] Crear `client/src/main/config.ts`
- [ ] Mover puertos (`55435`, `55436`, `7350`) a constantes
- [ ] Mover rutas de ejecutables a constantes
- [ ] Mover timeouts a constantes
- [ ] Reemplazar valores hardcodeados en index.ts y otros archivos

### Módulo de Logging
- [ ] Extraer lógica de logging de `index.ts` a `client/src/main/logging.ts`
- [ ] Mover `rotateLogIfNeeded()`, `logStream`, intercepción de console
- [ ] Verificar que logs sigan escribiendo a `Logs/main_process.log`
- [ ] Verificar rotación automática a 500KB

### Módulo de Utilidades de Red
- [ ] Crear `client/src/main/network-utils.ts`
- [ ] Mover `getLanIp()`, `getTailscaleIp()`, `waitForPort()`, `isPortAvailable()`
- [ ] Implementar caché con TTL de 30 segundos
- [ ] Verificar que handlers IPC sigan funcionando

### Módulo Proxy/Forwarder TCP
- [ ] Crear `client/src/main/tcp-proxy.ts`
- [ ] Mover `startProxy()`, `stopProxy()`, `startPortForwarder()`, `stopPortForwarder()`
- [ ] Mover arrays `proxyServers[]`, `forwarderServers[]`
- [ ] Verificar limpieza independiente (host cleanup ≠ guest cleanup)

### Módulo Process Manager
- [ ] Crear `client/src/main/process-manager.ts`
- [ ] Mover `launchNakama()`, `launchRetroArch()`, `launchBore()`
- [ ] Mover `killRetroArch()`, `killBore()`
- [ ] Sanitizar comandos shell (escapar argumentos)
- [ ] Verificar spawns en Windows

### Módulo IPC Handlers
- [ ] Crear `client/src/main/ipc-handlers.ts`
- [ ] Mover los 10 handlers IPC
- [ ] Implementar `registerHandlers()` que `ipcMain.handle()` para cada canal
- [ ] Verificar que cada handler mantenga su funcionalidad original

### index.ts como Orquestador
- [ ] Reducir `index.ts` a ~50 líneas
- [ ] Importar `initLogging()`, `registerHandlers()`, `launchNakama()`, `createWindow()`
- [ ] Verificar que la app inicie sin errores
- [ ] Verificar `npm run dev` funciona correctamente

### Limpiar Archivos Duplicados
- [ ] Evaluar diferencias entre `client/src/preload/index.ts` y `client/electron/preload.ts`
- [ ] Si son idénticos: eliminar `client/electron/preload.ts`
- [ ] Si difieren: consolidar funcionalidad en `client/src/preload/index.ts`

---

## Fase 2 — UX y Calidad (Semana 3-4)

### Sistema de Notificaciones Toast
- [ ] Crear `client/src/renderer/hooks/useToast.ts`
- [ ] Crear `ToastContainer.tsx` con portal
- [ ] Crear `Toast.tsx` con tipos success/error/info/warning
- [ ] Integrar en `App.tsx` (renderizar contenedor)
- [ ] Agregar toasts en operaciones clave (reto recibido, conexión exitosa, error)
- [ ] Verificar auto-dismiss y animaciones

### Spinners y Loaders
- [ ] Crear `LoadingSpinner.tsx` con props: size, text, overlay
- [ ] Integrar en botones de host/join durante operaciones de red
- [ ] Reemplazar `<p>{statusText}</p>` por componente visual dedicado

### Lazy Loading
- [ ] Implementar `React.lazy()` para `ChallengeModal`
- [ ] Implementar `React.lazy()` para `ChatBox` (si es grande)
- [ ] Envolver con `<Suspense fallback={<LoadingSpinner />}>`
- [ ] Verificar que no haya regresiones visuales

### Externalizar Secrets de Nakama
- [ ] Crear `.env` en raíz con `NAKAMA_ENCRYPTION_KEY`, `NAKAMA_SIGNING_KEY`
- [ ] Modificar `backend/local.yml` para leer de variables de entorno
- [ ] Actualizar `config.ts` para leer de `process.env`
- [ ] Agregar `.env` a `.gitignore`
- [ ] Documentar setup para nuevos desarrolladores

---

## Fase 3 — Infraestructura Cloud (Semana 5-8)

### Dockerizar Nakama
- [ ] Crear `backend/Dockerfile` para Nakama
- [ ] Crear `backend/docker-compose.yml` (Nakama + PostgreSQL)
- [ ] Verificar que Nakama funcione en Docker localmente
- [ ] Configurar volúmenes para persistencia de datos

### Servidor Bore Propio
- [ ] Buscar/binario oficial de bore server (Go)
- [ ] Crear `backend/bore-server/docker-compose.yml`
- [ ] Configurar para aceptar conexiones entrantes
- [ ] Verificar túnel funcional desde cliente

### Despliegue en VPS
- [ ] Adquirir VPS (DigitalOcean, Hetzner, etc.)
- [ ] Instalar Docker + Docker Compose
- [ ] Configurar nginx como reverse proxy
- [ ] SSL con Let's Encrypt
- [ ] Script de deploy automatizado (`deploy.sh`)
- [ ] Verificar conexión desde instancia local a VPS

### CI/CD con GitHub Actions
- [ ] Crear `.github/workflows/ci.yml`
- [ ] Jobs: lint → test → build (3 jobs paralelos)
- [ ] Release job condicional (solo en tags)
- [ ] Integrar electron-builder para Windows .exe
- [ ] Verificar que el workflow corra correctamente

---

## Fase 4 — Features Avanzadas (Semana 8+)

### Retos (Challenges) — Completar Flujo
- [ ] Verificar handler `start-relay-tunnel-v2` con pruebas reales
- [ ] Host: crear bore + forwarder, enviar URL por Nakama storage
- [ ] Guest: recibir URL, spawn RetroArch con proxy
- [ ] Verificar que host y guest RA se conectan sin conflictos
- [ ] Manejo de errores: timeout, rechazo, cancelación

### Notificaciones Push
- [ ] Investigar si Nakama soporta push notifications
- [ ] Alternativa: polling de Nakama storage para retos pendientes
- [ ] Implementar badge/indicador visual de retos no leídos

### Matchmaking por Skill
- [ ] Investigar API de matchmaker de Nakama
- [ ] Implementar cola de matchmaking con skill estimation
- [ ] UI: botón "Buscar partida" con tiempo de espera

### Múltiples ROMs/Juegos
- [ ] Diseñar selector de juego en UI
- [ ] Configurar mapeo de ROMs por juego
- [ ] Verificar compatibilidad de netplay con otros juegos

### Grabación y Replay
- [ ] Configurar RetroArch para grabar partidas
- [ ] Almacenar replays localmente
- [ ] UI para ver replays grabados

---

## Métricas de Éxito

| Métrica | Estado Actual | Objetivo |
|---------|-------------|----------|
| Líneas en `index.ts` | 610+ | < 60 |
| `@ts-expect-error` en renderer | 6+ | 0 |
| `(window as any)` en renderer | 5+ | 0 |
| Tests totales | 35 | 50+ |
| Cobertura de tests | Solo integración | Unitaria + Integración |
| Health check freq | Cada 1s (permanente) | Solo cuando no autenticado |
| Notificaciones UX | Ninguna | Sistema completo toast |
| CI/CD | Ninguno | Lint → Test → Build → Release |
| Despliegue Cloud | Ninguno | VPS Nakama + Bore |

---

## Observaciones Adicionales

- Este plan es **independiente** de cualquier otro plan de mejoras (nemotron, etc.)
- Las prioridades pueden ajustarse según necesidades del negocio
- Los flujos blindados (host directo, host bore manual, join directo) NO deben modificarse
- Cualquier cambio debe seguir el principio Documentation-first (AGENTS.md §13)
- Los tiempos son estimados; pueden ajustarse según disponibilidad
