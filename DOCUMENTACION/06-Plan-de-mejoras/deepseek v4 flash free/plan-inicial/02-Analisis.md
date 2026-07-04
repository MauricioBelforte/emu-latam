# 02-Analisis — DeepSeek V4 Flash Free

## Análisis del Dominio

Emu Latam opera en el dominio de **juegos retro online P2P asistido por infraestructura cloud**. Los actores principales son:

- **Host** — Usuario que crea la partida, ejecuta RetroArch en modo `--host`
- **Guest** — Usuario que se une, ejecuta RetroArch en modo `--connect`
- **Nakama Server** — Backend de matchmaking, autenticación, storage de relay URLs
- **Bore** — Túnel TCP público para NAT traversal
- **Tailscale** — VPN mesh para conexión directa alternativa
- **Sistema de Retos** — Invitaciones P2P vía Nakama con túnel Bore automatizado

## Alternativas Consideradas

### Dimensión 1: Arquitectura

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **A1: Monolito mejorado** (mantener index.ts con comentarios y secciones) | Mínimo esfuerzo, bajo riesgo | No soluciona mantenibilidad, difícil testing |
| **A2: División en módulos por responsabilidad** | Testeable, mantenible, extensible | Esfuerzo medio, riesgo de regresión si no se prueba |
| **A3: Microservicios (procesos separados)** | Aislamiento total | Sobrediseño para el alcance actual |

**Decisión: A2** — División en módulos. Es el punto óptimo entre esfuerzo y beneficio.

### Dimensión 2: Seguridad

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **B1: Whitelist de canales IPC en preload** | Simple, efectivo, bajo riesgo | No cubre sanitización de args |
| **B2: Validación por handler con esquemas** | Seguridad máxima | Mayor complejidad, overkill para app local |
| **B3: B1 + tipado fuerte + sanitización shell** | Balance seguridad/esfuerzo | Requiere refactor moderado |

**Decisión: B3** — Whitelist en preload, interfaces tipadas, sanitización de comandos shell.

### Dimensión 3: UX/Rendimiento

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **C1: Health check con intervalo creciente** | Simple, bajo riesgo | Sigue haciendo fetch |
| **C2: Detener health check al autenticar, webhook al reconectar** | Cero tráfico innecesario | Requiere evento de reconexión |
| **C3: Usar Server-Sent Events o WebSocket de Nakama** | Tiempo real, eficiente | Dependencia de Nakama, cambios en backend |

**Decisión: C2** — Stopper el loop al autenticar, reanudar solo cuando el socket de Nakama se desconecte.

### Dimensión 4: Infraestructura

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **D1: Nakama en Docker local** | Simple, portátil | No resuelve juego online público |
| **D2: VPS con Docker Compose** | Solución completa, escalable | Costo mensual, mantenimiento |
| **D3: Usar Nakama Cloud (Heroic Labs)** | Zero mantenimiento | Costo, dependencia externa |

**Decisión: D2** — VPS con Docker Compose. Control total, costo manejable.

### Dimensión 5: Tests

| Alternativa | Pros | Contras |
|-------------|------|---------|
| **E1: Solo tests de integración (como ahora)** | Bajo esfuerzo | Cobertura insuficiente |
| **E2: Vitest + React Testing Library** | Cobertura completa, moderno | Curva de aprendizaje |
| **E3: Jest (legacy)** | Comunidad grande | Más lento, menos features que Vitest |

**Decisión: E2** — Vitest (comparte config con Vite, más rápido, mismo ecosistema).

## Decisiones Técnicas Detalladas

### D1: Estructura de Módulos Propuesta

```
client/src/main/
├── index.ts                    # Entry point (~50 líneas, solo orquestación)
├── config.ts                   # Constantes, puertos, rutas, timeouts
├── ipc-handlers.ts             # Todos los handlers IPC
│   ├── registerHandlers()      # Registra todos los handlers
│   ├── handleLaunchGame()      # launch-game
│   ├── handleRelayTunnel()     # start-relay-tunnel
│   ├── handleMitmLocal()       # start-mitm-local / stop-mitm-local
│   ├── handleKillRetroarch()   # kill-retroarch
│   ├── handleTailscale()       # tailscale-host / tailscale-join
│   └── handleGetLanIp()        # get-lan-ip
├── process-manager.ts          # Spawn/kill de procesos
│   ├── launchNakama()
│   ├── launchRetroArch()
│   ├── launchBore()
│   ├── killRetroArch()
│   └── killBore()
├── tcp-proxy.ts                # Proxy y forwarder TCP
│   ├── startProxy()
│   ├── stopProxy()
│   ├── startPortForwarder()
│   └── stopPortForwarder()
├── logging.ts                  # Sistema de logging con rotación
│   ├── initLogging()
│   └── rotateLogIfNeeded()
└── network-utils.ts            # Utilidades de red
    ├── getLanIp()
    ├── getTailscaleIp()
    ├── waitForPort()
    └── isPortAvailable()
```

### D2: Tipos Compartidos

```typescript
// shared/types.ts (en src/shared/ o en preload/)
interface ElectronAPI {
  invoke: {
    launchGame: (args: LaunchGameArgs) => Promise<void>;
    startRelayTunnel: (args: RelayTunnelArgs) => Promise<void>;
    killRetroarch: () => Promise<void>;
    // ... cada canal con su tipo específico
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
}
```

### D3: Whitelist de Canales IPC

```typescript
// En preload
const ALLOWED_CHANNELS = [
  'launch-game',
  'start-relay-tunnel',
  'start-mitm-local',
  'stop-mitm-local',
  'kill-retroarch',
  'tailscale-host',
  'tailscale-join',
  'get-lan-ip',
  'start-relay-tunnel-v2',
  'cancel-challenge',
] as const;

ipcRenderer.invoke = (channel: string, ...args: any[]) => {
  if (!ALLOWED_CHANNELS.includes(channel)) {
    return Promise.reject(new Error(`IPC channel '${channel}' not allowed`));
  }
  return invoke(channel, ...args);
};
```

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Regresión en flujos blindados al refactorizar | Baja | Alto | Tests existentes (35) deben pasar después de cada cambio |
| Rotura de logging al modularizar | Media | Medio | Módulo logging primero, verificar que console.log siga escribiendo a archivo |
| ChallengeContext con lógica de red acoplada | Alta | Medio | Migrar gradualmente: primero nuevos IPC handlers, después eliminar lógica vieja |
| Docker en VPS con config diferente a local | Media | Alto | Usar mismo docker-compose.dev.yml para local y producción |
| Dependencias externas (Bore, Nakama) sin mantenimiento | Baja | Alto | Tener scripts de backup, considerar alternativas |
