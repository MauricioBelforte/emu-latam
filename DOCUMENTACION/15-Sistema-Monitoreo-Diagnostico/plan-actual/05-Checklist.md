# Checklist: Sistema de Monitoreo y Diagnóstico

## Fase 1: Módulos Main Process
- [x] Crear `client/src/main/cleanupManager.ts` — register, unregister, cleanupAll, getRegisteredCleanups
- [x] Crear `client/src/main/dependencyValidator.ts` — validateBinaries, validateFile
- [x] Crear `client/src/main/resourceMonitor.ts` — getMetrics con memoria y procesos
- [x] Crear `client/src/main/logger.ts` — logInfo, logWarn, logError, logDebug

## Fase 2: Integración en index.ts
- [x] Importar cleanupManager, dependencyValidator, resourceMonitor, logger
- [x] Agregar IPC handler `get-status` (retorna estado de nakamaProcess, boreProcess, retroarchProcess, metrics, dependencies)
- [x] Agregar IPC handler `get-metrics` (retorna métricas de resourceMonitor)
- [x] Agregar IPC handler `validate-dependencies` (valida binarios existentes)
- [x] Registrar cleanups para nakamaProcess, boreProcess, proxyServers, forwarderServers
- [x] Modificar `before-quit` para usar `cleanupAll()` en lugar de kills manuales
- [x] Reemplazar console.log/error en secciones clave por logger.info/error

## Fase 3: Frontend
- [x] Crear `client/src/context/StatusContext.tsx` — contexto con polling get-status cada 2s
- [x] Crear `client/src/components/ErrorBanner.tsx` — banner con auto-dismiss
- [x] Integrar StatusProvider en App.tsx (envuelve la app)
- [x] Integrar ErrorBanner en App.tsx (escucha `electron.onError`, muestra/oculta errores)

## Fase 4: Preload
- [x] Exponer `getStatus`, `getMetrics`, `validateDependencies`, `onError` en preload

## Fase 5: Verificación
- [x] `npm run build` compila sin errores
- [ ] `npm run dev` inicia sin errores
- [ ] IPC `get-status` responde datos correctos
- [ ] IPC `get-metrics` responde datos correctos
- [ ] IPC `validate-dependencies` responde datos correctos
- [ ] cleanupAll ejecuta todas las funciones registradas
- [ ] before-quit limpia procesos correctamente
- [ ] StatusContext recibe actualizaciones cada 2s

## Fase 6: Documentación
- [x] Crear 7 archivos en plan-inicial
- [x] Copiar a plan-actual
- [ ] Actualizar DOCUMENTACION/README.md
