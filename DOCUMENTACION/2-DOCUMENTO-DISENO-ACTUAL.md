# Diseño Detallado - Emu Latam

## Arquitectura de Procesos
1. **Main Process (Electron):**
   - `client/src/main/index.ts` gestiona `child_process.spawn` para Nakama, Bore y RetroArch.
   - Provee funciones de IPC para que React interactúe.
   - Contiene: proxy TCP, forwarder TCP, waitForPort, resolución DNS, manejo de logs.
   - Arrays de servidores separados: `proxyServers` (guest), `forwarderServers` (host).
2. **Renderer Process (React):**
   - Interfaz de usuario donde el Host crea sala y el Guest se une.
   - ChallengeContext para flujo de retos vía Nakama.
3. **Servicios Externos:**
   - `backend/nakama.exe`: Backend local en modo headless.
   - `bore.exe`: Túnel `bore local 55436 --to bore.pub`.
   - `retroarch/retroarch.exe`: Netplay Host o Guest.

## Flujos de Conexión

### HOST DIRECTO (sin bore)
```
Host RA: --host --port 55435 (escucha en 0.0.0.0:55435)
Guest RA: --connect 127.0.0.1 --port 55435
Conexión directa local, sin proxy ni túnel.
```

### HOST GAME (BORE) manual
```
Host RA: --host --port 55435 (escucha en 0.0.0.0:55435)
Forwarder: escucha en 127.0.0.1:55436, reenvía a LAN_IP:55435 (host RA)
bore: local 55436 --to bore.pub (túnel público)
Guest proxy: escucha en 127.0.0.1:55435, reenvía a bore.pub:XXXXX
Guest RA: --connect 127.0.0.1 (conecta al proxy)

Flujo: Guest RA → proxy:55435 → bore.pub → bore → forwarder:55436 → LAN_IP:55435 → Host RA
```

### Flujo de Reto (Challenge, en desarrollo)
```
IPC handler separado: start-relay-tunnel-v2
Usa resolución IPv4 de bore.pub + regex amplio para capturar URL
Kill de retroarch separado del flujo manual
```

### TEST MITM LOCAL (forwarder transparente)
```
IPC handler: start-mitm-local / stop-mitm-local (desde App.tsx)
Node.js forwarder: relay-server/mitm-relay.js (~60 líneas, pipe TCP)
Config: retroarch/netplay_optimized.cfg

Relay escucha en puerto 55436, forwardea a 127.0.0.1:55435
Host RA: --host --port 55435 --appendconfig netplay_optimized.cfg
Guest RA: --connect 127.0.0.1 --port 55436 --appendconfig netplay_optimized.cfg

Flujo: Host RA:55435 ← pipe ← relay:55436 ← pipe ← Guest RA:55436
       RA maneja TODO el protocolo netplay (handshake, REQ_SAVE, LOAD_SAVE, frame sync)
```

### TAILSCALE (paralelo, no toca flujos blindados)
```
Host RA: --host --port 55435 --appendconfig netplay_optimized.cfg
Guest RA: --connect <IP> --port 55435 --appendconfig netplay_optimized.cfg
```
- **IP:** Auto-detecta IP Tailscale (100.x.x.x) o fallback a 127.0.0.1 para test local.
- **Guest** permite ingresar IP manual en campo de texto (sirve para IP LAN real).
- **Handlers:** `tailscale-host`, `tailscale-guest`, `stop-tailscale` (paralelos, no modifican flujos blindados).
- **Auth:** `loginGhost()` con fallback local si Nakama no está disponible.
- **Limpiieza:** `before-quit` mata RA. `stop-tailscale` también.

### P2P Propio (hole punching + broadcast)
```
Broadcast UDP (host→LAN): puerto 48888, payload "emu_p2p_sala|{IP}|{puerto}", cada 2s
Auto-descubrimiento (guest): escucha 4s, si hay sala en LAN conecta automático
Fallback WAN: input manual de IP (sin Tailscale)

Hole punching:
  Guest → STUN → candidate → Nakama Storage → host lee candidate
  Host → STUN → candidate → Nakama Storage → guest lee candidate
  Ambos intentan PUNCH simultáneo con backoff exponencial

Relay fallback: host levanta forwarder TCP en puerto+1, guest conecta vía relay
Modo LAN (misma subred): salta forwarder, conecta directo a hostLanIp:55435
```

