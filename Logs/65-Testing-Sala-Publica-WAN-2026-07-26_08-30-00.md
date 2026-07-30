# Log 65 — Testing Sala Pública WAN (26-Jul-2026)

## Resumen
Se testeo la Sala Pública (botón verde) entre PC1 (WiFi Fibertel) y PC2 (datos del celu Personal Argentina). El flujo funcionó en LAN pero no en WAN por bloqueo del carrier.

## Cambios realizados
1. **Fix `handleBootstrapGuest` en `bootstrap.ts:213`**: Se agregó `!boreUrlFromRoomCode(roomCode)` a la condición `if (lanIp)`. Antes, si el guest ingresaba la IP local, saltaba el túnel bore y conectaba directo a `lanIp:7350` — roto desde WAN. Ahora prioriza bore siempre que haya un código de sala válido. (Commit `d35573c`)
2. **Fix `App.tsx:1120-1122`**: Se reemplazó `const nakamaHost = lanIp || "bore.pub"` por parseo de `result.boreUrl` como redundancia. (Commit `bcb808c`)
3. **Feat puertos preferidos bore**: `spawnBoreOnce()` acepta `preferredPort`. `startNakamaBore()` prueba secuencia `8080 → 8888 → 8443 → 9000` antes de caer a puerto aleatorio. (Commit `c1d90e8`)

## Pruebas realizadas
- **LAN (mismo WiFi)**: ✅ Exitoso. PC2 conectó a sala pública, Nakama verde, usuarios visibles.
- **WAN (datos del celu)**: ❌ Falló. `Test-NetConnection bore.pub -Port <puerto>` devolvió `TcpTestSucceeded: False` para puertos 13494 y 30211. El carrier bloquea tráfico TCP a puertos no estándar.

## Bugs conocidos
1. **Carrier bloquea bore.pub**: Personal Argentina no deja pasar tráfico TCP a puertos altos (>10000). Puede también bloquear 8080/8888/8443/9000.
2. **Tailscale desde datos del celu**: No probado. Posible solución alternativa al bloqueo de bore.
3. **No hay fallback automático**: Si Nakama no conecta vía bore, la app solo muestra alerta "no accesible". No hay intento de reconexión por otro método.

## Pendiente para mañana
- Probar con puertos preferidos (8080, 8888, 8443, 9000) — quizás el carrier los deja pasar
- Alternativa: implementar relay propio en un VPS con puerto 443 (nunca bloqueado)
- Investigar Tailscale + datos del celu como alternativa a bore
