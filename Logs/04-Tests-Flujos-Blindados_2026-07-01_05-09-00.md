# Log 04: Tests automatizados para flujos blindados

**Fecha:** 2026-07-01 05:09
**Objetivo:** Crear tests automatizados que verifiquen que los flujos blindados (HOST DIRECTO, HOST BORE manual,
JOIN GAME) siguen funcionando tras modificaciones.

## Archivo creado

- `client/test_stable_flows.js` — 31 tests unitarios de componentes clave.

## Tests incluidos

| Categoría | Cantidad | Qué verifica |
|-----------|----------|-------------|
| Regex (original V1) | 2 | `listening at (bore\.pub:\d+)` captura bore.pub, NO captura IP |
| Regex (V2 challenge) | 3 | `listening at ([\w.-]+:\d+)` captura bore.pub, IP, hostnames |
| Spawn args — Host directo | 2 | `--host --port 55435`, sin `--connect` |
| Spawn args — Guest directo | 2 | `--connect 127.0.0.1 --port 55435`, sin `--host` |
| Spawn args — Host bore | 2 | `--host --port 55436`, sin `--connect` |
| Spawn args — Guest bore | 4 | `--connect 127.0.0.1` (proxy), sin `--host`, puerto no explícito, local sí usa `--port` |
| Proxy TCP | 1 | Proxy reenvía datos, eco funciona (echo server → proxy → cliente) |
| waitForPort / waitForPortClosed | 2 | Detección de puerto abierto y cerrado |
| Archivos de configuración | 8 | Existencia de retroarch.exe, core, ROM, bore.exe, relay-server; cfg contiene run_ahead, nat_traversal, public_announce |
| Relay file | 2 | Escritura y lectura de `active_relay.txt` |
| Bore command | 2 | Sintaxis V1 (`bore.pub`) y V2 (`IP`) |

## Agregado a package.json

```json
"test:stable": "node test_stable_flows.js"
```

## Resultado

31/31 tests pasan ✅

## Uso

```powershell
cd client
npm run test:stable
```
