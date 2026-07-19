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
- [ ] Handler `read-netplay-config` en index.ts
- [ ] Handler `write-netplay-config` en index.ts
- [ ] Handler `restore-netplay-config` en index.ts
- [ ] Verificar que los handlers compilan (npm run dev)

## Fase 3: Componente NetplayConfigModal
- [ ] Crear componente con Overlay + ModalBox
- [ ] Loader de config al abrir
- [ ] Slider para check_frames (valores discretos)
- [ ] Sliders para lat_min y lat_range (0-3)
- [ ] Toggle para run_ahead_enabled
- [ ] Botón GUARDAR con feedback
- [ ] Botón RESTAURAR con feedback
- [ ] Botón CERRAR / click fuera para cerrar

## Fase 4: Integración en UI
- [ ] Agregar prop `showNetplayConfig` / `onToggleNetplayConfig` a HeaderProps
- [ ] Agregar botón ⚙ en Header
- [ ] Pasar props desde AppShell
- [ ] Agregar estado y modal en App.tsx

## Fase 5: Testing
- [ ] Test: lectura de config muestra valores correctos
- [ ] Test: escritura de un valor persiste al .cfg
- [ ] Test: restaurar valores vuelve a defaults
- [ ] Test: abrir/cerrar modal no crashea
- [ ] Test: lanzar partida con valores modificados funciona

## Fase 6: Verificación
- [ ] npm run dev sin errores
- [ ] Commit y push
- [ ] Git pull en ambas PCs y probar
