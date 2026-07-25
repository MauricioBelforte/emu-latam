# Diseño - Reestructuración UI de Conexión (PLAN ACTUAL)

## Fase A: Debug del Data Path Bootstrap

### A.1 Problemas conocidos a verificar

```
[GGPO Guest] → UDP :6004 → forwarderSocket :fwdPort → ¿llega al TCP bridge?
                                          ↓
                                  P2P transport (NO FUNCIONA en WAN)
                                          ↓
[GGPO Host] ← UDP :6003 ← relaySocket :relayPort ← ¿llega del TCP bridge?
```

El bootstrapGgpoRelay.ts intenta reemplazar el P2P transport con:
```
forwarderSocket → TCP bridge → bore → TCP relay → relaySocket
```

Pero hay que verificar:

1. **`startGgpoBore()`** — ¿Usa `bore local <tcpPort> --to bore.pub` correctamente? ¿No interfiere con el bore de Nakama que ya está corriendo?

2. **handleBootstrapGgpoRelayHost()** — Crea UDP relay en `127.0.0.1:relayPort`. GGPO host (6003) envía datos a este relay. ¿GGPO host está configurado con `remotePort: relayPort`?

3. **handleBootstrapGgpoRelayGuest()** — Crea forwarder UDP en `forwarderUdpPort` y puentea a TCP. ¿GGPO guest (6004) envía datos al forwarder?

4. **Flujo de datos completo:**
   - GGPO guest → UDP :6004 → forwarder :fwdPort → **envía por TCP a bore**
   - bore → host → TCP relay → **recibe y envía a relay :relayPort**
   - relay :relayPort → UDP → **reenvía a GGPO host :6003**

### A.2 Plan de debug

1. Aislar el relay: probar `bootstrap-ggpo-relay-host` y `bootstrap-ggpo-relay-guest` localmente (sin GGPO, con UDP echo)
2. Probar con RetroArch primero (más tolerante)
3. Probar con GGPO después

### A.3 Simplificación posible

Si el relay TCP↔UDP es muy complejo o lento, una alternativa más simple:

**Usar el puerto de Nakama (7350) como data path:**
- El host ya tiene un túnel bore para Nakama en el puerto 7350
- El guest ya está conectado a ese túnel
- ¿Podemos multiplexar datos de juego por el mismo túnel?

**NO es posible** porque bore es TCP y el juego es UDP. Pero el relay-server (`relay-server/mitm-relay.js`) podría usarse como puente:
- Host: `mitm-relay.js <gamePort> 127.0.0.1 <relayPort>` donde `<relayPort>` es el puerto UDP donde reenviamos a GGPO/RA
- Pero mitm-relay también es TCP

**Conclusión:** No hay forma simple. Hay que debuggear el TCP↔UDP bridge.

## Fase B: Diseño de UI Simplificada

### B.1 Nuevo estado

```
salaType: "tailscale" | "p2p" | null
```

Agregado SIN eliminar los estados viejos primero (refactor incremental).

### B.2 Pantalla principal (pre-auth)

```
┌──────────────────────────────────────────────┐
│  ▸ SALA TAILSCALE ◂          (cyan #00f3ff)  │
│  ┌──────────┐  ┌──────────┐                  │
│  │CREAR SALA│  │UNIRSE A  │                  │
│  │          │  │SALA      │                  │
│  └──────────┘  └──────────┘                  │
├──────────────────────────────────────────────┤
│  ▸ SALA P2P ◂               (verde #0f0)     │
│  ┌──────────┐  ┌──────────┐                  │
│  │CREAR SALA│  │UNIRSE A  │                  │
│  │          │  │SALA      │                  │
│  └──────────┘  └──────────┘                  │
└──────────────────────────────────────────────┘
```

### B.3 Unirse a Sala P2P (flujo)

1. Click "UNIRSE A SALA" → `setJoinMode("p2p")`
2. Muestra input de código numérico (sin espera de 4s de discovery)
3. En background: intenta `p2p-discover-host` (LAN)
4. Si encuentra LAN → autocompleta el código con la IP y conecta
5. Si usuario ingresa código → `bootstrap-guest` → conecta

### B.4 MethodPicker dinámico

```
ChallengeData:
  method?: "tailscale" | "bore" | "lan" | "p2p"
  salaType?: "tailscale" | "p2p"
  isBootstrapChallenge?: boolean
  hostCandidate?: any
```

**Filtrado:** Misma tabla del plan inicial, pero implementada de a un método por vez.

### B.5 Eliminar colapsable "OTROS MÉTODOS"

Se elimina TODO el JSX del `Collapsible` que contiene las 5 secciones (Modo Tailscale, Directo, Bore, P2P, Debug). El botón DEBUG se mueve a un lugar discreto al pie.

## Orden de Implementación

```
Fase A.1 → Verificar que startGgpoBore funciona sin matar el bore de Nakama
Fase A.2 → Probar relay host localmente (con UDP echo server)
Fase A.3 → Probar relay guest localmente
Fase A.4 → Prueba end-to-end local (misma máquina)
Fase A.5 → Probar con RetroArch entre 2 PCs
Fase A.6 → Probar con GGPO entre 2 PCs

Fase B.1 → Agregar salaType (sin eliminar estados viejos)
Fase B.2 → Reemplazar sección fucsia + verde por una sola sección P2P
Fase B.3 → Eliminar colapsable "OTROS MÉTODOS"
Fase B.4 → MethodPicker dinámico
Fase B.5 → Eliminar estados viejos (isP2pSala, isBootstrapSala)
```
