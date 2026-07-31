# Log 66 — Sala Pública WAN: Conclusión bloqueo carrier (31-Jul-2026)

## Resumen
Se confirmó de forma definitiva que **Personal Argentina bloquea tráfico TCP a puertos no estándar desde datos del celular**. bore.pub no puede funcionar desde datos del celu porque solo ofrece puertos aleatorios/altos. Se cierra esta línea de investigación y se plantean 2 alternativas.

## Contexto (pruebas 26-Jul)
- **LAN (mismo WiFi)**: ✅ Funciona. PC2 conectó a sala pública, Nakama verde, usuarios visibles.
- **WAN (datos del celu)**: ❌ Falló. `Test-NetConnection bore.pub -Port 13494/30211` → `TcpTestSucceeded: False`. Carrier bloquea puertos altos.
- **Fixes aplicados esa fecha:**
  1. `handleBootstrapGuest` prioriza bore cuando hay roomCode válido (commit `d35573c`)
  2. `App.tsx` usa `result.boreUrl` en vez de override con lanIp (commit `bcb808c`)
  3. bore Nakama prueba puertos preferidos antes de aleatorio (commit `c1d90e8`)

## Pruebas 31-Jul
### Puertos preferidos (host)
```
[BOOTSTRAP] Intentando bore con puerto preferido 8080...
[BOOTSTRAP] Puerto 8080 falló: port already in use
[BOOTSTRAP] Intentando bore con puerto preferido 8888...
[BORE NAKAMA] listening at bore.pub:8888
[BOOTSTRAP] bore conectado con puerto preferido 8888: bore.pub:8888
[BOOTSTRAP] roomCode: '8888'
```
El 8080/8888/8443 están ocupados en bore.pub por otros túneles. El 9000 funcionó en un intento anterior.

### Test connectivity desde PC2
**WiFi**: `Test-NetConnection bore.pub -Port 9000` → `TcpTestSucceeded: True` ✅

**Datos del celu**: 
```
Test-NetConnection bore.pub -Port 8888
TCP connect to (159.223.110.159 : 8888) failed
TcpTestSucceeded : False
```
❌ Puerto 8888 no alcanzable desde datos del celu. También se observó en pruebas anteriores:
- "Name resolution of bore.pub failed" en algunas corridas (DNS celular inestable)
- A veces resuelve a IPv6 y el TCP falla igual

### Observación clave en terminal del host
Cuando PC2 conectó por WiFi, el host mostró:
```
[BORE NAKAMA] new connection
[BORE NAKAMA] connection exited
```
Confirma que el túnel bore funciona cuando hay ruta de red (WiFi).

## Conclusión definitiva
1. **bore.pub NO funciona desde datos del celu de Personal Argentina.** El carrier bloquea puertos no estándar y bore solo ofrece ese tipo de puertos. No vale la pena seguir probando combinaciones de puertos.
2. El código de la Sala Pública está **correcto** — funciona en LAN y en cualquier red que permita puertos altos.
3. El DNS del celular de Personal es inestable (falla resolución intermitentemente).

## Alternativas planteadas (para próxima sesión)
### Opción 1: Tailscale (probar primero, gratis)
- Tailscale usa puerto 443 como fallback (DERP relay) → NO bloqueado por carriers
- Requisitos: Tailscale instalado en AMBAS PCs, usar IP Tailscale (100.x.x.x), NO la LAN (192.168.x.x)
- El error previo "no se pudo conectar al servidor verifica la ip" fue probablemente por usar IP LAN o falta de Tailscale en PC2

### Opción 2: Relay propio en VPS con puerto 443 (definitiva)
- Levantar relay/bore server propio en VPS escuchando en 443
- Ningún carrier bloquea 443
- Requiere VPS

## Archivos involucrados
- `client/src/main/bootstrap.ts` — startNakamaBore, spawnBoreOnce, BORE_PREFERRED_PORTS
- `client/src/App.tsx` — flujo guest Sala Pública

## Próximo paso sugerido
Probar **Tailscale** desde PC2 con datos del celu: instalar Tailscale en PC2, verificar IP 100.x.x.x del host, usar el flujo Tailscale (sección morada), y confirmar conexión Nakama.
