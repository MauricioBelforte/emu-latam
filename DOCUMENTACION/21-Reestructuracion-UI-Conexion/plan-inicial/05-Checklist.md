# Checklist - Reestructuración UI de Conexión

## Fase 1: Preparación

- [ ] Leer AGENTS.md completo
- [ ] Leer documentación de este módulo (01-07)
- [ ] Leer el mensaje en `Mensajes entre modelos/02-Reestructuracion-UI-Conexion/`
- [ ] Hacer backup de App.tsx en `Obsoletos/`
- [ ] Hacer backup de MethodPicker.tsx en `Obsoletos/`
- [ ] Hacer backup de ChallengeModal.tsx en `Obsoletos/`
- [ ] Hacer backup de ChallengeContext.tsx en `Obsoletos/`

## Fase 2: Refactorizar Variables de Estado (App.tsx)

- [ ] Eliminar estado `isP2pSala`
- [ ] Eliminar estado `isBootstrapSala`
- [ ] Eliminar estado `showOtherMethods`
- [ ] Agregar estado `salaType: "tailscale" | "p2p" | null`
- [ ] Actualizar todos los usos de `isP2pSala` → `salaType === "p2p"`
- [ ] Actualizar todos los usos de `isBootstrapSala` → `salaType === "p2p"`
- [ ] Actualizar `joinMode` para incluir `"p2p-code"` como opción
- [ ] Actualizar el handler de `onBack` para resetear `salaType`

## Fase 3: Refactorizar Pantalla Principal (Pre-Auth)

- [ ] Eliminar sección "SALA P2P (SIN TERCEROS)" (fucsia, L836-L886)
- [ ] Eliminar sección "CONEXIÓN VÍA P2P (SIN TAILSCALE)" (verde, L889-L970)
- [ ] Mantener sección "SALA TAILSCALE" (L797-L835) → agregar `setSalaType("tailscale")`
- [ ] Crear nueva sección "SALA P2P" (verde #0f0)
- [ ] Implementar botón "CREAR SALA" P2P con handler `handleCreateSalaP2p`
- [ ] Implementar botón "UNIRSE A SALA" P2P con handler `handleJoinSalaP2p`
- [ ] Implementar vista de "código P2P" cuando `joinMode === "p2p-code"`
- [ ] Verificar que la auto-detección LAN funcione en `handleJoinSalaP2p`

## Fase 4: Refactorizar Post-Autenticación

- [ ] Simplificar info de sala usando `salaType` en vez de `isP2pSala`/`isBootstrapSala`
- [ ] Eliminar sección colapsable "OTROS MÉTODOS DE CONEXIÓN" completa
- [ ] Mantener GgpoToggle
- [ ] Mantener vistas GGPO host/guest
- [ ] Agregar botón pequeño "DEBUG" al fondo (reemplaza sección Debug)
- [ ] Verificar que el toggle RETROARCH/GGPO sigue funcional

## Fase 5: MethodPicker Dinámico

- [ ] Agregar props `salaType` y `engine` a MethodPicker
- [ ] Implementar función `getAvailableMethods(salaType, engine)`
- [ ] Verificar filtrado: Tailscale+RA → [Tailscale, LAN]
- [ ] Verificar filtrado: Tailscale+GGPO → [Tailscale]
- [ ] Verificar filtrado: P2P+RA → [P2P, LAN, Bore]
- [ ] Verificar filtrado: P2P+GGPO → [P2P, LAN]
- [ ] Actualizar ChallengeModal para pasar props al MethodPicker

## Fase 6: ChallengeContext

- [ ] Agregar `salaType` a `ChallengeData`
- [ ] Actualizar `selectMethod` para usar `salaType` en vez de `__BOOTSTRAP_ACTIVE__`
- [ ] Verificar que `acceptChallenge` funcione con el nuevo esquema
- [ ] Verificar que `connection_info` (host→guest) funcione correctamente
- [ ] Verificar que `challenge_guest_ready` (GGPO) funcione correctamente

## Fase 7: Testing

- [ ] Ejecutar `npm run dev` sin errores
- [ ] Verificar que la pantalla principal muestra 4 botones (2 secciones)
- [ ] Verificar "CREAR SALA" Tailscale funciona
- [ ] Verificar "UNIRSE A SALA" Tailscale funciona
- [ ] Verificar "CREAR SALA" P2P genera código
- [ ] Verificar "UNIRSE A SALA" P2P intenta LAN y luego pide código
- [ ] Verificar toggle RETROARCH/GGPO funciona post-auth
- [ ] Verificar MethodPicker muestra opciones correctas según contexto
- [ ] Verificar que el sistema de retos funciona end-to-end
- [ ] Verificar que no se rompieron flujos estables (AGENTS.md §15)

## Fase 8: Documentación

- [ ] Copiar plan-inicial a plan-actual
- [ ] Actualizar 04-Codigo.md con cambios reales
- [ ] Actualizar 05-Checklist.md marcando completados
- [ ] Crear log en `Logs/`
- [ ] Actualizar `Logs/ULTIMO_NUMERO.txt`
- [ ] Actualizar `DOCUMENTACION/README.md` con nuevo módulo
- [ ] Actualizar `DOCUMENTACION/2-DOCUMENTO-DISENO-ACTUAL.md`
