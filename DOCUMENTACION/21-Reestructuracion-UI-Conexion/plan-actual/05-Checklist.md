# Checklist - Reestructuración UI de Conexión (PLAN ACTUAL)

## Estado: PENDIENTE

## Fase A: Debug del Data Path Bootstrap

### A.1 Verificar infraestructura
- [ ] Verificar que `startBoreTunnel` NO use `taskkill /f /im bore.exe` (no mate el bore de Nakama)
- [ ] Verificar que `handleBootstrapGgpoRelayHost` cree bien el UDP relay + TCP server
- [ ] Verificar que `handleBootstrapGgpoRelayGuest` conecte TCP al bore y cree forwarder UDP
- [ ] Verificar que los IPCs (`bootstrap-ggpo-relay-host/guest/close`) estén registrados en `index.ts`

### A.2 Pruebas locales (una máquina)
- [ ] Probar `bootstrap-ggpo-relay-host` solo (crear relay + verificar que escuche)
- [ ] Probar `bootstrap-ggpo-relay-guest` solo (conectar a bore + verificar forwarder)
- [ ] Probar loop local: guest → forwarder → TCP → host TCP → relay → UDP eco
- [ ] Verificar que GGPO host conecte a `127.0.0.1:relayPort`
- [ ] Verificar que GGPO guest conecte a `127.0.0.1:forwarderPort`

### A.3 Pruebas con el flujo completo
- [ ] Crear sala verde como host
- [ ] Unirse desde guest (misma máquina, con código)
- [ ] Enviar reto P2P (fuccia) con GGPO toggle activo
- [ ] Verificar que connection_info se reciba en guest
- [ ] Verificar que `bootstrap-ggpo-relay-guest` se ejecute
- [ ] Verificar que `ggpo-launch` se ejecute en ambos lados
- [ ] Si falla: capturar logs y diagnosticar

### A.4 Pruebas entre 2 PCs
- [ ] Probar con RetroArch (más tolerante a latencia)
- [ ] Probar con GGPO
- [ ] Verificar que la pelea se conecte correctamente

## Fase B: Simplificar UI

### B.1 Preparación
- [ ] Hacer backup de `App.tsx` en `Obsoletos/`
- [ ] Hacer backup de `ChallengeContext.tsx` en `Obsoletos/`
- [ ] Ejecutar `npm run dev` y verificar que todo funciona ANTES de cambios

### B.2 Agregar salaType (sin eliminar nada)
- [ ] Agregar `salaType: "tailscale" | "p2p" | null` state en App.tsx
- [ ] Sincronizar `salaType` con `setIsBootstrapSala` y `setIsP2pSala`
- [ ] Agregar `(window as any).SALA_TYPE__ = salaType` para que ChallengeContext lo lea

### B.3 Reemplazar secciones fucsia + verde
- [ ] Eliminar la sección "SALA P2P (SIN TERCEROS)" (fucsia)
- [ ] Eliminar la sección "CONEXIÓN VÍA P2P (SIN TAILSCALE)" (verde)
- [ ] Crear nueva sección unificada "SALA P2P" (verde)
- [ ] Botón "CREAR SALA" → llama `handleCreateP2pSala`
- [ ] Botón "UNIRSE A SALA" → muestra input de código
- [ ] Verificar que el host vea el código generado
- [ ] Verificar que el guest pueda ingresar código y conectar

### B.4 Eliminar colapsable
- [ ] Eliminar `showOtherMethods` state
- [ ] Eliminar el bloque `<Collapsible title="OTROS MÉTODOS"...>`
- [ ] Agregar botón DEBUG pequeño al fondo

### B.5 MethodPicker dinámico
- [ ] Leer `salaType` (desde window o desde las props)
- [ ] Leer `engine` del toggle GGPO/RetroArch
- [ ] Filtrar métodos disponibles según la tabla de 03-Diseno.md

### B.6 Limpiar estados viejos
- [ ] Una vez verificado que todo anda, eliminar `isP2pSala`
- [ ] Eliminar `isBootstrapSala`
- [ ] Reemplazar todos los usos por `salaType === "p2p"` o `salaType === "tailscale"`

### B.7 Testing final
- [ ] `npm run dev` sin errores
- [ ] `test_stable_flows.js` — 50/51 (mismo fail preexistente)
- [ ] `test_p2p_ggpo.js` — 39/39
- [ ] `test_ggpo_p2p_wan.js` — 17/17
- [ ] `test_bootstrap.js` — 45/45 (o más si se agregaron tests)
- [ ] Probar flujo Tailscale completo
- [ ] Probar flujo P2P completo (crear sala, unirse, retar, pelear)

## Prioridad

**Fase A es requisito para Fase B.** No empezar B hasta que A esté completado.
