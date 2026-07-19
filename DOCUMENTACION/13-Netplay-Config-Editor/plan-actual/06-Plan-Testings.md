# 06 - Plan de Testings - Editor de Configuración Netplay

## Pruebas Unitarias

- [ ] **Lectura de config:** Abrir modal, verificar que los 4 valores coinciden
      con los del archivo `netplay_optimized.cfg`
- [ ] **Escritura de un valor:** Cambiar check_frames de 30 a 0, guardar,
      leer el .cfg directamente, verificar que cambió
- [ ] **Restaurar defaults:** Click RESTAURAR, verificar que los 4 valores
      vuelven a check_frames=30, min=1, range=1, run_ahead=false
- [ ] **Parseo de comentarios:** Verificar que los comentarios del .cfg no se
      pierden al guardar (comparar diff antes/después)
- [ ] **Valores inválidos:** Probar escribir un valor no permitido (ej: texto)
      y verificar que el handler lo rechaza o no corrompe el archivo

## Pruebas de Integración

- [ ] **Apertura/cierre:** Abrir modal 5 veces seguidas, cerrar, verificar
      que no hay memory leaks ni errores en consola
- [ ] **Flujo completo:** Cambiar valor → Guardar → Cerrar → Abrir →
      Verificar que persiste → Restaurar → Verificar defaults
- [ ] **Lanzamiento con valor modificado:** Cambiar check_frames a 0, guardar,
      lanzar partida, verificar que no hay tiriteo
- [ ] **Lanzamiento con valor restaurado:** Restaurar defaults, lanzar
      partida, verificar que check_frames=30 está activo

## Casos Límite

- [ ] **Archivo .cfg no existe:** Si el archivo falta, el modal debe mostrar
      mensaje de error, no crashear
- [ ] **Archivo .cfg corrupto:** Si el formato es inválido, el modal debe
      mostrar mensaje de error
- [ ] **Múltiples escrituras rápidas:** Hacer clic en GUARDAR varias veces
      rápido, verificar que no se corrompe el archivo
- [ ] **Modal abierto mientras se lanza partida:** Verificar que el modal se
      cierra automáticamente o no interfiere

## Pruebas de Rendimiento

- [ ] **Tiempo de apertura:** El modal debe cargar en < 100ms
- [ ] **Tiempo de guardado:** La escritura al archivo debe ser < 50ms

## Manejo de Errores

- [ ] **Error de lectura:** Si el archivo no se puede leer, mostrar toast/alert
- [ ] **Error de escritura:** Si el archivo no se puede escribir (permisos),
      mostrar mensaje claro
- [ ] **Error de restauración:** Similar a escritura
