# Checklist de Tareas — Gemini 3.5 Flash

## Fase 1: Diagnóstico de Red y Ajuste Dinámico
- [ ] Implementar la lectura del JSON en `tailscale status --json` desde el Main Process.
- [ ] Desarrollar parser para determinar si la conexión es directa P2P o pasa por relay (DERP).
- [ ] Crear el canal IPC `get-network-diagnostic` para enviar la información al frontend de React.
- [ ] Agregar visualización en el componente de Sala de React con el indicador de estado.
- [ ] Modificar el formateador de `netplay_optimized.cfg` para inyectar dinámicamente `latency_frames_min` y `range` según el diagnóstico de red.

## Fase 2: Robustez de Autenticación y Matchmaking
- [ ] Configurar la generación de UUID locales persistidos en la PC del usuario a través de `electron-store`.
- [ ] Reemplazar la autenticación anónima aleatoria de `loginGhost()` por `authenticateDevice(uuid)`.
- [ ] Implementar suscripción al Matchmaker de Nakama enviando metadatos de ping de región del usuario.
- [ ] Conectar la respuesta del matchmaking con el flujo automatizado de lanzamiento del juego.

## Fase 3: Control y Supervisión de Procesos
- [ ] Habilitar la directiva `network_cmd_enable = true` en RetroArch.
- [ ] Crear el módulo `retroarch-control.ts` para enviar comandos UDP al puerto 55400.
- [ ] Reemplazar el `process.kill()` por el comando UDP `QUIT` al cerrar partidas remotas.
- [ ] Crear e integrar la clase `ProcessWatchdog` en index.ts para centralizar la monitorización de todos los child processes.
- [ ] Desarrollar canal IPC para notificar errores descriptivos de procesos al frontend de React.

## Fase 4: Seguridad y Handshake
- [ ] Escribir el servidor de control `safe-forwarder.ts` en Node.js.
- [ ] Integrar la generación de tokens de conexión efímeros en la lógica de señalización de salas.
- [ ] Probar el rechazo de conexiones intrusas con herramientas de escaneo de puertos TCP locales.
