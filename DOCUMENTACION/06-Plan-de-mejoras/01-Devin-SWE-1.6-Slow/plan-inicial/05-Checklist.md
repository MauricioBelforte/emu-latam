# Checklist - Devin SWE-1.6 Slow: Sistema de Logging y Monitoreo

## Fase 1: Infraestructura de Logging

### Logger Core
- [ ] Crear archivo `client/src/main/logger.ts`
- [ ] Implementar clase Logger con constructor
- [ ] Implementar método info()
- [ ] Implementar método warn()
- [ ] Implementar método error()
- [ ] Implementar método debug()
- [ ] Implementar método writeLog() (async)
- [ ] Implementar método rotateLogFile()
- [ ] Implementar método formatLog()
- [ ] Agregar configuración de logging (maxFileSize, maxFiles)
- [ ] Crear directorio Logs si no existe
- [ ] Test de escritura de logs a archivo
- [ ] Test de rotación de archivos por tamaño

### Integración de Logger
- [ ] Reemplazar console.log con logger.info en index.ts
- [ ] Reemplazar console.error con logger.error en index.ts
- [ ] Agregar logger para módulo Nakama
- [ ] Agregar logger para módulo Bore
- [ ] Agregar logger para módulo RetroArch
- [ ] Agregar logger para módulo Relay

## Fase 2: Captura de Child Processes

### Nakama
- [ ] Modificar spawn de Nakama para usar stdio: 'pipe'
- [ ] Capturar stdout de Nakama
- [ ] Capturar stderr de Nakama
- [ ] Redirigir stdout a logger.info
- [ ] Redirigir stderr a logger.error
- [ ] Manejar errores de spawn de Nakama
- [ ] Test de captura de logs de Nakama

### Bore
- [ ] Modificar spawn de Bore para usar stdio: 'pipe'
- [ ] Capturar stdout de Bore
- [ ] Capturar stderr de Bore
- [ ] Redirigir stdout a logger.info
- [ ] Redirigir stderr a logger.error
- [ ] Manejar errores de spawn de Bore
- [ ] Test de captura de logs de Bore

### RetroArch
- [ ] Modificar spawn de RetroArch para usar stdio: 'pipe'
- [ ] Capturar stdout de RetroArch
- [ ] Capturar stderr de RetroArch
- [ ] Redirigir stdout a logger.info
- [ ] Redirigir stderr a logger.error
- [ ] Manejar errores de spawn de RetroArch
- [ ] Test de captura de logs de RetroArch

## Fase 3: Monitoreo de Recursos

### ResourceMonitor
- [ ] Crear archivo `client/src/main/resourceMonitor.ts`
- [ ] Implementar clase ResourceMonitor
- [ ] Implementar método start()
- [ ] Implementar método stop()
- [ ] Implementar método getMetrics()
- [ ] Implementar método getProcessMetrics()
- [ ] Implementar método updateMetrics()
- [ ] Agregar intervalo configurable (default 5s)
- [ ] Monitorear memoria (process.memoryUsage)
- [ ] Monitorear CPU (process.cpuUsage)
- [ ] Monitorear uptime
- [ ] Test de monitoreo de recursos

### IPC Handlers para Métricas
- [ ] Crear handler get-metrics en main process
- [ ] Exponer getMetrics en preload
- [ ] Test de obtención de métricas vía IPC

## Fase 4: Validación de Dependencias

### DependencyValidator
- [ ] Crear archivo `client/src/main/dependencyValidator.ts`
- [ ] Implementar clase DependencyValidator
- [ ] Implementar método validatePostgreSQL()
- [ ] Implementar método validatePort()
- [ ] Implementar método validateFile()
- [ ] Implementar método validateAll()
- [ ] Implementar método checkPostgreSQLConnection()
- [ ] Implementar método checkPortAvailable()
- [ ] Test de validación de PostgreSQL
- [ ] Test de validación de puertos
- [ ] Test de validación de archivos

### Integración de Validación
- [ ] Validar PostgreSQL antes de iniciar Nakama
- [ ] Validar puerto 7350 antes de iniciar Nakama
- [ ] Validar puerto 55435 antes de iniciar RetroArch
- [ ] Validar puerto 55436 antes de iniciar Bore
- [ ] Validar archivos de configuración
- [ ] Mostrar errores de validación en UI

## Fase 5: Cleanup Robusto

### CleanupManager
- [ ] Crear archivo `client/src/main/cleanupManager.ts`
- [ ] Implementar clase CleanupManager
- [ ] Implementar método register()
- [ ] Implementar método cleanupAll()
- [ ] Implementar método cleanupNakama()
- [ ] Implementar método cleanupBore()
- [ ] Implementar método cleanupRetroArch()
- [ ] Test de cleanup de procesos
- [ ] Test de cleanup de servidores

### Integración de Cleanup
- [ ] Registrar cleanup de Nakama
- [ ] Registrar cleanup de Bore
- [ ] Registrar cleanup de RetroArch
- [ ] Registrar cleanup de servidores TCP
- [ ] Registrar cleanup de file streams
- [ ] Agregar handler app.on('before-quit')
- [ ] Ejecutar cleanupAll en before-quit
- [ ] Test de cleanup al cerrar app

