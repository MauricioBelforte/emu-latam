# 05 - Checklist - Editor de Configuración Netplay

## Fase 1: Documentación
- [x] 01-Requerimientos.md
- [x] 02-Analisis.md
- [x] 03-Diseno.md
- [x] 04-Codigo.md
- [x] 05-Checklist.md
- [x] 06-Plan-Testings.md
- [x] 07-Resultados-Testings.md

## Fase 2: Implementación Main Process
- [x] Handler `read-netplay-config` en index.ts
- [x] Handler `write-netplay-config` en index.ts
- [x] Handler `restore-netplay-config` en index.ts
- [x] `netplay_input_block_timeout` agregado a claves editables y defaults
- [x] Verificar que los handlers compilan (npm run dev)

## Fase 3: Componente NetplayConfigModal
- [x] Crear componente con Overlay + ModalBox
- [x] Loader de config al abrir
- [x] Slider para check_frames (valores discretos OFF/30/60/120/180/300/600)
- [x] Sliders para lat_min y lat_range (0-3 con +/-)
- [x] Toggle para run_ahead_enabled
- [x] Tooltips en español con delay 1s (TooltipLabel + CSS ::after)
- [x] Campo input_block_timeout (OFF/1/3/10)
- [x] Botón GUARDAR con feedback
- [x] Botón RESTAURAR con feedback
- [x] Botón CERRAR / click fuera para cerrar

## Fase 4: Integración en UI
- [x] Agregar prop `showNetplayConfig` / `onToggleNetplayConfig` a HeaderProps
- [x] Agregar botón ⚙ en Header
- [x] Pasar props desde AppShell
- [x] Agregar estado y modal en App.tsx

## Fase 5: Testing
- [x] Test: lectura de config muestra valores correctos
- [x] Test: escritura de un valor persiste al .cfg
- [x] Test: restaurar valores vuelve a defaults
- [x] Test: abrir/cerrar modal no crashea
- [x] Test: npm run dev sin errores

## Fase 6: Verificación
- [x] npm run dev sin errores
- [x] Commit y push (27f1ad0, c431629, 3ae7db9)
- [x] Git pull en ambas PCs y probar
