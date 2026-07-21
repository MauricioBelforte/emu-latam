# 02 - Análisis - Nombre de Usuario Personalizado

## Dominio
El sistema actual genera un username aleatorio "Player {random}" cuando Nakama no está disponible, o usa el username que devuelve Nakama. No hay forma de personalizarlo.

## Alternativas consideradas
1. **electron-store**: Persistencia en archivo JSON del lado del main process. Innecesario para un solo string.
2. **localStorage**: Simple, sincrónico, suficiente para un valor pequeño. Elegido.
3. **Nakama Storage**: Requiere Nakama activo. No funciona en modo local.

## Decisión
Se usa `localStorage` con clave `emu_display_name`. Si existe al autenticar, se sobreescribe el username con ese valor. Si no existe, se muestra un modal pidiendo el nombre.

## Flujo
1. App inicia → `loginGhost()` se ejecuta
2. Si `localStorage` tiene `emu_display_name` → se usa como username
3. Si NO tiene → se muestra `NamePickerModal`
4. Usuario ingresa nombre → se guarda en localStorage → se actualiza username
5. Toda la UI muestra `username` (que ahora es el nombre elegido)
