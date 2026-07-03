# Log 05: Arquitectura final bore — forwarder TCP + LAN IP

**Fecha:** 2026-07-01 06:38
**Objetivo:** Arreglar el flujo bore manual definitivamente y blindar los tests.

## Problemas encontrados y soluciones

### 1. `--port` ignorado en MODO HOST también
RetroArch ignora `--port` tanto en cliente como en host. La solución de usar `--host --port 55436` no funciona — el host siempre escucha en 55435.

**Solución:** Forwarder TCP que escucha en 127.0.0.1:55436 y reenvía al host RA en 55435 vía LAN IP.

### 2. Forwarder conectaba al proxy en vez del host RA
En la misma PC, forwarder (conectando a 127.0.0.1:55435) caía en el proxy (127.0.0.1:55435) en vez del host RA (0.0.0.0:55435), creando un loop TCP.

**Solución:** `getLanIp()` obtiene la IP LAN (ej: 192.168.x.x). Forwarder conecta a `LAN_IP:55435` que resuelve al host RA directamente.

### 3. Proxy y forwarder compartían cleanup
`stopAllProxies()` mataba tanto proxies como forwarders, rompiendo el host cuando el guest se desconectaba.

**Solución:** Arrays separados `proxyServers[]` y `forwarderServers[]`. Cada RA limpia solo los suyos al cerrar.

### 4. Green screen → disconnect por latencia
El netplay se conectaba pero se caía a los segundos. La latencia extra del túnel bore causaba timeouts.

**Solución:** Config más tolerante: `netplay_check_frames = "3"`, `netplay_input_latency_frames_range = "3"`.

## Arquitectura final bore
```
[Guest RA] → --connect 127.0.0.1 → proxy:55435 (127.0.0.1) → bore.pub:XXXXX
→ bore tunnel → forwarder:55436 (127.0.0.1) → LAN_IP:55435 → [Host RA:55435]
```

## Tests actualizados
- `test_stable_flows.js`: 35 tests (antes 31)
- Agregados: test de forwarder, test de cleanup separado, validación de valores del config
- `npm run test:stable` para ejecutar

## Documentación actualizada
- `DOCUMENTACION/1-*-ACTUAL.md` — Puerto architecture table
- `DOCUMENTACION/2-*-ACTUAL.md` — Diseño detallado con diagramas de flujo
- `DOCUMENTACION/3-*-ACTUAL.md` — Task checklist con tareas completadas
- `DOCUMENTACION/4-*-ACTUAL.md` — Código de ejecución con arquitectura completa
- `AGENTS.md` §15 — Tabla actualizada con args RA y diagrama de flujo
