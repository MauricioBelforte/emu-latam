# 05 - Checklist - Nombre de Usuario Personalizado

## Fase 1: Documentación
- [ ] 01-Requerimientos.md
- [ ] 02-Analisis.md
- [ ] 03-Diseno.md
- [ ] 04-Codigo.md
- [ ] 05-Checklist.md
- [ ] 06-Plan-Testings.md
- [ ] 07-Resultados-Testings.md

## Fase 2: Implementación
- [ ] Crear NamePickerModal.tsx con input + botón EMPEZAR
- [ ] Validación: 3-20 caracteres, no vacío
- [ ] localStorage: guardar/leer "emu_display_name"
- [ ] AuthContext: loginGhost usa displayName de localStorage
- [ ] App.tsx: mostrar modal si no hay nombre guardado

## Fase 3: Testing
- [ ] Test: modal aparece en primer inicio
- [ ] Test: nombre persiste al cerrar y volver a abrir app
- [ ] Test: header muestra el nombre elegido
- [ ] Test: sidebar muestra el nombre elegido
- [ ] Test: chat muestra el nombre elegido

## Fase 4: Verificación
- [ ] npm run dev sin errores
- [ ] Commit y push
