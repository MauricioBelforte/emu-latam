# Plan de Mejoras - Stepfun Step-3.7-Flash (Emu Latam)
## 1. Requerimientos

### 1.1 Problema
Actualmente el sistema Emu Latam presenta cuellos de botella operativos durante el flujo netplay:
- **Latencia acumulada** en la capa proxy/forwarder y en la inicialización de procesos hijos (RetroArch + relés).
- **Desincronizaciones** ocasionales por estados de `input_poll_type` y configuraciones inconsistentes.
- **Experiencia de usuario fragmentada**: ausencia de spinners/mensajes de estado durante tareas de red (health-check Nakama, inicio de Bore, tunelización).
- **Configuración manual repetitiva**: puertos, IPs y reglas de firewall que deben copiarse/pegarse.
- **Falta de orquestación automática** para flujos avanzados (retos/desafíos) sin reutilizar handlers existentes de forma riesgosa.

### 1.2 Objetivos
- Reducir la latencia percibida y real del flujo host→guest.
- Eliminar desincronizaciones recurrentes sin modificar los flujos estables probados.
- Proveer retroalimentación visual obligatoria en toda operación de red ("spinners, loaders, mensajes").
- Automatizar la creación de túneles/forwarders con limpieza explícita de recursos.
- Incorporar un flujo nuevo de retos totalmente separado y trazable.
- Mejorar la observabilidad (logs/métricas) por sesión de partida.

### 1.3 Alcance
**Incluye:**
- RetroArch + run-ahead/anti-lag (sintonía fina).
- Nakama (health-check y emparejamiento).
- Bore + proxy + forwarder (orquestación y limpieza).
- Logs por sesión y métricas de latencia/frames.
- UI React (spinners, estado, copy IP, prevención de clics rápidos).
- Flujo de retos/desafíos como pipeline nuevo (no modifica "Join"/"Host" estables).
- Tailscale como alternativa configurabilizable.

**Excluye:**
- Cambios en flujos estables (`launch-game`, `start-relay-tunnel V1`) que ya cumplen tests.
- Modificación del core de RetroArch.

### 1.4 Restricciones
- **No modificar** handlers/flujos estables.
- Cualquier mejora debe implementarse como **nuevos módulos/IPC handlers o componentes UI separados**.
- Todos los cambios deben instrumentarse con logs; no introducir archivos de log adicionales sin rotación.
- Cumplir la sección 8 de AGENTS.md: **progreso visual obligatorio** en cada operación de red.
- Mantener directorios de documentación: plan-actual y logs actualizados.

---
**Documento:** 01-Requerimientos.md
**Módulo:** 06-Plan-de-mejoras / stepfun / step-3.7-flash