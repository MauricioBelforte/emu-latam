# 01 - Requerimientos - Editor de Configuración Netplay

## Problema
Cada PC tiene tolerancias distintas a los parámetros de netplay de RetroArch.
El Ryzen 7 no tolera check_frames > 0 (tiritea), mientras que el Athlon X2
tolera los mismos valores casi sin percibirlo. No hay forma de que cada
usuario ajuste estos parámetros desde Emu Latam — solo editando manualmente
el archivo `netplay_optimized.cfg`.

## Objetivo
Crear un editor visual integrado en Emu Latam que permita a cada jugador
ajustar los 4 parámetros clave de netplay antes de lanzar una partida:

- `netplay_check_frames`
- `netplay_input_latency_frames_min`
- `netplay_input_latency_frames_range`
- `run_ahead_enabled`

## Alcance
- Modal accesible desde el navbar (botón ⚙)
- Edición de las 4 variables mediante sliders/toggles
- Botón GUARDAR que escribe los cambios al `netplay_optimized.cfg`
- Botón RESTAURAR que vuelve a los valores probados (test [6]/[9])
- Feedback visual de confirmación
- Persistencia entre sesiones (se escribe al archivo real)

## Restricciones
- No usar librerías externas de UI (usar styled-components como el resto)
- Seguir el patrón de modales existente (Overlay + ModalBox)
- Los valores deben escribirse al archivo .cfg real, no a memoria
- Preservar comentarios y formato del archivo .cfg al editar
- Solo editar las 4 variables definidas, el resto del .cfg no se toca
