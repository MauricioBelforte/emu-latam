# Requerimientos - Devin SWE-1.6 Slow: Sistema de Logging y Monitoreo

## Problema Identificado

Basado en el análisis de los módulos existentes (02-Integracion-Nakama, 03-Integracion-Bore, 04-Anti-Lag-RunAhead, 05-MITM-to-Transparent-Relay), se identificaron los siguientes problemas críticos:

### Problemas de Logging y Observabilidad
1. **Logs de Nakama ignorados:** `stdio: "ignore"` en spawn hace que los logs de Nakama no se capturen
2. **No hay logging persistente:** Errores solo van a consola, no a archivo
3. **No hay monitoreo de recursos:** No se mide uso de memoria, CPU, o tiempo de inicio
4. **No hay métricas de rendimiento:** No hay medición de latencia, throughput, o tiempos de respuesta
5. **No hay logs estructurados:** Logs son strings simples, no JSON estructurado
6. **No hay niveles de log:** Todo es console.log/console.error sin severidad diferenciada

### Problemas de Manejo de Errores
7. **Catch vacíos:** Errores al matar procesos se ignoran silenciosamente
8. **No hay cleanup explícito:** Procesos pueden quedar corriendo al cerrar la app
9. **No hay validación de dependencias:** PostgreSQL no se verifica antes de iniciar Nakama
10. **No hay validación de puertos ocupados:** No se detecta si otro proceso usa el puerto

### Problemas de UI y UX
11. **No hay polling de estado en React:** Usuario no ve estado de Nakama en tiempo real
12. **No hay UI de errores:** Usuario no ve indicaciones visuales de errores
13. **No hay spinners/loaders:** Usuario no sabe cuando servicios están iniciando
14. **Botones no se deshabilitan:** Usuario puede intentar conectar antes de que esté listo

## Objetivo

Crear un sistema de logging y monitoreo centralizado que:
- Capture todos los logs de servicios (Nakama, Bore, RetroArch)
- Almacene logs en archivos rotativos para auditoría
- Proporcione métricas de rendimiento en tiempo real
- Mejore el manejo de errores con cleanup robusto
- Valide dependencias antes de iniciar servicios
- Proporcione UI de estado y errores en React

## Alcance

### Incluye
- Sistema de logging centralizado con niveles (INFO, WARN, ERROR, DEBUG)
- Rotación de archivos de logs (por tamaño y tiempo)
- Captura de stdout/stderr de child processes
- Monitoreo de recursos (memoria, CPU, tiempo de inicio)
- Validación de dependencias (PostgreSQL, puertos, archivos)
- Cleanup robusto al cerrar aplicación
- UI de estado en React con polling
- UI de errores con banners y notificaciones
- Spinners/loaders para operaciones asíncronas
- Métricas de rendimiento (latencia, throughput)

### Excluye
- Cambios en lógica de negocio de módulos existentes
- Modificación de configuración de RetroArch
- Cambios en protocolos de comunicación (Bore, Tailscale, MITM)

## Restricciones

1. **No breaking changes:** Debe ser compatible con módulos existentes
2. **Bajo overhead:** Logging no debe impactar significativamente el rendimiento
3. **Configurable:** Usuario debe poder desactivar logging si lo desea
4. **Cross-platform:** Debe funcionar en Windows, Linux, y macOS
5. **Sin dependencias externas:** Usar solo Node.js estándar cuando sea posible

## Prioridades

### Alta (P0)
1. Sistema de logging persistente a archivo
2. Captura de logs de Nakama (cambiar stdio: "ignore" a logging)
3. Cleanup robusto al cerrar aplicación
4. Validación de dependencias (PostgreSQL, puertos)

### Media (P1)
5. Monitoreo de recursos (memoria, CPU)
6. UI de estado en React con polling
7. UI de errores con banners
8. Spinners/loaders para operaciones asíncronas

### Baja (P2)
9. Rotación de archivos de logs
10. Logs estructurados en JSON
11. Métricas de rendimiento detalladas
12. Dashboard de métricas en tiempo real

## Criterios de Éxito

1. Todos los logs de servicios se capturan y almacenan en archivos
2. Errores se muestran en UI con contexto claro
3. Usuario ve estado de servicios en tiempo real
4. Procesos se limpian correctamente al cerrar la app
5. Dependencias se validan antes de iniciar servicios
6. Sistema no introduce latencia significativa (>5ms overhead)
7. Logs se pueden consultar y filtrar fácilmente
