# Análisis - Reestructuración UI de Conexión

## Estado Actual

### Pantalla Principal (pre-autenticación) — App.tsx L793-L971

La pantalla muestra 3 secciones con 6 botones cuando `joinMode === null`:

| Sección | Color | Botones | Función Real |
|---------|-------|---------|-------------|
| SALA TAILSCALE | #00f3ff (cyan) | CREAR SALA + UNIRSE A SALA | Conecta a Nakama localhost (crear) o a IP remota vía Tailscale (unirse) |
| SALA P2P (SIN TERCEROS) | #f0f (fucsia) | CREAR SALA P2P + UNIRSE A SALA P2P | Igual que Tailscale pero con broadcast UDP en LAN para descubrimiento |
| CONEXIÓN VÍA P2P (SIN TAILSCALE) | #0f0 (verde) | CREAR CONEXIÓN P2P + CONECTAR VÍA P2P | Bootstrap via bore.pub + paste service (código numérico de sala) |

### Post-autenticación — App.tsx L1063-L1315

Una vez dentro de la sala, se muestra:
- Info de la sala (IP, código, jugadores)
- **GgpoToggle** (RETROARCH ↔ GGPO)
- Sección colapsable "OTROS MÉTODOS DE CONEXIÓN" con 5 sub-secciones

### Problemas Identificados

1. **Redundancia:** "SALA P2P" (fucsia) y "CONEXIÓN VÍA P2P" (verde) hacen cosas similares pero el usuario no sabe la diferencia.
2. **Confusión semántica:** "Sala P2P" suena como P2P pero es solo descubrimiento LAN. "Conexión P2P" suena igual pero usa bore.
3. **Demasiados métodos post-conexión:** LAN, Tailscale, Bore, P2P Propio, Debug... el usuario promedio no necesita elegir manualmente.
4. **Duplicación de código:** Handlers similares para funciones parecidas.
5. **El MethodPicker no considera el contexto:** Siempre muestra 4 opciones sin importar cómo se conectó.

## Estado Deseado

### Pantalla Principal: 4 Botones en 2 Secciones

```
┌──────────────────────────────────────────────────┐
│              READY TO FIGHT?                      │
│           EMU LATAM v2.0 — RETROARCH NETPLAY      │
│                                                    │
│  ┌─ SALA TAILSCALE ─────────────────────────────┐ │
│  │  [CREAR SALA]        [UNIRSE A SALA]          │ │
│  │  Ambos necesitan      Conectate a la sala     │ │
│  │  Tailscale instalado  de un amigo             │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌─ SALA P2P ───────────────────────────────────┐ │
│  │  [CREAR SALA]        [UNIRSE A SALA]          │ │
│  │  Creá tu sala y       Ingresá el código       │ │
│  │  compartí el código   que te dió tu amigo     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└──────────────────────────────────────────────────┘
```

### Lógica de "SALA P2P"

**CREAR SALA P2P:**
1. Inicia Nakama en localhost
2. Inicia bootstrap-host (bore + paste) → genera código numérico
3. Simultáneamente, inicia p2p-start-broadcast para LAN
4. Muestra el código al usuario
5. LoginGhost automático

**UNIRSE A SALA P2P:**
1. Primero intenta auto-descubrimiento LAN (p2p-discover-host, 4 segundos)
2. Si encuentra sala LAN → conecta automático (como la sala P2P fucsia actual)
3. Si NO encuentra → pide código numérico (como la conexión verde actual)
4. Resuelve el código → conecta a Nakama remoto vía bore
5. LoginGhost automático

### Auto-detección LAN/WAN (para la pelea)

Cuando se acepta un reto, el sistema detecta automáticamente:
- **LAN:** Si ambos están en la misma subred (IPs 192.168.x.x iguales en primeros 3 octetos) → conexión directa
- **WAN con Tailscale:** Si la sala es Tailscale → usa IP Tailscale directa
- **WAN sin Tailscale:** Si la sala es P2P → usa P2P hole punching + relay fallback

### MethodPicker Dinámico

El MethodPicker ya NO muestra todas las opciones. Se adapta así:

| Sala | Toggle | Métodos Disponibles |
|------|--------|-------------------|
| Tailscale | RetroArch | Tailscale (directo), LAN (auto-detectado) |
| Tailscale | GGPO | Tailscale (directo) — GGPO solo funciona con IP directa |
| P2P | RetroArch | P2P Automático (hole punch + relay), LAN (auto-detectado), Bore (túnel) |
| P2P | GGPO | P2P Automático (hole punch + relay WAN), LAN (auto-detectado) |

> **Nota:** Bore NO aparece con GGPO porque Bore es TCP y GGPO usa UDP.

## Decisiones de Diseño

### 1. Unificar fucsia + verde = verde
- El verde (#0f0) se usa para "P2P" porque es el color del bootstrap (código numérico) que es la funcionalidad principal.
- El broadcast LAN sigue funcionando pero es transparente al usuario.

### 2. No eliminar la sección colapsable completa
- Mover "Modo Debug" a un lugar accesible (puede quedar como botón pequeño al fondo).
- Los métodos manuales (Bore directo, LAN manual) desaparecen de la UI pero siguen funcionando como handlers IPC por si se necesitan.

### 3. El toggle GGPO/RetroArch sigue igual
- Es una decisión del usuario, no del sistema.
- Afecta qué métodos de pelea están disponibles en el MethodPicker.

## Archivos Afectados

| Archivo | Cambios |
|---------|---------|
| `client/src/App.tsx` | Refactorizar completamente la sección pre-autenticación y post-autenticación |
| `client/src/components/ui/MethodPicker.tsx` | Hacer dinámico según contexto (sala tipo + engine) |
| `client/src/components/ui/ChallengeModal.tsx` | Actualizar METHOD_META para reflejar nuevos métodos |
| `client/src/context/ChallengeContext.tsx` | Ajustar selectMethod para auto-detectar LAN/WAN |
| `client/src/ggpo/components/GgpoToggle.tsx` | Sin cambios (se mantiene igual) |
| `client/src/ggpo/context/GgpoContext.tsx` | Sin cambios (se mantiene igual) |

## Riesgos

1. **Romper flujos estables:** El flujo de bore manual y host directo están blindados (AGENTS.md §15). No se deben modificar los handlers, solo la UI.
2. **Regresión en retos:** El ChallengeContext es complejo (502 líneas). Cambios mal hechos pueden romper el flujo de retos.
3. **Estado compartido excesivo:** App.tsx tiene ~40 estados. La refactorización debería reducirlos, no aumentarlos.
