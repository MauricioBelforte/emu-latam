# Log 19: Sesión de empaquetado, Tailscale y solución de conexión cross-PC

**Fecha:** 2026-07-14 05:30
**Participantes:** PC1 (desktop-j3ahaoe), PC2 (desktop-b9jd1t0)
**Tema principal:** Probar empaquetado del EXE, conectar dos PCs via Tailscale para Nakama + RetroArch

---

## Resumen

Se logró conectar dos PCs en redes diferentes (Argentina) usando Tailscale como VPN. Se descubrió que **el sistema de retos no funcionó** en esta sesión, pero el **modo manual Tailscale (HOST + JOIN desde la UI principal)** sí funcionó correctamente. Se documentan todos los problemas encontrados y soluciones.

---

## 1. Cambios realizados en el código

### 1.1 Deshabilitar F12/DevTools en producción
- **Archivo:** `client/src/main/index.ts`
- Se agregó `isDev` check: si no hay `ELECTRON_RENDERER_URL` (producción), `devTools: false` y no se abre DevTools automáticamente.

### 1.2 Empaquetado con @electron/packager
- `electron-builder` falla en este equipo por falta de permisos para crear symlinks (winCodeSign).
- Se migró a `@electron/packager` (sucesor de `electron-packager`).
- **Script:** `client/scripts/package.js` — ejecuta `electron-vite build`, luego `@electron/packager`, luego copia `backend/`, `retroarch/`, `relay-server/` a `resources/extraResources/`.
- **Comando:** `cd client && npm run package`
- **Output:** `client/dist/Emu Latam-win32-x64/Emu Latam.exe` (~688 MB)

### 1.3 netplay_optimized.cfg
- Se ajustó a `latency_min=1`, `latency_range=0`, `check_frames=30`, `run_ahead_enabled=true`, `run_ahead_secondary_instance=true` para reducir lag sin desync.

### 1.4 Bugfix en sistema de retos (ChallengeContext.tsx)
- `acceptChallenge()` ya no setea `isLaunchingRef.current = true` (bloqueaba el handler `_conn` del guest).
- El handler `_conn` eliminó el check `isLaunchingRef`.
- El `useEffect` del listener ahora usa una ref estable con deps vacías, evitando race conditions cuando cambia `challengeStatus`.

### 1.5 Documentación de empaquetado
- Se agregó `AGENTS.md §19: Empaquetado del EXE (Electron)`.

---

## 2. Flujo que funcionó: Tailscale manual (HOST + JOIN)

### Requisitos
- Ambas PCs con **Tailscale instalado y logueado con la misma cuenta** (`maurycade@`).
- PC1: PostgreSQL funcionando (Nakama local).
- PC2: No necesita PostgreSQL (se conecta al Nakama de PC1).

### Pasos exactos que funcionaron

1. **PC1:**
   - Abrir Emu Latam
   - CREAR SALA → esperar que aparezca "SALA CREADA" con IP Tailscale `100.98.148.11:7350`
   - En la sección Tailscale de la UI: click **HOST TAILSCALE**
   - RetroArch se abre en modo host

2. **PC2:**
   - Abrir Emu Latam
   - UNIRSE A SALA → ingresar `100.98.148.11:7350` → CONECTAR
   - Esperar que aparezca "CONECTADO A SALA"
   - En la sección Tailscale: pegar la IP del host (`100.98.148.11`) en el campo
   - Click **JOIN TAILSCALE**
   - RetroArch se abre en modo guest

3. **Juego:**
   - Ambos ven la pantalla de KOF '98
   - Se sintió fluido con `run_ahead=1`, `latency_min=1`

---

## 3. Problemas encontrados y soluciones

### 3.1 La IP de Tailscale cambió
- **Síntoma:** PC2 no conectaba a `100.107.225.24`.
- **Causa:** PC1 había reconectado Tailscale y obtuvo `100.98.148.11`.
- **Solución:** Verificar la IP actual con `tailscale status` en PC1 y pasarla a PC2.

