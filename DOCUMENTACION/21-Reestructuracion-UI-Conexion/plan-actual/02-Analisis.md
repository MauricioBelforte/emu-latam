# Análisis - Reestructuración UI de Conexión (PLAN ACTUAL)

## Estado Actual del Sistema

### Flujos que funcionan (AGENTS.md §15 - NO TOCAR)
| Flujo | Descripción |
|-------|-------------|
| Host directo (sin bore) | RetroArch local, funcional |
| Host con bore manual | RetroArch + forwarder + proxy + bore, funcional |
| Join directo (lee relay file) | Guest se conecta a host, funcional |
| Tailscale + GGPO | Ambos con Tailscale, funcional |
| Tailscale + RetroArch | Ambos con Tailscale, funcional |

### Flujos que NO funcionan en WAN

| Flujo | Problema |
|-------|----------|
| Bootstrap verde + GGPO P2P | El P2P module hace UDP hole-punching. En WAN con NATs estrictos, falla. GGPO se queda en "connecting..." |
| Bootstrap verde + RetroArch P2P | Mismo problema: el P2P transport no puede establecer conexión entre NATs distintos |
| Bootstrap verde + RetroArch (no P2P) | Los otros métodos (LAN, bore, tailscale) no aplican porque la sala ya está creada con bootstrap |

### Causa Raíz

El P2P module (`p2p-module/`) fue diseñado para hacer hole-punching UDP directo entre peers. Funciona en LAN (misma subred, detectado por `anySameSubnet()`), pero en WAN real entre NATs estrictos el hole-punching falla porque no hay un relay server en la nube.

#### Solución intentada (Módulo 20 - bootstrapGgpoRelay.ts)

Se implementó un relay TCP↔UDP que usa un **segundo túnel bore** para transportar datos de GGPO/RetroArch:

```
GGPO guest → UDP forwarder → TCP bridge → bore TCP → TCP host bridge → UDP relay → GGPO host
```

**Estado actual:** Implementado pero no verificado end-to-end. Problemas potenciales:

1. **Segundo bore puede fallar** si ya hay un bore corriendo (conflicto de procesos)
2. **Latencia TCP extra** puede ser demasiado alta para GGPO (tiempo real)
3. **El forwarder UDP del guest** puede no estar correctamente conectado al bridge TCP
4. **El relay UDP del host** puede estar mal enrutado al puerto 6003 de GGPO

## Alternativas para la Fase A

### Alternativa A1: Debuggear y arreglar bootstrapGgpoRelay.ts
- **Pros:** Ya está implementado, solo necesita debug
- **Contras:** Latencia TCP extra, complejidad de mantenimiento
- **Veredicto:** Intentar primero, es lo más rápido

### Alternativa A2: Usar el mismo túnel bore de Nakama para datos
- Mandar datos de juego a través del WebSocket de Nakama
- **Pros:** No necesita segundo bore, más simple
- **Contras:** Nakama usa WebSocket/TCP, latencia muy alta para GGPO
- **Veredicto:** Inviable para GGPO, tal vez para RetroArch

### Alternativa A3: Relay server en Fly.io (cloud)
- **Pros:** Latencia UDP real, robusto
- **Contras:** Requiere deploy externo, costo, mantenimiento
- **Veredicto:** Para después, no ahora

### Alternativa A4: Simplificar — solo LAN + Tailscale
- Quitar bootstrap WAN y requerir Tailscale o LAN para P2P
- **Pros:** Elimina complejidad
- **Contras:** Reduce funcionalidad, va contra el objetivo del proyecto
- **Veredicto:** Descartado

### Decisión Fase A
Intentar **Alternativa A1** con debug sistemático:
1. Verificar que `startGgpoBore()` no mate el primer bore de Nakama
2. Verificar que el relay UDP del host reciba datos de GGPO
3. Verificar que el bridge TCP del guest conecte correctamente al bore
4. Probar con RetroArch primero (más tolerante a latencia), luego GGPO

## Análisis para la Fase B (UI)

### Alternativa B1: Refactor masivo (plan inicial)
- Cambiar TODOS los estados de golpe (`isP2pSala`, `isBootstrapSala` → `salaType`)
- Reestructurar App.tsx completo
- **Riesgo:** Alto de romper flujos estables

### Alternativa B2: Refactor incremental
- **Paso 1:** Agregar `salaType` junto a los estados existentes (no reemplazar)
- **Paso 2:** Cambiar la UI para que use `salaType` visualmente
- **Paso 3:** Una vez verificado, eliminar `isP2pSala`/`isBootstrapSala`
- **Riesgo:** Bajo, se puede hacer commit por commit

### Decisión Fase B
**Alternativa B2** — refactor incremental, validando con tests después de cada cambio.

## Conclusión

1. Primero arreglar el data path (Fase A) — lo verde debe funcionar
2. Luego simplificar la UI (Fase B) — unificar botones
3. Cada paso con commit + test + verificación
