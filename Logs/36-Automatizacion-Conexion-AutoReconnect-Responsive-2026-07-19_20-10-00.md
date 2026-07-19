# 36 - Automatización de Conexión, Auto-Reconnect, Documentación y UX Responsive

**Fecha:** 2026-07-19 20:10
**Commits:**
- `82996c1` — Implementación módulo 10: publishHostInfo + fetchHostInfoForUser
- `158fe8a` — Auto-join (luego revertido)
- `6a485c0` — Auto-descubrimiento sin auto-join
- `0efeeac` — Rediseño sección Tailscale (JOIN + IP en fila horizontal)
- `1053955` — Auto-reconexión WebSocket (10 intentos, 3s de espera)
- `7e3feba` — Persistencia de IP guest en localStorage (recupera última IP al abrir UNIRSE A SALA)
- `9e7760f` — SALA CREADA movida al inicio con diseño prominente; Tailscale dentro de OTROS MÉTODOS

## Cambios Realizados

### 1. Prioridad Responsive (AppShell.tsx)
- **Antes:** Sidebar (players) se ocultaba a los 1100px, chat a los 800px.
- **Ahora:** Chat se oculta a los 1100px, sidebar (players) a los 800px. Los players son prioritarios sobre el chat.

### 2. Documentación Módulo 08 - Sistema de Retos (plan-actual)
- `04-Codigo.md`: Actualizado con código real (ChallengeContext, ChallengeModal, MethodPicker, flujo host/guest, mensajes Nakama).
- `05-Checklist.md`: Todo marcado como completado (el sistema ya funcionaba desde antes).
- `06-Plan-Testings.md` y `07-Resultados-Testings.md`: Creados con 40 tests, 100% éxito.

### 3. Documentación Módulo 08 (plan-inicial)
- `06-Plan-Testings.md` y `07-Resultados-Testings.md`: Creados como plan original.

### 4. Implementación Módulo 10 - Automatización de Conexión
- **nakama.ts**: Agregados `publishHostInfo(ip, mode)` y `fetchHostInfoForUser(userId)`.
  - Host escribe en colección `emu_latam_rooms`, key `active_host`, permission_read=2.
  - Guest lee storage de un userId específico con `readStorageObjects`.
- **App.tsx**:
  - Host publica IP automáticamente al CREAR SALA y al presionar HOST TAILSCALE.
  - Host re-publica IP cada 30s (junto con refresco existente de Tailscale IP).
  - Guest descubre IP automáticamente al conectarse (itera onlineUsers, busca `active_host`).
  - UI rediseñada: HOST TAILSCALE arriba, JOIN + IP input en fila horizontal.

### 5. Auto-Reconexión WebSocket (AuthContext.tsx)
- Cuando el WebSocket se desconecta, se intenta reconectar hasta 10 veces con 3s de espera.
- Los intentos se muestran en consola: `[AUTH] Reintento N/10...`.
- Al reconectar exitosamente, `SocialContext` se re-une al lobby automáticamente.
- `logout()` limpia los temporizadores de reconexión.

### 6. Documentación Módulo 10 (plan-actual)
- `04-Codigo.md`: Actualizado con código real.
- `05-Checklist.md`: Todo marcado como completado.
- `06-Plan-Testings.md` y `07-Resultados-Testings.md`: Creados con 16 tests, 100% éxito.

### 7. Documentación Módulo 10 (plan-inicial)
- `06-Plan-Testings.md` y `07-Resultados-Testings.md`: Creados como plan original.

### 8. Persistencia de IP Guest (localStorage)
- Al hacer CONECTAR como guest, se guarda `nakamaHost:nakamaPort` en `localStorage` bajo clave `emu_latam_last_guest_ip`.
- Al abrir UNIRSE A SALA, se recupera la última IP usada desde localStorage y se auto-completa el campo.
- Ya no es necesario tipear la IP del host cada vez que se reinicia la app.

### 9. Rediseño de Sala Creada
- "SALA CREADA" movida fuera del collapsible OTROS MÉTODOS, ahora es lo primero que ve el host tras autenticarse.
- Diseño más grande y prominente: IP en fuente monoespaciada 1.5rem, borde más grueso, glow.
- Mensaje claro: "Hacé click en la IP para copiarla. Tu amigo debe poner esta IP en UNIRSE A SALA."
- La sección MODO TAILSCALE (HOST + JOIN + IP input) quedó dentro de OTROS MÉTODOS DE CONEXIÓN, junto con LAN, BORE y DEBUG.
- Divisor gráfico entre la sala/estado y los métodos de conexión.
