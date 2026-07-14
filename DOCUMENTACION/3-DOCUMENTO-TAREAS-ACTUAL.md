# 🚀 HOJA DE RUTA DETALLADA: FUTURAS MEJORAS (EMU LATAM)

Este documento contiene el plan de acción paso a paso para implementar las mejoras planificadas. Sirve como un checklist estricto para las próximas sesiones de desarrollo.

## ✅ COMPLETADO — Fase 1: Automatización y Experiencia (Local)

El objetivo de esta fase es hacer que la experiencia del usuario sea "un solo clic", ocultando la complejidad del servidor de fondo.

### 1.1. Auto-Lanzamiento de Nakama (Modo Invisible)
- [x] **Investigación & Código:** Modificar `client/src/main/index.ts` usando `child_process.spawn('nakama.exe', ...)` con `windowsHide: true`.
- [x] **⚙️ TEST:** Script JS headless + tasklist. **(EXITOSO - PID 8700)**.
- [x] **Chequeo de Salud:** GET a `127.0.0.1:7350`. No duplicar Nakama.
- [x] **⚙️ TEST:** Dos instancias, segunda detecta Nakama activo. **(EXITOSO)**.
- [x] **Gestión de Cierre:** `window-all-closed` → `process.kill()` a Nakama.
- [x] **⚙️ TEST:** Cierre automático 5s, verificar memoria limpia. **(EXITOSO)**.

### 1.2. Gestión Automática de IP/Túnel (Bypass Manual)
- [x] **Integración de Bore:** Host lanza `bore local 55435 --to bore.pub` (ahora `local 55436`), extrae puerto con Regex.
- [x] **⚙️ TEST:** `test_bore_parser.js` simula stdout. **(EXITOSO - URL bore.pub:12828)**.
- [x] **Actualización Automática a la Nube:** Guardar `bore.pub:XXXX` en Storage de Nakama.
- [x] **⚙️ TEST:** curl a Nakama API, verificar cadena válida. **(EXITOSO)**.
- [x] **🐛 Fix: `--port` ignorado por RetroArch:** Proxy TCP local en `index.ts`.
- [x] **🐛 Fix: `--port` también ignorado en HOST mode:** Forwarder TCP 55436 → LAN IP:55435.
- [x] **🐛 Fix: Proxy y forwarder comparten cleanup:** Arrays separados (`proxyServers` vs `forwarderServers`).
- [x] **🐛 Fix: Forwarder conecta a proxy en vez de host RA:** Forwarder usa `getLanIp()` en vez de `127.0.0.1`.
- [x] **✅ Verificación:** HOST DIRECTO funcional. BORE manual funcional (conexión netplay exitosa).

### 1.3. Configuración Anti-Lag
- [x] Config `netplay_optimized.cfg` con run-ahead, frame delay, hard sync.
- [x] `netplay_check_frames = "3"`, `netplay_input_latency_frames_range = "3"` para tolerancia a latencia de túneles.

### 1.4. Tests de Flujos Blindados
- [x] **`test_stable_flows.js`** con 35 tests: regex, spawn args, proxy TCP, forwarder, cleanup separado, puertos, archivos, bore command.
- [x] **Script npm:** `npm run test:stable`
- [x] **Cobertura:** Directo host/guest, bore host/guest, proxy reenvío, forwarder reenvío, separación cleanup.

---

## 🛠️ NOTA TÉCNICA: PC SECUNDARIA (MAURICIO)
- **Puerto Postgres:** 5433.
- **Acción:** Asegurar que `backend/local.yml` apunte a `127.0.0.1:5433`.

---

## 🚧 Fase 2: Infraestructura Central (Nube / VPS)

### 2.1. Preparación del VPS (Ubuntu/Debian)
- [ ] **Acceso y Despliegue Nakama:** Docker/Compose, puertos `7350`/`7351`.
- [ ] **⚙️ TEST:** curl a `http://IP_VPS:7350` → 200 OK.
- [ ] **⚙️ TEST:** Cliente Node.js login de test en VPS.

### 2.2. Servidor Tunnel Propio (Bore Server)
- [ ] **Bore VPS Backend:** `bore server` en VPS.
- [ ] **⚙️ TEST:** `bore local 55435 --to IP_VPS` + Test-NetConnection.
- [ ] **Integración en BD App:** Endpoint principal en VPS.

### 2.3. Retos (Challenges) vía Nakama
- [ ] **Flujo de reto funcional:** Host crea bore + forwarder, guest recibe URL por Nakama.
- [ ] **Handlers:** `start-relay-tunnel-v2`, `kill-retroarch`.
- [ ] **IPC separado:** No modifica flujos manuales blindados.
- [ ] **⚙️ TEST:** Verificar que host y guest RA se conectan sin matar procesos del otro.