## Fase 6: UI de Estado en React

### StatusContext
- [ ] Crear archivo `client/src/context/StatusContext.tsx`
- [ ] Implementar StatusContext
- [ ] Implementar estado de Nakama
- [ ] Implementar estado de Bore
- [ ] Implementar estado de RetroArch
- [ ] Implementar método refreshStatus()
- [ ] Implementar polling cada 2s
- [ ] Exponer contexto en App.tsx
- [ ] Test de polling de estado

### ErrorBanner
- [ ] Crear archivo `client/src/components/ErrorBanner.tsx`
- [ ] Implementar componente ErrorBanner
- [ ] Implementar display de errores
- [ ] Implementar botón de dismiss
- [ ] Implementar auto-dismiss
- [ ] Implementar agrupación de errores
- [ ] Integrar en App.tsx
- [ ] Test de display de errores

### LoadingSpinner
- [ ] Crear archivo `client/src/components/LoadingSpinner.tsx`
- [ ] Implementar componente LoadingSpinner
- [ ] Implementar animación de spinner
- [ ] Implementar tamaño configurable
- [ ] Implementar mensaje opcional
- [ ] Integrar en App.tsx
- [ ] Test de display de spinner

### Integración en UI
- [ ] Integrar StatusContext en App.tsx
- [ ] Agregar ErrorBanner en App.tsx
- [ ] Agregar LoadingSpinner en App.tsx
- [ ] Deshabilitar botón INSERT COIN cuando Nakama no está listo
- [ ] Deshabilitar botón JOIN cuando Bore no está listo
- [ ] Mostrar spinner durante inicio de Nakama
- [ ] Mostrar spinner durante inicio de Bore
- [ ] Mostrar banner de error cuando hay problemas
- [ ] Test de UI completa

## Fase 7: IPC Handlers

### Main Process
- [ ] Crear handler get-status
- [ ] Crear handler get-metrics
- [ ] Crear handler validate-dependencies
- [ ] Test de handlers

### Preload
- [ ] Exponer getStatus en contextBridge
- [ ] Exponer getMetrics en contextBridge
- [ ] Exponer validateDependencies en contextBridge
- [ ] Test de preload

## Fase 8: Configuración

### Configuración de Logger
- [ ] Crear archivo `client/src/main/config.ts`
- [ ] Definir loggingConfig
- [ ] Definir monitoringConfig
- [ ] Definir uiConfig
- [ ] Integrar configuración en Logger
- [ ] Integrar configuración en ResourceMonitor
- [ ] Integrar configuración en StatusContext

## Fase 9: Testing

### Tests Unitarios
- [ ] Test de Logger (escritura, rotación, formato)
- [ ] Test de ResourceMonitor (métricas, intervalo)
- [ ] Test de DependencyValidator (PostgreSQL, puertos, archivos)
- [ ] Test de CleanupManager (registro, cleanup)

### Tests de Integración
- [ ] Test de captura de logs de Nakama
- [ ] Test de captura de logs de Bore
- [ ] Test de captura de logs de RetroArch
- [ ] Test de validación de dependencias
- [ ] Test de cleanup al cerrar app
- [ ] Test de polling de estado en React
- [ ] Test de UI de errores
- [ ] Test de UI de spinners

### Tests de Rendimiento
- [ ] Test de overhead de logging (<5ms)
- [ ] Test de overhead de monitoreo (<1% CPU)
- [ ] Test de overhead de polling (<2% CPU)
- [ ] Test de rotación de logs

## Fase 10: Documentación

### Documentación de Código
- [ ] Agregar JSDoc a Logger
- [ ] Agregar JSDoc a ResourceMonitor
- [ ] Agregar JSDoc a DependencyValidator
- [ ] Agregar JSDoc a CleanupManager
- [ ] Agregar JSDoc a StatusContext
- [ ] Agregar JSDoc a componentes React

### Documentación de Usuario
- [ ] Documentar configuración de logging
- [ ] Documentar configuración de monitoreo
- [ ] Documentar uso de UI de estado
- [ ] Documentar solución de problemas

## Fase 11: Validación Final

### Validación de Requisitos
- [ ] Todos los logs de servicios se capturan
- [ ] Logs se almacenan en archivos rotativos
- [ ] Métricas de rendimiento disponibles
- [ ] Manejo de errores mejorado
- [ ] Validación de dependencias implementada
- [ ] UI de estado en React funcionando
- [ ] UI de errores funcionando
- [ ] Spinners funcionando
- [ ] Cleanup robusto implementado
- [ ] Sistema no introduce latencia significativa

### Validación de No Breaking Changes
- [ ] Módulo 02-Integracion-Nakama sigue funcionando
- [ ] Módulo 03-Integracion-Bore sigue funcionando
- [ ] Módulo 04-Anti-Lag-RunAhead sigue funcionando
- [ ] Módulo 05-MITM-to-Transparent-Relay sigue funcionando
- [ ] Tests existentes siguen pasando

## Resumen

**Total de tareas:** 120
**Completadas:** 0
**Pendientes:** 120
**Progreso:** 0%
