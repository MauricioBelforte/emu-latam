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

## Análisis de visibilidad del nombre en la sidebar (online players)

### Problema
Cuando un usuario se conecta al lobby de Nakama, los demás usuarios ven su `username` de Nakama (ej: "Player 345") en lugar del nombre personalizado guardado en `localStorage`. Esto rompe la experiencia porque el nombre elegido no es visible para otros jugadores.

### Alternativas consideradas para presencia

1. **Nakama Storage (storage objects):** Cada usuario escribe su displayName en Nakama Storage y los demás lo leen periódicamente. Descartado porque:
   - Requiere lectura/escritura constante a Nakama Storage (más requests)
   - Los storage objects no eliminan automáticamente la entrada al desconectarse
   - Mayor latencia para reflejar cambios de nombre

2. **Mensajes de lobby vía writeChatMessage (elegido):** Cada usuario anuncia su displayName periódicamente escribiendo un mensaje estructurado (`_type: "emu_user_online"`) en el canal de chat del lobby. Ventajas:
   - Aprovecha el canal de chat ya existente (sin conexiones adicionales)
   - Los mensajes se entregan en tiempo real a todos los miembros del lobby
   - No requiere storage persistente en el servidor
   - Fácil de limpiar: al cerrar sesión, el usuario deja de enviar mensajes

### Decisión
Se usa `writeChatMessage` con un mensaje JSON que incluye `_type: "emu_user_online"`, `senderId`, `displayName` y `timestamp`. El envío se repite cada 5 segundos vía `setInterval` para cubrir nuevas conexiones que se unan después. Cada cliente mantiene un `displayNameMap` (Map via useRef) que asocia `userId → displayName` y actualiza la lista `onlineUsers` en tiempo real.