### Flujo de Reto P2P (Challenge)
```
1. Retador presiona RETAR → se abre MethodPicker
2. Retador selecciona "P2P Automático" → llama `p2p-host` (host RA + broadcast)
3. Retado acepta → llama `p2p-guest` con `hostCandidate` del retador
4. Host escribe `connection_confirmed` en Nakama Storage
5. Guest espera confirmación (polling 1s, timeout 15s) → lanza RetroArch
6. Si LAN: conecta directo. Si WAN: forwarder/proxy según corresponda
```

### P2P — getLanIp() (index.ts:286)
- Busca primera IP IPv4 no-interna que NO empiece con `100.` (Tailscale)
- Prioriza IPs LAN reales: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
- Si solo hay IP Tailscale, la usa como fallback
- Usado por: discovery.ts (broadcast), startPortForwarder (forwarder target)

## Arquitectura de Botones (3 niveles, NO agregar botones externos)

La UI de conexión tiene 3 niveles. Los 6 botones del nivel 1 son el único filtro de entrada. Cualquier nueva funcionalidad debe integrarse DENTRO de ellos.

### Nivel 1 — 6 botones de entrada (primer filtro)
Visibles cuando no hay sesión activa:
1. **INSERT COIN** → login ghost
2. **HOST DIRECTO (sin bore)** → RetroArch host directo
3. **JOIN DIRECTO** → RetroArch guest, input IP manual
4. **SALA TAILSCALE** → CREAR SALA / UNIRSE
5. **SALA P2P (SIN TERCEROS)** → P2P propio (broadcast LAN + WAN manual + Nakama)
6. **CONEXIÓN VÍA P2P** → Bootstrap público (verde)

### Nivel 2 — Toggle RetroArch (dentro del flujo)
Si la conexión lo requiere, toggle para elegir engine.

### Nivel 3 — Sistema de Retos
ChallengeModal muestra el método (Tailscale, P2P, etc.) y maneja la conexión.

### Regla
No crear nuevos botones en nivel 1. Integrar dentro de los 6 existentes.

### Orden Actual (26-Jul-2026)
1. **SALA TAILSCALE** (primero, recomendado)
2. **CONEXIÓN VÍA P2P** (verde, bootstrap — segundo)
3. **SALA P2P (SIN TERCEROS)** (fucsia, experimental — al fondo)

## UPnP + Windows Firewall
### UPnP (`client/src/main/services/upnp.ts`)
- `tryMapPort(port, protocol, desc, ttl, localIp?, privatePort?)` → mapping en router
- `tryUnmapPort(port, protocol)` → remove mapping
- `cleanupAllMappings()` → cleanup general
- **Importante:** El router puede aceptar el mapping pero no aplicarlo

### Windows Firewall (`client/src/main/p2pBridge.ts`)
- `tryOpenWindowsFirewall(port, protocol, name)` → `netsh advfirewall firewall add rule ...`
- Requiere admin. Si falla, se ignora (try/catch).

## Bug corregido: waitForRelayAck (26-Jul-2026)
En `p2p-module/src/P2PManager.ts:382`. `waitForRelayAck()` escuchaba `transport.on('message', handler)` pero el transporte emite `'raw-message'`. El handler nunca se ejecutaba, siempre timeout. Fix: `transport.on('raw-message', handler)`.

## Cleanup de Servidores
- `proxyServers[]`: Se limpia cuando el GUEST RA cierra (`stopAllProxies()`)
- `forwarderServers[]`: Se limpia cuando el HOST RA cierra (`stopAllForwarders()`)
- Arrays independientes para evitar que el cierre del guest mate el forwarder del host.
