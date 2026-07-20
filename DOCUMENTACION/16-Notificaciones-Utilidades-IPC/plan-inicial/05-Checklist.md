# Checklist: Notificaciones, Utilidades Compartidas y Seguridad IPC

## Fase 1: Servicios Main Process
- [x] Crear `ipcChannels.ts` con enum IPC_CHANNELS y whitelist
- [x] Crear `portUtils.ts` con isPortInUse, assertPortFree
- [x] Crear `relayConfigStore.ts` con read/write/clear (userData + legacy)
- [x] Agregar IPC handlers en index.ts: assert-port-free, get/set/clear-relay-config

## Fase 2: Preload
- [x] Importar IPC_WHITELIST en preload/index.ts
- [x] Validar canal antes de invoke (rechazar si no está en whitelist)

## Fase 3: Toast System
- [x] Crear `ToastContext.tsx` con provider y hook useToast
- [x] Crear `ToastHost.tsx` con render visual (top-right, colores por kind)
- [x] Envolver app con <ToastProvider> en main.tsx
- [x] Renderizar <ToastHost /> en App.tsx

## Fase 4: Verificación
- [x] `npm run build` compila sin errores
- [ ] Toast show/dismiss funciona correctamente (manual)
- [ ] IPC whitelist rechaza canales desconocidos (manual)
- [ ] assertPortFree detecta puertos ocupados (manual)
- [ ] relayConfigStore lee/escribe correctamente con fallback (manual)
- [ ] No hay regresiones en flujos existentes (manual)

## Fase 5: Documentación
- [x] Crear 7 archivos en plan-inicial
- [x] Copiar a plan-actual
- [x] Actualizar DOCUMENTACION/README.md
