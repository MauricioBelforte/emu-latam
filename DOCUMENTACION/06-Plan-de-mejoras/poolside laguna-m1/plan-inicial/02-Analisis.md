# Plan de Mejoras - Poolside Laguna-M1 (Emu Latam)

## 2. Análisis

### 2.1 Dominio
Emu Latam es una aplicación de escritorio tipo launcher para juego online P2P. Su arquitectura actual combina Electron (orquestación), React (interfaz), y múltiples procesos nativos (RetroArch, Nakama, Bore). El proyecto ya implementa varios flujos estables y necesita optimización sin romperlos.

### 2.2 Puntos críticos identificados

| Área | Problema | Impacto | Prioridad |
|------|----------|---------|-----------|
| Orquestación | Host + Bore requieren 2 pasos manuales | Alto - fricción UX | Alta |
| Persistencia | Configuraciones se pierden al cerrar | Medio - ineficiencia | Media |
| ROMs | No hay detección automática de juegos | Medio - configuración manual | Media |
| Métricas | Sin datos cuantitativos de red | Bajo - debugging difícil | Baja |
| Errores | Mensajes genéricos sin recovery | Medio - soporte complejo | Media |

### 2.3 Alternativas evaluadas

| Tema | Alternativa A | Alternativa B | Decisión |
|------|--------------|--------------|----------|
| Orquestación | Modificar `launch-game` existente | `auto-host-bore` nuevo handler | Nuevo handler (modularidad) |
| Persistencia | localStorage del renderer | Archivo JSON en main process | Archivo JSON (centralizado) |
| ROMs | Hardcodeadas | Escaneo dinámico | Escaneo dinámico (flexibilidad) |
| Métricas | Logs planos | WebSocket con datos en tiempo real | WebSocket opcional (overhead menor) |

### 2.4 Decisiones clave
1. **Handler `auto-host-bore`**: Crear IPC nuevo que combine `startPortForwarder + startRelayTunnelV2 + launchRA` en secuencia automática.
2. **Persistencia en JSON**: Usar `userConfig.json` en `resources/app/` para guardar preferencias.
3. **Escaneo de ROMs**: Leer directorio `retroarch/roms/` al iniciar y cachear metadata.
4. **Manejo de errores con retry**: Implementar retry exponencial (1s, 2s, 4s) para operaciones de red.

### 2.5 Supuestos
- El usuario tiene una sola ROM (kof98.zip) o varias en el mismo directorio.
- Bore.pub sigue disponible como servidor de túneles.
- El hardware es PC Windows estándar (no ARM).

---
**Documento:** 02-Analisis.md  
**Módulo:** 06-Plan-de-mejoras / poolside laguna-m1 / plan-inicial