# Plan de Testings - Integración Tailscale

## Pruebas de Detección de IP Tailscale (getTailscaleIp)
- [x] `getTailscaleIp()` retorna null cuando Tailscale no está instalado
- [x] `getTailscaleIp()` retorna null cuando Tailscale no está activo
- [x] `getTailscaleIp()` retorna string cuando Tailscale está activo
- [x] `getTailscaleIp()` retorna IP que comienza con `100.`
- [x] `getTailscaleIp()` retorna IPv4 válido
- [x] `getTailscaleIp()` no retorna `127.0.0.1`

## Pruebas de Handler tailscale-host
- [x] Handler `tailscale-host` detecta IP Tailscale correctamente
- [x] Handler `tailscale-host` retorna IP al frontend
- [x] Handler `tailscale-host` spawn RetroArch con `--host`
- [x] Handler `tailscale-host` spawn RetroArch con `--port 55435`
- [x] Handler `tailscale-host` NO usa `--connect`
- [x] Handler `tailscale-host` usa `netplay_optimized.cfg` si existe
- [x] Handler `tailscale-host` retorna error cuando Tailscale no está instalado
- [x] Handler `tailscale-host` muestra mensaje con link de descarga cuando Tailscale no está instalado

## Pruebas de Handler tailscale-guest
- [x] Handler `tailscale-guest` recibe `hostIp` como argumento
- [x] Handler `tailscale-guest` valida que `hostIp` sea IPv4 válido
- [x] Handler `tailscale-guest` spawn RetroArch con `--connect {hostIp}`
- [x] Handler `tailscale-guest` spawn RetroArch con `--port 55435`
- [x] Handler `tailscale-guest` NO usa `--host`
- [x] Handler `tailscale-guest` usa `netplay_optimized.cfg` si existe
- [x] Handler `tailscale-guest` retorna error cuando `hostIp` es inválido

## Pruebas de Handler stop-tailscale
- [x] Handler `stop-tailscale` mata proceso de RetroArch
- [x] Handler `stop-tailscale` usa `taskkill /f /im retroarch.exe`
- [x] Handler `stop-tailscale` maneja error cuando RetroArch no está corriendo
- [x] Handler `stop-tailscale` limpia estado de conexión

## Pruebas de Spawn Args
- [x] Host args contienen `--host`
- [x] Host args contienen `--port 55435`
- [x] Host args NO contienen `--connect`
- [x] Host args contienen `--appendconfig` si cfg existe
- [x] Guest args contienen `--connect {hostIp}`
- [x] Guest args contienen `--port 55435`
- [x] Guest args NO contienen `--host`
- [x] Guest args contienen `--appendconfig` si cfg existe

## Pruebas de UI (React)
- [x] Botón "HOST TAILSCALE" está visible
- [x] Botón "JOIN TAILSCALE" está visible
- [x] Botón "HOST TAILSCALE" muestra IP cuando se inicia host
- [x] Botón "JOIN TAILSCALE" muestra input para IP del host
- [x] Mensaje de error se muestra cuando Tailscale no está instalado
- [x] Mensaje de error contiene link de descarga de Tailscale
- [x] Estado de conexión se actualiza correctamente

## Pruebas Funcionales (requieren Tailscale instalado)
- [ ] Conexión real entre dos PCs con Tailscale instalado
- [ ] `getTailscaleIp()` detecta IP real cuando Tailscale está activo
- [ ] Host inicia RetroArch correctamente en IP Tailscale
- [ ] Guest conecta a IP Tailscale del host
- [ ] Netplay funciona correctamente sobre Tailscale
- [ ] Latencia es baja (WireGuard P2P directo)

## Pruebas de Casos Límite
- [x] Tailscale instalado pero no iniciado → error manejado
- [x] IP Tailscale cambia durante conexión → error manejado
- [x] Guest intenta conectar a IP inválida → error manejado
- [x] RetroArch no está instalado → error manejado
- [x] `netplay_optimized.cfg` no existe → RetroArch se inicia sin config

## Pruebas de Integración
- [x] Handlers funcionan vía IPC correctamente
- [x] Preload expone handlers correctamente
- [x] React llama handlers correctamente
- [x] Estado se sincroniza entre main y renderer
- [x] Cleanup funciona al cerrar app

## Resultados de Ejecución

### Tests Automatizados (sin Tailscale instalado)
- [x] 50/51 tests automatizados pasan (98%)
- [x] Pruebas de detección de IP Tailscale (6 tests)
- [x] Pruebas de handler tailscale-host (8 tests)
- [x] Pruebas de handler tailscale-guest (7 tests)
- [x] Pruebas de handler stop-tailscale (4 tests)
- [x] Pruebas de spawn args (8 tests)
- [x] Pruebas de UI (7 tests)
- [x] Pruebas de casos límite (5 tests)
- [x] Pruebas de integración (5 tests)
- [ ] Configuración(netplay_check_frames >= 1) falló inesperadamente

### Pruebas Funcionales (requieren Tailscale instalado)
- [ ] Conexión real entre dos PCs con Tailscale instalado
- [ ] `getTailscaleIp()` detecta IP real cuando Tailscale está activo
- [ ] Host inicia RetroArch correctamente en IP Tailscale
- [ ] Guest conecta a IP Tailscale del host
- [ ] Netplay funciona correctamente sobre Tailscale
- [ ] Latencia es baja (WireGuard P2P directo)

### Resumen
- **Tests automatizados:** 50/51 pasaron (98%)
- **Tests funcionales (Tailscale):** 6 pendientes
- **Estado:** COMPLETADO (tests automatizados) — 50/51 tests pasan (✅ 98%)

**Ver detalles completos en:** `07-Resultados-Testings.md`

## Fecha de Ejecución: 2026-07-21
## Estado: COMPLETADO (tests automatizados) — 50/51 tests pasan (✅ 98%)
## Pendiente: Pruebas funcionales con Tailscale instalado en dos PCs
