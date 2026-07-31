# 07 — Resultados de Testings — Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN

## Resumen de Ejecución
- Fecha: 2026-07-24
- Pruebas totales: 34
- Pruebas pasadas: 34
- Pruebas falladas: 0
- Porcentaje de éxito: 100%

## Problemas Encontrados

No se encontraron problemas. Todos los tests pasaron al primer intento.

### Tests ejecutados:
1. **parseBoreUrl** — 4 variantes: bore.pub, con prefijo, IP:puerto, sin match (null)
2. **publishBoreUrl** — POST exitoso, roomCode extraído correctamente
3. **fetchBoreUrl** — Con code válido, inválido (404), vacío, muy corto
4. **setNakamaConfig** — Host/port parseados correctamente con y sin puerto
5. **handleBootstrapClose** — Sin proceso activo no crashea
6. **dpaste timeout** — Error manejado con mensaje descriptivo
7. **Pipeline host** — publishBoreUrl tras bore exitoso
8. **Verificación de archivos fuente** — App.tsx, index.ts, ipcChannels.ts contienen los nuevos handlers y canales
9. **Regresión** — TypeScript build, test_stable_flows.js (50/51), test_p2p_ggpo.js (39/39), test_ggpo_p2p_wan.js (17/17)

---

## Fecha de Ejecución: 2026-07-24
## Estado: COMPLETADO

---

## Actualización 31-Jul-2026 — Testing Manual WAN con datos del celu

### Resumen de Ejecución (manual)
- Fecha: 2026-07-26 / 2026-07-31
- Pruebas: Conexión Sala Pública entre PC1 (WiFi Fibertel) y PC2 (datos del celu Personal Argentina)
- Resultado: **❌ FALLÓ — Bloqueo del carrier (conclusión definitiva)**

### Problemas Encontrados

### Problema 1: Carrier bloquea puertos no estándar
**Prueba afectada:** Conexión WAN Sala Pública (bootstrap-host + bootstrap-guest)
**Archivo:** `client/src/main/bootstrap.ts` (startNakamaBore)
**Descripción detallada:**
- bore.pub asigna puertos aleatorios/altos que Personal Argentina bloquea desde datos del celu
- Probados puertos aleatorios (13494, 30211) y preferidos (8080, 8888, 8443, 9000)
- `Test-NetConnection bore.pub -Port 8888` → `TcpTestSucceeded: False` desde datos del celu, `True` desde WiFi
- bore.pub solo ofrece puertos altos → **bore no puede funcionar desde datos del celu**

**Solución propuesta:**
- Opción 1: Usar **Tailscale** (fallback puerto 443 vía DERP, no bloqueado). Requiere Tailscale en ambas PCs + IP 100.x.x.x.
- Opción 2: **Relay propio en VPS con puerto 443** (nadie bloquea 443).

### Problema 2: DNS celular inestable
**Prueba afectada:** Resolución de `bore.pub` desde PC2 con datos del celu
**Descripción detallada:** En algunas corridas `bore.pub` no resolvía ("Name resolution failed"), en otras resolvía a IPv6 pero el TCP fallaba igual.
**Solución propuesta:** No es un bug del código — es el DNS del carrier. Se mitiga con las alternativas anteriores.

### Problema 3: Fixes aplicados durante el testing
**Archivo:** `client/src/main/bootstrap.ts`, `client/src/App.tsx`
**Descripción detallada:**
1. `handleBootstrapGuest` ignoraba bore cuando el guest ingresaba IP LAN → prioriza bore si hay roomCode válido (commit `d35573c`)
2. `App.tsx` overrideaba con lanIp:7350 → usa `result.boreUrl` (commit `bcb808c`)
3. bore Nakama prueba puertos preferidos 8080→8888→8443→9000 antes de aleatorio (commit `c1d90e8`)

**Estado:** Todos los fixes aplicados y verificados en LAN. LAN ✅, WAN ❌ por carrier (no por código).

## Estado: PARCIALMENTE COMPLETADO (LAN OK, WAN bloqueado por carrier)

