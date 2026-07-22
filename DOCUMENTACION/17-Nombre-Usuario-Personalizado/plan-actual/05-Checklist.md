# 05 - Checklist - Nombre de Usuario Personalizado

## Fase 1: Documentación
- [x] 01-Requerimientos.md
- [x] 02-Analisis.md
- [x] 03-Diseno.md
- [x] 04-Codigo.md
- [x] 05-Checklist.md
- [x] 06-Plan-Testings.md
- [x] 07-Resultados-Testings.md

## Fase 2: Implementación
- [x] Crear NamePickerModal.tsx con input + botón EMPEZAR
- [x] Validación: 3-20 caracteres, solo letras y espacios
- [x] localStorage: guardar/leer "emu_display_name"
- [x] AuthContext: loginGhost usa displayName de localStorage
- [x] App.tsx: mostrar modal si no hay nombre guardado
- [x] Mostrar nombre en la UI (header, sidebar, chat, retos)

## Fase 3: Nombre en ventana de pelea GGPO (FBNeo)
- [x] Agregar hostName/guestName a GgpoRoom
- [x] Host publica su nombre al crear sala GGPO
- [x] Guest publica su nombre al unirse a sala GGPO
- [x] Host lee guestName del room y lo pasa a quark:direct
- [x] Guest lee hostName del room y lo pasa a quark:direct
- [x] buildQuarkArgs soporta playerName como 8vo parámetro

## Fase 4: Visibilidad del displayName en la sidebar (online players)
- [x] Crear constante USER_PRESENCE_TYPE = "emu_user_online"
- [x] Crear displayNameMap (Map<userId, displayName> via useRef) en SocialContext
- [x] Función announce() que envía writeChatMessage cada 5 segundos con _type, senderId, displayName, timestamp
- [x] Manejar mensajes entrantes con _type "emu_user_online": actualizar displayNameMap y onlineUsers
- [x] Presencias iniciales de channel.presences consultan displayNameMap
- [x] onchannelpresence (joins) consultan displayNameMap para usar displayName
- [x] displayNameRef para evitar closure stale en el intervalo
- [x] Auto-incluir al usuario actual en onlineUsers con su displayName

## Fase 5: Testing
- [x] Test: modal aparece en primer inicio
- [x] Test: nombre persiste al cerrar y volver a abrir app
- [x] Test: header muestra el nombre elegido
- [x] Test: sidebar muestra el nombre elegido
- [x] Test: chat muestra el nombre elegido
- [x] Test: presencia announce envía mensaje cada 5 segundos
- [x] Test: displayNameMap se actualiza al recibir mensaje de presencia
- [x] Test: cross-PC: nombres personalizados aparecen en sidebar de otros jugadores
- [x] npm run dev sin errores (compilación exitosa)

## Fase 6: Verificación
- [x] Commit y push (913f17a + 9dc9c72)
