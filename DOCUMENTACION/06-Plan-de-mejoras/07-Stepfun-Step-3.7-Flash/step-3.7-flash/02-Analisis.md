# Plan de Mejoras - Stepfun Step-3.7-Flash (Emu Latam)
## 2. Análisis

### 2.1 Dominio
El proyecto es una aplicación Electron + React que orquesta emulación RetroArch sobre netplay, con túneles Bore y matchmaking Nakama. La capa crítica combina:
- Procesos hijos de sistema (RA, proxy TCP, forwarder, bore).
- Sockets locales y tunelización pública.
- UI reactiva que expone tres modos estables: Host directo, Host con bore manual, Join directo.

### 2.2 Puntos calientes identificados
1. **Handshake y arranque en cascada**: cada paso (health-check Nakama, levantar Bore, esperar puerto, lanzar RA) se encadena linealmente; no hay paralelismo ni caching.
2. **Resolución y copy-paste de IPs**: el usuario debe copiar IP/puertos manualmente; errores de formato pueden bloquear la conexión.
3. **Proxy local en 127.0.0.1:55435** puede entrar en conflicto con RA si no se inyectan configuraciones limpias.
4. **Anti-lag no calibrado**: en帧rates variables, el run-ahead puede desincronizar entradas (ver historial de desfase por input_poll_type).
5. **Logs locales sin métricas**: solo trazas planas; faltan counters de latencia, frames desincronizados y tiempo de setup por fase.
6. **UX sin estado**: ausencia de "loading全局" y de desactivación temporal de botones críticos.

### 2.3 Alternativas evaluadas

| Tema | Alternativa A | Alternativa B | Decisión |
|------|--------------|--------------|---------|
| Transporte  | UDP hole punching puro | Mantener TCP + Bore automático | TCP: mayor compatibilidad; Bore automático reduce fricción |
| Multi-hop NAT | UPnP/Port forwarding local | Bore.pub + forwarder | Conservar Bore.pub por simplicidad y deploy actual |
| VPN alternativa | Tailscale como reemplazo | Tailscale como fallback | Fallback configurabilizable |
| Anti-lag | Auto-detección de input poll | Valores fijos por juego | Auto-detección con sobreescritura manual posible |
| Orquestación | Modificar `launch-game` | Nuevo IPC handler `launch-challenge` | Nuevo handler separado |

### 2.4 Decisiones clave
1. Todos los flujos nuevos deben ser **paralelos** a los estables y no compartir la misma función orquestadora.
2. Implementar una capa de **estado global de red** accesible desde React (vía IPC) para deshabilitar/habilitar botones progresivamente.
3. Introducir **`metricsSession`** por partida (JSON en memoria + volcado al final) para medir tiempos de setup y latencias.
4. Usar **Tailscale** solo si está disponible; si no, revertir al flujo Bore/forwarder actual.
5. Implementar **anti-lag adaptativo** que inicialice `input_poll_type` según el core detectado.

### 2.5 Supuestos
- RetroArch permanece en `--port 55435` ignorado por el netplay real.
- Los 35 tests estables (`test_stable_flows.js`) siguen siendo la base de compatibilidad.
- Bore.pub sigue operativo; si no, fallback a forwarder local.
- El entorno mantiene Node.js y herramientas de build actuales.

---
**Documento:** 02-Analisis.md
**Módulo:** 06-Plan-de-mejoras / stepfun / step-3.7-flash