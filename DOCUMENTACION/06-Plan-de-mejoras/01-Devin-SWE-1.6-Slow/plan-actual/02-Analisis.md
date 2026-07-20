# Análisis - Devin SWE-1.6 Slow: Sistema de Logging y Monitoreo

## Análisis del Dominio

### Estado Actual del Proyecto

El proyecto Emu Latam tiene 5 módulos principales implementados:
1. **01-Setup-Electron-Vite:** Setup inicial de Electron + Vite + React
2. **02-Integracion-Nakama:** Lanzamiento de Nakama con health check
3. **03-Integracion-Bore:** Túneles dinámicos con Bore
4. **04-Anti-Lag-RunAhead:** Configuración anti-lag para RetroArch
5. **05-MITM-to-Transparent-Relay:** Forwarder TCP transparente

### Problemas Identificados por Módulo

#### Módulo 02-Integracion-Nakama
- Logs de Nakama ignorados (`stdio: "ignore"`)
- No hay logging persistente a archivo
- Catch vacío al matar proceso
- No hay cleanup explícito en app.quit
- No hay validación de PostgreSQL
- No hay validación de puertos ocupados
- No hay polling de estado en React
- No hay UI de errores

#### Módulo 03-Integracion-Bore
- Tests automatizados completos (51/51)
- No hay monitoreo de recursos de Bore
- No hay métricas de latencia del túnel

#### Módulo 04-Anti-Lag-RunAhead
- Tests automatizados completos (74/74)
- No hay monitoreo de impacto de configuraciones
- No hay validación de que config se aplicó correctamente

#### Módulo 05-MITM-to-Transparent-Relay
- Tests automatizados completos (62/62)
- No hay monitoreo de throughput del forwarder
- No hay métricas de latencia del relay

## Alternativas Consideradas

### Alternativa 1: Usar Winston (librería de logging)
**Ventajas:**
- Solución probada y robusta
- Soporta múltiples transports (archivo, consola, HTTP)
- Rotación automática de logs
- Logs estructurados en JSON

**Desventajas:**
- Agrega dependencia externa
- Overhead adicional
- Configuración compleja

**Decisión:** No usar. Se prefiere solución nativa para minimizar dependencias.

### Alternativa 2: Usar PM2 para gestión de procesos
**Ventajas:**
- Gestión automática de procesos
- Logging integrado
- Monitoreo de recursos
- Auto-restart

**Desventajas:**
- Agrega dependencia externa
- Complejidad adicional
- No se integra nativamente con Electron

**Decisión:** No usar. Se prefiere solución integrada en Electron main process.

### Alternativa 3: Sistema de logging nativo Node.js
**Ventajas:**
- Sin dependencias externas
- Control total sobre implementación
- Integración nativa con child processes
- Bajo overhead

**Desventajas:**
- Requiere implementación manual
- Sin features avanzadas out-of-the-box

**Decisión:** Usar esta alternativa. Permite control total y mínimo overhead.

## Decisiones de Arquitectura

### 1. Logger Centralizado
Crear un módulo `Logger` en `client/src/main/logger.ts` que:
- Tenga métodos para diferentes niveles (info, warn, error, debug)
- Escriba a consola y archivo simultáneamente
- Soporte rotación de archivos por tamaño
- Use timestamps y niveles de severidad

### 2. Captura de Child Processes
Modificar spawn de child processes para:
- Usar `pipe` en lugar de `ignore` para stdio
- Redirigir stdout/stderr al logger
- Capturar errores de spawn
- Limpiar streams al cerrar proceso

### 3. Monitoreo de Recursos
Crear módulo `ResourceMonitor` en `client/src/main/resourceMonitor.ts` que:
- Use `process.memoryUsage()` para memoria
- Use `process.cpuUsage()` para CPU
- Mida tiempo de inicio de servicios
- Exponga métricas vía IPC

### 4. Validación de Dependencias
Crear módulo `DependencyValidator` en `client/src/main/dependencyValidator.ts` que:
- Verifique disponibilidad de PostgreSQL
- Verifique puertos no estén ocupados
- Verifique archivos necesarios existan
- Retorne errores específicos con contexto

### 5. Cleanup Robusto
Agregar handlers en `app.on('before-quit')` para:
- Matar todos los child processes
- Cerrar todos los servidores TCP
- Limpiar todos los timers
- Cerrar todos los file streams
- Esperar cleanup antes de salir

### 6. UI de Estado en React
Crear contexto `StatusContext` en React que:
- Haga polling de estado vía IPC cada 2s
- Muestre estado de cada servicio (Nakama, Bore, RetroArch)
- Muestre banners de error cuando haya problemas
- Deshabilite botones cuando servicios no estén listos
- Muestre spinners durante operaciones asíncronas

## Trade-offs

### Logging vs Rendimiento
**Decisión:** Logging asíncrono para minimizar impacto en rendimiento. Escribir a archivo en background.

### Detalle vs Simplicidad
**Decisión:** Logs estructurados pero simples (timestamp + nivel + mensaje). No JSON complejo para mantener legibilidad.

### Centralización vs Modularidad
**Decisión:** Logger centralizado pero cada módulo puede tener su propio logger con prefijo. Balance entre consistencia y flexibilidad.

## Riesgos

1. **Overhead de logging:** Puede impactar rendimiento de netplay
   - **Mitigación:** Logging asíncrono, buffer de escritura, opción de desactivar

2. **Espacio en disco:** Logs pueden crecer indefinidamente
   - **Mitigación:** Rotación por tamaño (max 10MB por archivo, max 5 archivos)

3. **Fuga de memoria:** Streams no cerrados correctamente
   - **Mitigación:** Cleanup robusto, tests específicos de memory leaks

4. **Complejidad de UI:** Polling puede causar re-renders innecesarios
   - **Mitigación:** Debouncing, memoización, polling solo cuando visible

## Métricas de Éxito

1. **Captura de logs:** 100% de logs de servicios capturados
2. **Overhead:** <5ms impacto en operaciones críticas
3. **Cleanup:** 0 procesos huérfanos al cerrar app
4. **Validación:** 100% de dependencias verificadas antes de iniciar
5. **UI:** Estado visible en <2s después de cambio
6. **Storage:** Logs ocupan <50MB en disco
