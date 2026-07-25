# Requerimientos - Reestructuración UI de Conexión

## Problema

La pantalla principal de Emu Latam tiene **6 botones** de conexión divididos en 3 secciones de colores distintos:

1. **Sala Tailscale** (cyan/primary): CREAR SALA + UNIRSE A SALA
2. **Sala P2P (sin terceros)** (fucsia #f0f): CREAR SALA P2P + UNIRSE A SALA P2P
3. **Conexión vía P2P (sin Tailscale)** (verde #0f0): CREAR CONEXIÓN P2P + CONECTAR VÍA P2P

Además, una vez conectado, hay una sección colapsable "OTROS MÉTODOS DE CONEXIÓN" con 5 secciones más:
- Modo Tailscale (P2P directo)
- Modo Directo (LAN)
- Modo Bore (túnel)
- Modo P2P Propio (hole punching)
- Modo Debug

Y el **MethodPicker** (modal de retos) lista 4 métodos:
- P2P Automático (#f0f)
- Tailscale (P2P) (#00f3ff)
- Bore (Túnel) (#0af)
- LAN Directo (#0f0)

**Resultado:** La interfaz es confusa, tiene redundancia, y el usuario no sabe qué botón presionar.

## Objetivo

Reestructurar la UI para que:

1. **La pantalla principal tenga solo 4 botones**, organizados en 2 secciones:
   - **SALA TAILSCALE:** CREAR SALA + UNIRSE A SALA (para jugadores que ambos tienen Tailscale)
   - **SALA P2P:** CREAR SALA + UNIRSE A SALA (para jugadores que NO tienen Tailscale — usa bore/código para "verse" en Nakama)

2. **La detección de LAN vs WAN sea automática** — no necesita botones separados. Si ambos están en la misma red, se detecta y se conecta directo.

3. **El toggle RETROARCH/GGPO** sea el que determina cómo se conecta la pelea una vez aceptado el reto.

4. **El MethodPicker** (modal de retos) se adapte dinámicamente según:
   - Si se creó sala con Tailscale o con P2P
   - Si el toggle está en GGPO o RetroArch

## Alcance

### Incluido
- Refactorización de la pantalla principal (pre-autenticación)
- Refactorización del MethodPicker y ChallengeModal
- Lógica de auto-detección LAN/WAN
- Adaptación del MethodPicker según contexto (Tailscale vs P2P, GGPO vs RetroArch)
- Remoción de la sección "OTROS MÉTODOS DE CONEXIÓN" colapsable
- Unificación visual (2 colores principales: cyan para Tailscale, verde para P2P)

### Excluido
- Cambios en el Main Process de Electron (los IPC handlers se mantienen)
- Cambios en el p2p-module
- Cambios en el backend de Nakama
- Nuevas funcionalidades (solo reorganización de las existentes)

## Restricciones

1. **NO tocar los IPC handlers** que ya funcionan (`launch-game`, `tailscale-host`, `p2p-host`, `bootstrap-host`, etc.)
2. **NO romper los flujos estables** documentados en AGENTS.md sección 15
3. **Mantener compatibilidad** con el engine toggle (GGPO/RetroArch)
4. **El toggle GGPO/RetroArch** debe seguir visible y funcional después de autenticarse
5. **Mantener la sidebar** con jugadores y el sistema de retos intacto
6. **No eliminar funcionalidades existentes**, solo reorganizar cómo se accede a ellas

## Definiciones

- **"Sala"** = Conexión al servidor Nakama (donde los jugadores se "ven" y chatean). No es la pelea.
- **"Pelea"** = La partida de RetroArch o FBNeo/GGPO que se inicia después de aceptar un reto.
- **"Método de conexión de pelea"** = Cómo se transmiten los inputs (Tailscale IP directa, Bore túnel, P2P hole-punching, LAN directo).