### 2.4. UX Pulido
- [x] **Copiar IP con 1 click:** IP clickeable en SALA CREADA, feedback "✅ COPIADO!" + timeout 2s.
- [x] **Firewall automático:** Al crear sala se intenta abrir puerto 7350 para Tailscale via `netsh advfirewall`.
- [x] **Health check automático:** Cada 15s se verifica conectividad al peer remoto, con advertencia ⚠ si no responde.
- [x] **Auto-refresh IP Tailscale:** Cada 30s se actualiza la IP mostrada si Tailscale la reasignó.
- [ ] **Sistema de Notificaciones:** Toast en renderer al recibir reto.
- [ ] **Progreso visual:** Spinners durante conexiones.
- [ ] **Prevención de clicks:** Deshabilitar botones hasta servicios listos.

---

## ✅ COMPLETADO — Fase 3: Relay MITM → Transparent Forwarder

### 3.1. Investigación MITM
- [x] **Confirmar estado de servidores MITM públicos:** Todos caídos.
- [x] **Evaluar compilación de netplay_mitm_server.c:** Código eliminado del repo RetroArch.
- [x] **Decidir implementación:** Node.js nativo en Electron.

### 3.2. Relay MITM Node.js (intento inicial)
- [x] Handshake header echo, post-header, NICK, INFO, SYNC.
- [x] Post-handshake forwarding con pendingQueue.
- [x] Salt zeroeado en header (evita diálogo de password).
- [x] MODE broadcast, INFO/NICK suppression, REQ_SAVE handling.
- [x] **Problema:** Master se desconecta ~2s después de SYNC. Relay no tiene estado de juego.

### 3.3. Transparent Forwarder (solución definitiva)
- [x] Rewrite de `mitm-relay.js`: ~681 líneas MITM → ~60 líneas pipe TCP.
- [x] Host RA usa `--host` (tiene estado real del juego).
- [x] Guest RA usa `--connect` al relay.
- [x] Relay pipea datos entre host y guest (sin lógica de protocolo).
- [x] **Conexión exitosa:** Ambas ventanas RA se conectan y se ven.
- [x] **Lección:** Un relay sin estado de juego NO puede reemplazar un host. La solución real es que RA sea el host.

### 3.4. Integración Electron
- [x] Handler `start-mitm-local` actualizado: host `--host` + waitForPort + relay forwarder.
- [x] Handler `stop-mitm-local`: taskkill retroarch + kill relay.
- [x] Handler paralelo (no toca flujos blindados AGENTS.md §14-15).
- [x] 35/35 tests estables sin regresiones.

---

---

## ✅ Fase 4: Inputs direccionales duplicados en host — RESUELTO

### Causa raíz
**Bug del rollback de RetroArch 1.19.1.** El sistema de rollback/savestate de netplay causaba un desfase de 1 frame al re-procesar inputs del guest, interpretando "releases" como "presses" adicionales.

### Síntoma original
- Guest presiona flecha una vez → personaje se mueve 2 casilleros en pantalla del host
- Guest mantiene abajo → sprite parpadea entre parado/agachado en host
- **Solo en pantalla del host.** Guest ve su personaje suave.
- Ocurre incluso en localhost (misma PC, cable ethernet, sin config custom)

### Hipótesis descartadas (todas probadas, todas fallaron)
- [x] H1: `input_poll_type_behavior = "2"` (late polling de Claude) → ❌
- [x] H2: `netplay_allow_slaves = "false"` (Claude) → ❌
- [x] H3: Conflicto merge check_frames cfg vs appendconfig (Claude) → ❌ ya estaba homogéneo
- [x] H4: Conflicto dinput vs xinput (Claude) → ❌
- [x] H5: `fbneo-socd = "3"` (Claude) → ❌
- [x] Nuclear: `--config` standalone en vez de `--appendconfig` (Claude) → ❌
- [x] Sin ningún config custom → ❌ (persiste en RetroArch puro)

### ✅ Solución (Gemini, teoría del desfase de 1 frame en rollback)
```ini
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "0"
netplay_check_frames = "0"
```

### Resultados
- **Localhost (misma PC):** ✅ Perfecto. Sin temblequeo, sin doble-input.
- **Cross-PC via Tailscale (WiFi):** ✅ **Jugable y estable.**
  - Temblequeo/hold intermitente: ELIMINADO
  - Guest juega sin problemas de input
  - Sin saltos ni stuttering severo
  - ⚠️ Mínimo doble-pulso visual en host al hacer tap (solo visual, no afecta gameplay)

### Retoques postergables
- [ ] Probar `latency_min = "2"` para eliminar doble-pulso visual residual
- [ ] Probar RetroArch 1.18.0/1.16.0 para ver si tienen netplay nativo mejor
- [ ] Test con otro core (Snes9x) para aislar si es específico de FBNeo

---

*(Al concluir cada fase, el asistente correrá los 'TEST AUTOMÁTICO' indicados y documentará los resultados)*
