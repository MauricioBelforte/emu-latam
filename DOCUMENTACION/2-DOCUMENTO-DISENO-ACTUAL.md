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

## Cleanup de Servidores
- `proxyServers[]`: Se limpia cuando el GUEST RA cierra (`stopAllProxies()`)
- `forwarderServers[]`: Se limpia cuando el HOST RA cierra (`stopAllForwarders()`)
- Arrays independientes para evitar que el cierre del guest mate el forwarder del host.
