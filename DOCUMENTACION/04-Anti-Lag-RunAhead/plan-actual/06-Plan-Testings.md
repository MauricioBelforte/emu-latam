# Plan de Testings - Anti-Lag-RunAhead

## Pruebas de Archivo de Configuración (netplay_optimized.cfg)
- [x] El archivo `retroarch/netplay_optimized.cfg` existe
- [x] Contiene `run_ahead_enabled`
- [x] Contiene `netplay_input_latency_frames_min`
- [x] Contiene `netplay_input_latency_frames_range`
- [x] Contiene `netplay_check_frames`
- [x] Contiene `video_frame_delay`
- [x] Contiene `video_hard_sync`
- [x] Contiene `video_hard_sync_frames`
- [x] Contiene `netplay_nat_traversal`
- [x] Contiene `netplay_public_announce`
- [x] Contiene `netplay_use_mitm_server`
- [x] Contiene `network_cmd_enable`
- [x] Contiene `input_poll_type_behavior`
- [x] `run_ahead_enabled = "false"` (desactivado por doble input)
- [x] `netplay_input_latency_frames_min = "1"`
- [x] `netplay_input_latency_frames_range = "1"`
- [x] `netplay_check_frames = "180"` (tolerante, evita doble input)
- [x] `video_frame_delay = "0"` (sin retraso)
- [x] `video_hard_sync = "false"` (desactivado)
- [x] `video_hard_sync_frames = "0"`
- [x] `netplay_nat_traversal = "false"`
- [x] `netplay_public_announce = "false"`
- [x] `netplay_use_mitm_server = "false"`
- [x] `network_cmd_enable = "false"`
- [x] `input_poll_type_behavior = "0"`
- [x] NO contiene `run_ahead_frames` como directiva activa
- [x] NO contiene `run_ahead_secondary_instance` como directiva activa
- [x] Todas las directivas tienen formato `clave = "valor"`
- [x] Al menos 12 directivas de configuración presentes

## Pruebas de --appendconfig
- [x] `--appendconfig` está presente en los args de lanzamiento
- [x] El argumento de `--appendconfig` es la ruta al `netplay_optimized.cfg`
- [x] `--appendconfig` se agrega ANTES de `--host`/`--connect`
- [x] Sin archivo cfg, `--appendconfig` NO está presente
- [ ] `--appendconfig` se agrega en handler `launch-game` (host y guest)
- [ ] `--appendconfig` se agrega en handler `start-mitm-local` (host y guest)
- [ ] `--appendconfig` se agrega en handler `tailscale-host`
- [ ] `--appendconfig` se agrega en handler `tailscale-guest`

## Pruebas de HTTP Health Check (checkNakamaHealth)
- [x] Servidor HTTP 200 → health=true
- [x] Servidor HTTP 500 → health=true (cualquier respuesta HTTP cuenta como UP)
- [x] Puerto sin servidor → health=false
- [x] Timeout (servidor que acepta pero no responde) → health=false
- [ ] Health check usa timeout de 1s

## Pruebas de Configuración de Nakama (getNakamaConfig)
- [x] Retorna un objeto con `host` y `port`
- [x] Lee correctamente desde archivo `emu_latam_nakama.json`
- [x] Sin archivo de config, retorna defaults `127.0.0.1:7350`
- [x] Archivo corrupto (JSON inválido) → retorna defaults
- [x] JSON válido con host/port → retorna valores del archivo
- [ ] JSON sin host/port → retorna objeto parseado (sin validación de estructura)

## Pruebas de Red (getLanIp)
- [x] `getLanIp` retorna un string
- [x] `getLanIp` retorna IPv4 válido (formato X.X.X.X)
- [x] `getLanIp` NO retorna `127.0.0.1` cuando hay IP real

## Pruebas de Tailscale (getTailscaleIp)
- [x] `getTailscaleIp` retorna null o string
- [x] Si retorna IP, comienza con `100.`
- [x] Si retorna IP, es IPv4 válido

## Pruebas de Validación IPv4
- [x] `127.0.0.1` es IPv4 válido
- [x] `192.168.1.1` es IPv4 válido
- [x] `10.0.0.1` es IPv4 válido
- [x] `100.85.42.13` es IPv4 válido
- [x] `bore.pub` NO es IPv4
- [x] `localhost` NO es IPv4
- [x] `127.0.0.1:55435` NO es IPv4 (tiene puerto)
- [x] String vacío NO es IPv4

## Pruebas de Constantes del Sistema
- [x] `NAKAMA_HEALTH_INTERVAL_MS = 30000` (30s)
- [x] `NAKAMA_RESTART_DELAY_MS = 2000` (2s)
- [x] `MAX_NAKAMA_RESTART_ATTEMPTS = 5`
- [x] `HEALTH_CHECK_TIMEOUT_MS = 1000` (1s)
- [x] `BORE_TIMEOUT_MS = 10000` (10s)
- [x] `GUI_HEALTH_CHECK_INTERVAL_MS = 3000` (3s)

## Pruebas de Puertos Clave
- [x] RA netplay port = 55435
- [x] Forwarder port = 55436
- [x] Nakama port = 7350
- [x] Todos los puertos son distintos entre sí

## Pruebas Funcionales (requieren RetroArch)
- [ ] RetroArch carga `netplay_optimized.cfg` con `--appendconfig`
- [ ] Las configuraciones anti-lag se aplican correctamente
- [ ] El guest no se mueve uno de más en la pantalla del host
- [ ] `netplay_check_frames = "180"` evita el re-procesamiento de inputs
- [ ] El fix de doble input aplica a todos los flujos (MITM, Bore, Tailscale, Directo)
- [ ] Run-ahead desactivado no causa inputs duplicados

## Pruebas de UI (requieren Electron)
- [ ] Health check polling cada 3s en React
- [ ] `nakamaReady` cambia estado correctamente
- [ ] Botón INSERT COIN se deshabilita cuando Nakama no está listo
- [ ] Spinner/Loader se muestra mientras Nakama inicia
- [ ] IP de relay se guarda automáticamente en JOIN
- [ ] Status text muestra "NAKAMA ONLINE" cuando está listo

## Resultados de Ejecución
- [x] 74/74 tests automatizados pasan (sin RetroArch)
- [ ] Pruebas funcionales con RetroArch pendientes
- [ ] Pruebas de UI con Electron pendientes

## Fecha de Ejecución: 2026-07-17
## Estado: COMPLETADO (tests automatizados) — 74/74 tests pasan (✅ 100%)
## Pendiente: Pruebas funcionales con RetroArch + Pruebas de UI con Electron
