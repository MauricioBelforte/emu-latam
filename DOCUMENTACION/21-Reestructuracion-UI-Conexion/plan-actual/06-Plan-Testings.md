# Plan de Testings - Reestructuración UI de Conexión

## Pruebas Unitarias

### UI Pre-Autenticación
- [ ] La pantalla principal muestra exactamente 2 secciones (Tailscale y P2P)
- [ ] Cada sección tiene exactamente 2 botones (Crear + Unirse)
- [ ] Los colores son correctos (cyan para Tailscale, verde para P2P)
- [ ] No hay sección fucsia visible
- [ ] No hay sección "CONEXIÓN VÍA P2P" verde separada

### Botón CREAR SALA Tailscale
- [ ] Llama `set-nakama-server` con localhost:7350
- [ ] Llama `loginGhost`
- [ ] Llama `get-tailscale-ip`
- [ ] Llama `open-firewall-port`
- [ ] Setea `salaType = "tailscale"`
- [ ] Setea `joinMode = "create"`

### Botón UNIRSE A SALA Tailscale
- [ ] Setea `salaType = "tailscale"`
- [ ] Setea `joinMode = "join"`
- [ ] Muestra campo de IP para ingresar
- [ ] Restaura última IP guardada en localStorage

### Botón CREAR SALA P2P
- [ ] Llama `bootstrap-host` y obtiene `roomCode`
- [ ] Llama `p2p-start-broadcast` para LAN
- [ ] Muestra código numérico al usuario
- [ ] Setea `salaType = "p2p"`
- [ ] Llama `loginGhost`

### Botón UNIRSE A SALA P2P
- [ ] Intenta `p2p-discover-host` (4 segundos)
- [ ] Si encuentra LAN → conecta automático sin pedir código
- [ ] Si no encuentra → muestra input para código numérico
- [ ] Código numérico llama `bootstrap-guest`
- [ ] Si `bootstrap-guest` ok → conecta a Nakama remoto

## Pruebas de Integración

### Toggle GGPO/RetroArch
- [ ] Visible después de autenticarse
- [ ] Cambia `engine` en GgpoContext
- [ ] No se bloquea al cambiar
- [ ] Deshabilitado cuando hay túnel Bore activo

### MethodPicker Dinámico
- [ ] Sala Tailscale + RetroArch → muestra [Tailscale, LAN]
- [ ] Sala Tailscale + GGPO → muestra solo [Tailscale]
- [ ] Sala P2P + RetroArch → muestra [P2P, LAN, Bore]
- [ ] Sala P2P + GGPO → muestra [P2P, LAN] (sin Bore)
- [ ] Click en método → llama `selectMethod` correctamente

### Sistema de Retos End-to-End
- [ ] Click en jugador en sidebar → abre MethodPicker
- [ ] Selección de método → envía reto vía Nakama
- [ ] Reto recibido muestra modal con método correcto
- [ ] Aceptar reto → lanza flujo correcto según método y motor
- [ ] Rechazar reto → cierra modal
- [ ] Timeout (30s) → muestra "TIEMPO AGOTADO"

### Flujo P2P Automático (reto)
- [ ] Host: `p2p-host` o `ggpo-p2p-host` según engine
- [ ] Guest: `p2p-guest` o `ggpo-p2p-guest` según engine
- [ ] LAN detectado → conexión directa
- [ ] WAN → hole punching + relay fallback
- [ ] Bootstrap mode → relay TCP↔UDP + bore segundo

## Casos Límite (Edge Cases)

- [ ] Tailscale no instalado → CREAR SALA Tailscale funciona pero muestra IP vacía
- [ ] Nakama no responde → CREAR SALA P2P funciona (loginGhost con fallback local)
- [ ] Bootstrap-host falla (dpaste.org caído) → muestra error y URL bore manual
- [ ] Código de sala inválido → muestra error claro
- [ ] Dos jugadores presionan CREAR SALA al mismo tiempo → ambos son hosts
- [ ] Cambiar toggle GGPO↔RetroArch mientras hay reto activo → no crashea
- [ ] Desconectarse y reconectarse → estados se resetean correctamente

## Manejo de Errores

- [ ] Error en `bootstrap-host` → muestra mensaje de error, no crash
- [ ] Error en `p2p-discover-host` → fallback a código, no crash
- [ ] Error en `bootstrap-guest` con código → alerta al usuario
- [ ] Error en `set-nakama-server` → no bloquea la UI
- [ ] Error en `loginGhost` → fallback local funciona

## Pruebas de Rendimiento

- [ ] La pantalla principal renderiza en < 100ms
- [ ] Cambiar de sección no produce lag visible
- [ ] `p2p-discover-host` no bloquea la UI durante los 4 segundos

## Resultados de Ejecución

- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todos los manejos de errores pasaron
- [ ] Todas las pruebas de rendimiento pasaron

## Fecha de Ejecución: [PENDIENTE]
## Estado: PENDIENTE
