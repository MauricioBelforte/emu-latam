# Plan de Mejoras - Stepfun Step-3.7-Flash (Emu Latam)
## 5. Checklist

### 5.1 IPC Handlers nuevos
- [x] `check-nakama-status` definido y expuesto
- [ ] `auto-relay-tunnel` implementado para host y guest
- [ ] `launch-challenge` con orquestación separada de `launch-game`
- [ ] `calibrate-anti-lag` con defaults por core
- [ ] `session-metrics` writer al cierre

### 5.2 Helpers compartidos
- [x] `waitForPort` verificado
- [x] `getLanIp` verificado
- [ ] `killProcessTree` utilizable desde nuevos handlers
- [ ] `isPortInUse` incorporado en auto-relay

### 5.3 React: componentes y estado
- [ ] `useNetworkStatus` hook creado
- [ ] `NetworkStatusBar` integrado en Home/Lobby
- [ ] `ProgressSteps` mostrando pasos challenge
- [ ] `ActionGate` en botones críticos (HOST, JOIN, INSERT COIN)
- [ ] Copy IP mejorada (solo IP, preview)

### 5.4 Anti-lag
- [ ] Detección de core desde cfg
- [ ] Mapa de defaults por core
- [ ] Estructura para override manual

### 5.5 Métricas y logs
- [ ] Formato JSON definido
- [ ] Volcado automático al finalizar sesión
- [ ] Validación de tamaño y rotación si supera umbral

### 5.6 Flujo de retos
- [ ] Modelo de datos "challenge" (id, hostIp, port, status)
- [ ] UI de creación
- [ ] UI de lista/join
- [ ] Limpieza automática al terminar

### 5.7 Tailscale (fallback)
- [ ] Detección instalación
- [ ] Selección de red preferida
- [ ] Fallback automático a Bore si no disponible

### 5.8 Tests y validación
- [ ] Suite nueva de unit tests para handlers nuevos
- [ ] Ejecutar suite estables (35 tests) y confirmar verde
- [ ] Prueba de humo: launch-challenge host y guest
- [ ] `npm run lint` sin errores
- [ ] `npm run dev` limpio

### 5.9 Documentación y logs
- [ ] Actualizar `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md`
- [ ] Actualizar `DOCUMENTACION/4-DOCUMENTO-EJECUCION-ACTUAL.md` con nuevos handlers
- [ ] Generar log en `Logs/` al finalizar módulo

---
**Documento:** 05-Checklist.md
**Módulo:** 06-Plan-de-mejoras / stepfun / step-3.7-flash