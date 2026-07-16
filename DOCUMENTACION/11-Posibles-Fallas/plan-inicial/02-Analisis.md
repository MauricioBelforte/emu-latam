# 02 - Análisis - Registro de Fallas y Soluciones (Plan Inicial)

## Formato de cada entrada

Cada problema documentado sigue esta estructura:

```
---

## [NUM] — Título del problema

**Fecha:** YYYY-MM-DD
**Reportado por:** [usuario/situación]
**Componente afectado:** [nombre del módulo]

### Síntoma
Descripción clara de lo que se veía/ocurría.

### Causa raíz
Qué lo provocaba (config, bug, red, permisos, etc.).

### Solución aplicada
Qué se cambió para resolverlo (config, código, comando).

### Código/Comandos involucrados
```
comandos o referencias a archivos
```

### Verificación
Cómo se confirmó que la solución funciona.

### Logs relacionados
Referencias a archivos de log en Logs/ si existen.
```

## Índice de problemas documentados

| # | Problema | Componente | Fecha |
|---|----------|-----------|-------|
| 1 | Conexión Nakama: PostgreSQL puerto incorrecto | 02-Integracion-Nakama | 2026-07-16 |
| 2 | Doble input guest en host (netplay_check_frames) | 04-Anti-Lag-RunAhead | 2026-07-15 |
| 3 | Ventana Electron se cierra al usar MITM Local | 01-Setup-Electron-Vite | 2026-07-15 |

*(El índice se actualiza al agregar nuevas entradas)*
