# 03 - Diseño - Módulo de Testing (Plan Inicial)

## Arquitectura

```
client/
├── test_ux_features.js     ← Tests UX (23 tests)
├── test_stable_flows.js    ← Tests flujos blindados (35 tests)
└── package.json            ← Script npm test:ux + test:stable
```

## Flujo de ejecución

```
node test_ux_features.js
  → Tests COPY IP (formato)
  → Tests FIREWALL (comando netsh + disponibilidad)
  → Tests HEALTH CHECK (TCP reachability)
  → Tests AUTO-REFRESH (lógica polling)
  → Tests INTERVALOS (frecuencias)
  → Tests IPC PARSE (respuestas handlers)
  → Resumen: X/Y passed
```

## Estructura de cada test

```
function assert(label, condition, detail):
  if condition → ✅ label
  else → ❌ label — detail

Cada sección agrupa tests por feature:
  console.log("\n📋 COPY IP — ...")
  assert("descripción", condición, detalle_opcional)
```

## Funciones auxiliares testeadas

### buildCopyIp(ip, port)
- `"100.98.148.11:7350"` — formato estándar
- `"127.0.0.1:7350"` — localhost
- `"100.98.148.11:9999"` — puerto custom
- `":7350"` — IP vacía (edge case)

### buildFirewallRule(port, ipRange)
- `netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=7350 remoteip=100.0.0.0/8`
- Puerto variable, IP range variable

### checkReachable(host, port, timeoutMs)
- TCP socket connect con timeout
- Resuelve `true` si conecta, `false` si error o timeout
- Usado para simular health check

### shouldUpdateIp(newIp, currentIp)
- `null` → false
- iguales → false
- diferentes → true
- vacío → false

### handleFirewallResult(result)
- `{ success: true }` → `{ ok: true }`
- `{ success: false }` → `{ ok: false, msg: "No admin, skipping" }`

### handleHealthCheckResult(result)
- `{ reachable: true }` → sin warning
- `{ reachable: false }` → warning
- `{ reachable: null }` → warning (defensive)
