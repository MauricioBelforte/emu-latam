# 04 - Código - Transparent Relay Fix (Plan Actual)

## Archivos Involucrados
- `relay-server/mitm-relay.js` — Rewrite completo: de MITM state machine a forwarder TCP (~60 líneas)
- `client/src/main/index.ts` — Handler start-mitm-local actualizado: host usa --host, relay forwarder
- `client/src/App.tsx` — Botón TEST MITM LOCAL (sin cambios en UI)

## relay-server/mitm-relay.js (nueva versión)
```javascript
const net = require("net");
const RELAY_PORT = parseInt(process.argv[2], 10) || 55435;
const TARGET_HOST = process.argv[3] || "127.0.0.1";
const TARGET_PORT = parseInt(process.argv[4], 10) || 55436;

const server = net.createServer((incoming) => {
  const target = new net.Socket();
  target.setNoDelay(true);
  incoming.setNoDelay(true);
  target.connect(TARGET_PORT, TARGET_HOST, () => {
    incoming.pipe(target);
    target.pipe(incoming);
  });
  // Manejo de errores y cierre
});
server.listen(RELAY_PORT, "0.0.0.0", ...);
```

## Handler start-mitm-local (index.ts)
```
1. taskkill /f /im retroarch.exe + kill relay previo
2. Spawn host RA: --host --port 55435
3. waitForPort(55435, 8000)
4. Spawn relay: node mitm-relay.js 55436 127.0.0.1 55435
5. Esperar 1s
6. Spawn guest RA: --connect 127.0.0.1 --port 55436
7. Ambos con --appendconfig netplay_optimized.cfg
```

## Configuración
- `retroarch/netplay_optimized.cfg` — Config anti-lag estándar (sin netplay_use_mitm_server)
- `retroarch/netplay_mitm.cfg` — Ya no se usa, mantiene `netplay_use_mitm_server = "true"` como referencia histórica
