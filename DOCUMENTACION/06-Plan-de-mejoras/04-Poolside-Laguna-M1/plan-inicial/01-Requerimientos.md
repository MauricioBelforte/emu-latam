# Plan de Mejoras - Poolside Laguna-M1 (Emu Latam)

## 1. Requerimientos

### 1.1 Problema
El sistema Emu Latam, aunque funcional, presenta oportunidades de optimización en las siguientes áreas:

1. **Redundancia en orquestación**: Los handlers de "Host con Bore" requieren dos pasos manuales (HOST GAME + JOIN GAME) para funcionar correctamente. El flujo propuesto debe unificar esto en una sola acción automática.

2. **Falta de persistencia de configuraciones**: Las configuraciones de netplay y preferencias de usuario se pierden al cerrar la aplicación, requiriendo reconfiguración manual repetitiva.

3. **Gestión de errores incompleta**: Algunos errores de conexión (timeout de bore, puertos ocupados, fallos de DNS) no son manejados con mensajes claros al usuario.

4. **Ausencia de detección automática de juego**: El usuario debe conocer previamente cuál ROM usar; no hay escaneo automático de ROMs disponibles.

5. **Métricas limitadas**: Solo se registran logs básicos; faltan datos cuantitativos de frame delay, ping promedio y throughput durante la sesión.

### 1.2 Objetivos
- Automatizar el flujo completo de hosting + tunelización Bore en una sola operación.
- Implementar persistencia de configuraciones de usuario (preferencias de netplay, última ROM usada).
- Mejorar el manejo de errores con mensajes descriptivos y recovery automático.
- Agregar escaneo y carga dinámica de ROMs desde el directorio `retroarch/roms/`.
- Incluir métricas de red en tiempo real (ping, jitter, paquetes por segundo) durante el netplay.

### 1.3 Alcance
**Incluye:**
- Nuevos IPC handlers para orquestación automática de Bore + Host.
- Persistencia de configuraciones via archivo JSON en `resources/app/`.
- Componentes UI nuevos: `AutoHostButton`, `RomSelector`, `NetworkMetricsPanel`.
- Sistema de retry exponencial para conexiones fallidas.
- Caché de metadata de ROM (tamaño, core compatible, settings recomendadas).

**Excluye:**
- Modificación de los flujos estables actuales (`launch-game`, `start-relay-tunnel V1`).
- Rediseño de la interfaz principal (se agregan componentes nuevos).
- Cambios en el core de RetroArch FBNeo.

### 1.4 Restricciones
- **Modularidad**: Todos los cambios deben implementarse como handlers/IPC separados.
- **No breaking changes**: Los 35 tests estables deben seguir pasando sin modificación.
- **UX obligatoria**: Progreso visual con spinners y mensajes de estado en cada operación.
- **Logs con rotación**: Usar sistema existente de logs (500KB threshold).

---
**Documento:** 01-Requerimientos.md  
**Módulo:** 06-Plan-de-mejoras / poolside laguna-m1 / plan-inicial