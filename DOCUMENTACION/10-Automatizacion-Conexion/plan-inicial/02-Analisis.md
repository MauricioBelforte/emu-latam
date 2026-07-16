# 02 - Análisis - Automatización de Conexión (Plan Inicial)

## Contexto

Ambos PCs usan la **misma cuenta de Tailscale**, por lo que están en la misma red privada (100.x.x.x). Además, ambos se conectan al mismo servidor Nakama (el de la PC host). Esto nos da un canal de comunicación directo para compartir datos de conexión sin intervención manual.

## Solución A: Storage de Nakama (recomendada como primera opción)

### Cómo funciona
1. **Host** al hacer CREAR SALA o HOST TAILSCALE:
   - Obtiene su IP Tailscale (`getTailscaleIp()`).
   - La guarda en el Storage de Nakama: `POST /v2/storage` con colección `"emu_latam"`, clave `"host_ip"`, valor `{ ip: "100.x.x.x", mode: "tailscale", timestamp: ... }`.
2. **Guest** al CONECTAR a Nakama:
   - Lee el Storage del host: `GET /v2/storage` con colección `"emu_latam"`, clave `"host_ip"`.
   - Auto-completa el campo IP del servidor y el campo JOIN VÍA TAILSCALE.
   - Opcional: dispara JOIN automáticamente si el host ya está listo.

### Ventajas
- ✅ Simple: usa la API REST de Nakama que ya existe.
- ✅ No requiere cambios en el servidor Nakama.
- ✅ El guest no necesita escribir nada.
- ✅ El host puede actualizar la IP si cambia (auto-refresh).

### Desventajas
- ❌ El guest necesita saber a qué sala conectarse (o usar un sistema de "última sala activa").
- ❌ Si hay múltiples hosts, hay que distinguir salas (usar `userId` del host como clave).

### APIs de Nakama involucradas
- `POST /v2/storage/{collection}/{key}` — write (solo host)
- `GET /v2/storage/{collection}/{key}?user_id={hostUserId}` — read (guest)

---

## Solución B: Sistema de Retos (Challenge existente)

### Cómo funciona
1. **Host** envía un reto (challenge) al guest via Nakama RPC.
2. El reto incluye `{ ip: "100.x.x.x", mode: "tailscale" }`.
3. **Guest** acepta el reto → se auto-completa la IP y se lanza JOIN.

### Ventajas
- ✅ Ya existe el andamiaje (ChallengeContext.tsx, ChallengeModal).
- ✅ Flujo más natural: "te envío una invitación, la aceptás".

### Desventajas
- ❌ **ChallengeContext.tsx tiene bugs conocidos** (handler `_conn` bloqueado).
- ❌ Requiere depuración del sistema de retos existente.
- ❌ El guest DEBE estar conectado a Nakama antes de recibir el reto.
- ❌ Más complejo que Storage.

---

## Solución C: Matchmaking de Nakama

### Cómo funciona
1. **Host** entra al matchmaker de Nakama con propiedades `{ mode: "tailscale", ip: "100.x.x.x" }`.
2. **Guest** entra al matchmaker buscando partidas.
3. Nakama hace match y notifica a ambos.
4. Guest recibe la IP del host automáticamente.

### Ventajas
- ✅ Escalable: soporta múltiples salas y jugadores.
- ✅ No requiere compartir IP manualmente.
- ✅ Experiencia tipo "buscar partida".

### Desventajas
- ❌ Más complejo de implementar (matchmaker + presences + notificaciones).
- ❌ Requiere manejo de estado de matchmaking en el cliente.
- ❌ Nakama Matchmaker tiene comportamientos no deterministas (timeouts, fails).
- ❌ Mayor latencia de conexión (el matchmaking toma tiempo).
- ❌ Requiere probar la API de Nakama Matchmaker.

---

## Comparación

| Aspecto | Storage | Retos | Matchmaking |
|---------|---------|-------|-------------|
| Complejidad | Baja | Media | Alta |
| Bugs preexistentes | Ninguno | Sí (ChallengeContext) | Ninguno |
| Experiencia UX | Buena | Muy buena | Excelente |
| Tiempo estimado | 1-2h | 4-6h (incluye debugging) | 8-12h |
| Riesgo | Bajo | Medio | Alto |
| Compatibilidad flujos actuales | ✅ Total | ⚠️ Parcial | ⚠️ Requiere cambios |

## Decisión preliminar
**Empezar con Solución A (Storage de Nakama)** por ser la más simple, rápida y de menor riesgo. Si el usuario prefiere otra, se puede pivotar.
