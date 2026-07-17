# Plan de Testings - Integracion-Nakama

## Pruebas Unitarias
- [ ] Verificar que Nakama se inicia en modo headless correctamente
- [ ] Verificar que el health check de Nakama responde correctamente
- [ ] Verificar que el handler IPC `check-nakama-health` funciona correctamente
- [ ] Verificar que Nakama se detiene correctamente al cerrar la aplicación
- [ ] Verificar que el proceso de Nakama se mata correctamente (child.kill)
- [ ] Verificar que los logs de Nakama se escriben correctamente

## Pruebas de Integración
- [ ] Verificar que Nakama se conecta a PostgreSQL correctamente
- [ ] Verificar que el main process de Electron puede comunicarse con Nakama
- [ ] Verificar que el renderer process puede consultar el estado de Nakama vía IPC
- [ ] Verificar que el estado de Nakama se actualiza en la UI de React
- [ ] Verificar que el botón "INSERT COIN" se habilita solo cuando Nakama está listo

## Casos Límite (Edge Cases)
- [ ] Verificar comportamiento cuando PostgreSQL no está disponible
- [ ] Verificar comportamiento cuando Nakama falla al iniciar
- [ ] Verificar comportamiento cuando el puerto de Nakama está ocupado
- [ ] Verificar comportamiento cuando Nakama se cierra inesperadamente
- [ ] Verificar comportamiento cuando hay múltiples instancias de Nakama

## Manejo de Errores
- [ ] Verificar manejo de errores cuando Nakama no responde al health check
- [ ] Verificar manejo de errores cuando PostgreSQL no se puede conectar
- [ ] Verificar que los errores se muestran en la consola
- [ ] Verificar que los errores se registran en main_process.log
- [ ] Verificar que la UI muestra estado de error cuando Nakama falla

## Pruebas de Rendimiento
- [ ] Verificar tiempo de inicio de Nakama (< 5 segundos)
- [ ] Verificar tiempo de respuesta del health check (< 1 segundo)
- [ ] Verificar uso de memoria de Nakama en modo headless
- [ ] Verificar que el polling de health check no consume excesivos recursos

## Resultados de Ejecución
- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todos los manejos de errores pasaron
- [ ] Todas las pruebas de rendimiento pasaron

## Fecha de Ejecución: 2026-07-16
## Estado: PENDIENTE
