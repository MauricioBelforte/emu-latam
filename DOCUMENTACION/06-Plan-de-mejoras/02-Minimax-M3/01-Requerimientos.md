# 01 - Requerimientos - Plan de Mejoras (minimax-m3)

## Contexto

Este documento define los **requerimientos** que aborda el plan de mejoras propio de `minimax-m3` para Emu Latam. Es una propuesta **independiente** de las versiones generadas por otros modelos en el módulo `06-Plan-de-mejoras/`.

## Problema

Emu Latam es un launcher Electron + Vite + React 19 que orquesta sesiones de netplay de KOF '98 sobre RetroArch/FBNeo, usando Nakama como lobby y `bore.exe` como túnel TCP cuando no hay conectividad LAN. El proyecto ya tiene flujos estables verificados (`test:stable` con 35 tests) y un sistema de retos funcional, pero la observación directa del código fuente revela oportunidades concretas de mejora en cuatro ejes: **resiliencia del proceso principal**, **experiencia de usuario reactiva**, **higiene de arquitectura** y **operación post-instalación**.

## Alcance de este plan

- **Sí incluye:** análisis y propuestas de mejora que afectan a archivos bajo `client/src/`, `relay-server/`, configuración de empaquetado y operaciones de runtime. Cambios compatibles con la regla 15 ("Flujos Bloqueados — NO MODIFICAR"): las mejoras deben ser aditivas o paralelas.
- **No incluye:** reescritura de los flujos manuales de host/guest (estables), modificación del sistema de retos ya validado ni migraciones de versión mayor de dependencias.

## Objetivos

1. **Aumentar la resiliencia del main process** ante caídas silenciosas de procesos hijos (Nakama, RetroArch, bore).
2. **Mejorar la observabilidad** del estado de red para el usuario final sin saturar la UI.
3. **Reducir la deuda técnica** detectada (mezcla de responsabilidades en `App.tsx`, IPC ad-hoc con strings libres, magic numbers).
4. **Endurecer el ciclo de vida** de la aplicación al cerrar (limpieza de procesos hijos, archivos temporales, túneles colgados).

## Requerimientos funcionales

| ID   | Requerimiento | Prioridad |
|------|---------------|-----------|
| RF-01 | El sistema debe detectar y reportar puertos en uso antes de iniciar RetroArch. | Alta |
| RF-02 | El usuario debe poder copiar con un solo click la URL del túnel bore y la IP LAN/Tailscale. | Alta |
| RF-03 | El sistema debe limpiar procesos hijos (bore, retroarch, relay forwarder) aunque la ventana se cierre por crash. | Alta |
| RF-04 | El main process debe exponer un canal IPC tipado en vez de `string` libre para reducir errores silenciosos. | Media |
| RF-05 | La UI debe mostrar un indicador de salud del túnel bore (latencia o estado) durante una partida. | Media |
| RF-06 | El sistema debe permitir al usuario cambiar el puerto RetroArch desde la UI sin recompilar. | Baja |
| RF-07 | El sistema debe persistir la configuración de relay en una ubicación robusta a actualizaciones del EXE. | Alta |
| RF-08 | El main process debe escribir un heartbeat en logs cada N segundos para detectar silencios. | Media |
| RF-09 | El sistema debe manejar el caso de doble-click en "Insert Coin" sin lanzar dos sesiones de Nakama. | Alta |
| RF-10 | El sistema debe detectar cuando RetroArch muere por código no-cero y diferenciarlo de un cierre de usuario. | Media |

## Requerimientos no funcionales

- **Rendimiento:** Ningún cambio debe agregar más de 50 ms de latencia en el flujo "Insert Coin" → "Juego iniciado".
- **Compatibilidad:** Las mejoras deben funcionar en el EXE empaquetado con `@electron/packager` (no usar APIs exclusivas de `electron-builder`).
- **Estabilidad:** No se debe romper `npm run test:stable` ni los flujos de `06-Plan de mejoras` previos.
- **Mantenibilidad:** Cada cambio debe documentarse en `Logs/` con la nomenclatura estándar del proyecto.
- **Internacionalización:** Mensajes visibles al usuario deben permanecer en español.
- **Multiplataforma futuro:** El código nuevo no debe asumir Windows-only; las llamadas `taskkill` deben abstraerse.

## Restricciones

- **Regla 15:** Los handlers `launch-game` (host directo, host bore manual, join directo) NO se tocan. Cualquier mejora se hace en un nuevo handler o como composición.
- **Regla 9:** Lógica de sistema operativo permanece en `client/src/main/`. La UI React sólo consume IPC.
- **Regla 6:** Todo cambio debe quedar registrado en `Logs/`.
- **Idioma de commits:** Pasado descriptivo en español.
- **Regla 5:** Cambios grandes requieren backup en `Obsoletos/`.

## Stakeholders

- **Desarrollador principal (Mauricio):** quien ejecuta la app desde Windows y empaqueta el EXE.
- **Usuarios finales (comunidad KOF LATAM):** reciben el `.zip` y ejecutan sin consola visible.
- **Otros modelos (DeepSeek, Gemini, etc.):** pueden estar trabajando en paralelo en `06-Plan-de-mejoras/<otro>/` sin colisionar.

## Criterios de éxito

- ✅ Suite de tests `npm run test:stable` sigue verde tras cada cambio.
- ✅ Al menos 3 nuevas pruebas automatizadas en `test:stable` cubriendo los casos RF-01, RF-03 y RF-09.
- ✅ Documentación `04-Codigo.md` y `05-Checklist.md` de este módulo actualizados al cierre de cada mejora.
- ✅ Log de cambios generado para cada ítem completado.

## Fuera de alcance

- Despliegue real a VPS (Fase 2 ya lo tiene planificado en `06-Plan-de-mejoras/` general; este plan no la aborda).
- Reescritura del sistema de chat.
- Internacionalización a otros idiomas.
- Empaquetado para macOS/Linux.