### 3.2 Tailscale ping timeout
- **Síntoma:** `tailscale ping 100.91.174.4` desde PC1 daba timeout.
- **Causa:** Las PCs no tenían conexión activa; posiblemente porque una estaba en estado idle.
- **Solución:** Se ejecutó `tailscale logout` (no recomendado) seguido de `tailscale login` para reconectar. Una forma más segura es `net stop Tailscale; net start Tailscale` en ambas PCs.

### 3.3 Windows Firewall bloqueaba puerto 7350
- **Síntoma:** PC2 no podía hacer HTTP a `http://100.98.148.11:7350`.
- **Causa:** Firewall de Windows en PC1 bloqueaba conexiones entrantes al puerto 7350 incluso en el adaptador Tailscale.
- **Solución:** Se creó regla de firewall con `netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=7350 remoteip=100.0.0.0/8`.
- **Nota:** La regla genérica `Nakama 7350` sin `remoteip` no fue suficiente.

### 3.4 Test-NetConnection en PC2 usaba interfaz incorrecta
- **Síntoma:** `Test-NetConnection` para `100.98.148.11:7350` salía por `Ethernet 2` (IP `192.168.42.39`) en vez del adaptador Tailscale.
- **Causa:** Windows mostraba la interfaz wrong pero el tráfico realmente iba por Tailscale si las rutas estaban bien.
- **Solución:** Usar `curl.exe` en vez de `Test-NetConnection` para pruebas de conectividad TCP.

### 3.5 Sistema de retos no funcionó
- **Síntoma:** Al enviar reto desde Sidebar → elegir método Tailscale → PC2 recibía pero al aceptar no abría RetroArch.
- **Causa:** Bug de `isLaunchingRef` bloqueando el handler `_conn` en el guest (corregido).
- **Estado:** No se pudo probar la corrección porque la sesión se enfocó en el modo manual.

### 3.6 Ambos usuarios crearon sala (workaround)
- **Detalle:** Para que aparecieran ambos en el sidebar, tanto PC1 como PC2 tuvieron que hacer CREAR SALA y UNIRSE A SALA respectivamente. No se probó el caso donde solo PC1 crea sala y PC2 se une automáticamente.

### 3.7 PC2 no tiene PostgreSQL
- **Síntoma:** Nakama en PC2 no podía iniciar.
- **Causa:** Nakama requiere PostgreSQL en `localhost:5432`.
- **Solución:** PC2 no inicia Nakama local, se conecta al Nakama de PC1 via UNIRSE A SALA.

---

## 4. Lecciones aprendidas

1. **Siempre verificar la IP de Tailscale** con `tailscale status` antes de compartirla.
2. **Usar `curl.exe`** para probar conectividad, no `Test-NetConnection`.
3. **La regla de firewall** debe especificar `remoteip=100.0.0.0/8` para Tailscale.
4. **El modo manual Tailscale (HOST + JOIN buttons)** es más estable que el sistema de retos para cross-PC.
5. **Ambos deben estar en la misma cuenta Tailscale** (`maurycade@` en este caso).
6. **Reiniciar Tailscale** (`net stop/start Tailscale`) en ambas PCs si no hay conectividad.
7. **El empaquetado con `@electron/packager` funciona**, `electron-builder` no.

---

## 5. Próximos pasos

- Probar el fix del sistema de retos con Tailscale.
- Probar RetroArch 1.18.0 para ver si tiene mejor netplay.
- Agregar timeout en el estado "accepted" del modal de retos.
- Hacer build portable para compartir.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `client/src/main/index.ts` | F12 deshabilitado en producción |
| `client/package.json` | Script `package`, config `@electron/packager` |
| `client/scripts/package.js` | Nuevo: script de empaquetado |
| `retroarch/netplay_optimized.cfg` | `run_ahead`, `latency_min=1`, `check_frames=30` |
| `client/src/context/ChallengeContext.tsx` | Bugfix `isLaunchingRef`, listener estable |
| `.gitignore` | `client/dev_output.txt`, `client/dev_error.txt` |
| `AGENTS.md` | §19 Empaquetado del EXE |
