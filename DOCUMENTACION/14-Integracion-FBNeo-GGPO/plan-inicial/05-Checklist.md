# Checklist: Integración FBNeo + GGPO

## Fase 1: Compilación y validación del binario
- [ ] Clonar `fightcadeorg/fightcade-fbneo`
- [ ] Instalar VS2015+ y dependencias (DirectX SDK, Perl, NASM)
- [ ] Ejecutar `games.bat` para generar lista de juegos
- [ ] Compilar solución VS2015 en Release x86
- [ ] Validar `fcadefbneo.exe` generado en `build/`
- [ ] Identificar DLLs necesarias con `dumpbin /dependents`
- [ ] Probar `quark:direct` manualmente en LAN (2 PCs) con KOF 98
- [ ] Documentar proceso de compilación en `04-Codigo.md` (plan-actual)
- [ ] Agregar binario compilado + DLLs a `client/resources/fcadefbneo/`
- [ ] Agregar `compile-fbneo.ps1` a `client/src/scripts/`

## Fase 2: Backend (Main Process)
- [ ] Crear `client/src/main/ggpo-handler.ts`
- [ ] Crear `client/src/lib/ggpo.ts` con helpers
- [ ] Implementar `buildQuarkArgs()`
- [ ] Implementar `findFcadefbneo()` (búsqueda en resources y project root)
- [ ] Implementar `resolveGgpoIp()` (LAN y Tailscale)
- [ ] Implementar `findAvailableUdpPort()` (fallback a puerto+1)
- [ ] Registrar handler `launch-game-ggpo` en `index.ts`
- [ ] Registrar handler `kill-ggpo-process` en `index.ts`
- [ ] Agregar `ggpoProcess` a limpieza global (`app.on('before-quit')`)
- [ ] Implementar polling a Nakama Storage (host esperando guest)
- [ ] Implementar actualización dinámica de args cuando guest se conecta

## Fase 3: Frontend (Renderer)
- [ ] Agregar `engine` state en `MethodPicker.tsx`
- [ ] Render condicional del toggle RetroArch / GGPO
- [ ] Deshabilitar toggle cuando method === 'bore' (con tooltip explicativo)
- [ ] Agregar botones "CREAR SALA GGPO" y "UNIRSE A SALA GGPO" en App.tsx
- [ ] Conectar botones al IPC `launch-game-ggpo`
- [ ] Mostrar estado de espera (ESPERANDO OPONENTE...)
- [ ] Mostrar error si binario no encontrado
- [ ] Conectar botón "CERRAR SALA" al IPC `kill-ggpo-process`

## Fase 4: Nakama Storage
- [ ] Implementar `publishGgpoRoom()` en `nakama.ts`
- [ ] Implementar `fetchGgpoRoom()` en `nakama.ts`
- [ ] Implementar `updateGgpoRoom()` en `nakama.ts`
- [ ] Implementar `deleteGgpoRoom()` en `nakama.ts`
- [ ] Key: `emu_latam_ggpo_rooms/active_host`

## Fase 5: Testing
- [ ] Ejecutar plan de testings completo (ver `06-Plan-Testings.md`)
- [ ] Prueba unitaria: `buildQuarkArgs()` produce string correcto
- [ ] Prueba unitaria: `findFcadefbneo()` encuentra binario
- [ ] Prueba unitaria: `resolveGgpoIp()` devuelve IP correcta según modo
- [ ] Prueba unitaria: `findAvailableUdpPort()` encuentra puerto libre
- [ ] Prueba de integración: host crea sala, guest se une (LAN)
- [ ] Prueba de integración: host crea sala, guest se une (Tailscale)
- [ ] Prueba de integración: toggle deshabilitado en modo Bore
- [ ] Prueba de integración: Nakama Storage pub/sub funciona
- [ ] Prueba de error: binario no encontrado → mensaje claro
- [ ] Prueba de error: puerto ocupado → fallback funciona
- [ ] Prueba de error: guest timeout → sala se cierra
- [ ] Prueba de error: Nakama caído → error controlado
- [ ] Prueba de limpieza: cerrar sala mata fcadefbneo, libera puertos
- [ ] Prueba de limpieza: app.on('before-quit') mata GGPO si está activo
- [ ] Prueba de no-regresión: RetroArch host directo sigue funcionando
- [ ] Prueba de no-regresión: RetroArch host con bore sigue funcionando
- [ ] Prueba de no-regresión: RetroArch join sigue funcionando

## Fase 6: Documentación
- [ ] Actualizar `plan-actual/` con resultados de implementación
- [ ] Actualizar `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md`
- [ ] Actualizar `DOCUMENTACION/README.md` con entrada del módulo 14
- [ ] Generar log en `Logs/`
- [ ] Crear `AGENTS.md` §14 si es necesario (nuevos flujos bloqueados)
