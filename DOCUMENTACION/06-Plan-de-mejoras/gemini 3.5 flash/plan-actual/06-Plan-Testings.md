# Plan de Testings — Gemini 3.5 Flash

## 1. Pruebas Unitarias
- [ ] **Prueba de Parser Tailscale:** Alimentar `checkPeerStatus` con JSON mockeados de `tailscale status` que representen conexiones directas vs. DERP, validando que el retorno sea correcto.
- [ ] **Prueba de Watchdog:** Simular la caída de un subproceso enviando un código de salida `1` o `0` y verificar que la callback de error retorne el mensaje descriptivo correcto.
- [ ] **Prueba de Handshake de Seguridad:** Conectar un cliente TCP al `safe-forwarder` sin token o con token erróneo, verificando que el socket sea destruido en menos de 2 segundos.

## 2. Pruebas de Integración
- [ ] **Prueba de Comando UDP:** Lanzar RetroArch y enviar el comando `QUIT` por UDP, validando que el proceso finalice de forma limpia sin generar bloqueos en el sistema operativo.
- [ ] **Prueba de Sincronización Dinámica de Latencia:** Verificar que al detectar un estado "relay", el archivo de configuración modificado se grabe con los buffers de latencia ajustados a la defensiva.

## 3. Pruebas de Casos Límite (Edge Cases)
- [ ] **Tailscale desconectado/apagado:** Validar que al fallar la CLI `tailscale status`, el diagnóstico de red retorne un estado por defecto seguro (DERP/Alta Latencia) en lugar de romper el flujo de la app.
- [ ] **Envío de comandos UDP durante micro-freeze:** Verificar que los sockets UDP de control de RetroArch tengan configurados timeouts de lectura/escritura para evitar fugas de recursos o bloqueos de eventos en Electron.

## 4. Ejecución del Plan
- Todas las pruebas de red y ciclo de vida de procesos deben correrse primero en un entorno local y documentarse en `07-Resultados-Testings.md` antes de darlas por completadas.
