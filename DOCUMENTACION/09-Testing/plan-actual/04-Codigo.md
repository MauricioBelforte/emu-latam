# 04 - Código - Módulo de Testing (Plan Inicial)

## Archivos involucrados

| Archivo | Rol | Líneas |
|---------|-----|--------|
| `client/test_ux_features.js` | Tests automáticos UX | ~200 |
| `client/test_stable_flows.js` | Tests flujos blindados (existente) | ~492 |
| `client/package.json` | Script `npm run test:ux` | +1 línea |

## Funciones clave en `test_ux_features.js`

### Copy IP
Se copia solo la IP (sin puerto) al portapapeles.

### `buildFirewallRule(port, ipRange)`
```js
function buildFirewallRule(port, ipRange) {
  return `netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=${port} remoteip=${ipRange}`;
}
```
**Tests:** Comando exacto, puerto variable, IP range variable, disponibilidad de netsh en sistema.

### `checkReachable(host, port, timeoutMs)`
```js
function checkReachable(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => { socket.destroy(); resolve(true); });
    socket.on("error", () => { socket.destroy(); resolve(false); });
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}
```
**Tests:** Localhost sin Nakama (false), host inexistente (false), timeout respetado (false).

### `shouldUpdateIp(newIp, currentIp)`
```js
function shouldUpdateIp(newIp, currentIp) {
  if (!newIp) return false;
  if (newIp === currentIp) return false;
  return true;
}
```
**Tests:** IP diferente (true), null (false), igual (false), vacío (false).

### `handleFirewallResult(result)` y `handleHealthCheckResult(result)`
Funciones de parseo que transforman respuestas de IPC en estados lógicos para la UI.

## Logs relacionados
- `Logs/20-Mejoras-UX-copiar-IP-firewall-automatico-health-check-2026-07-14_05-30-01.md`
