# 03 - Diseño - Nombre de Usuario Personalizado

## Arquitectura

```
App.tsx
├── NamePickerModal.tsx  ← Modal de bienvenida (primer inicio)
│   └── Guarda en localStorage → "emu_display_name"
└── AuthContext.tsx
    └── loginGhost()
        ├── Lee localStorage → displayName
        ├── Si existe → setUsername(displayName)
        └── Si no → deja username generado + muestra modal
```

## Componentes

### NamePickerModal
- Overlay + ModalBox (igual que ChallengeModal/NetplayConfigModal)
- Input de texto para el nombre
- Botón "EMPEZAR" (guardar + cerrar)
- Validación: 3-20 caracteres, solo alfanumérico + espacios
- Se muestra UNA SOLA VEZ (primer inicio)

### AuthContext
- `loginGhost()` modificado: después de generar username, chequea localStorage
- Si hay displayName → sobreescribe username
- El userId interno (UUID) no cambia

### SocialContext
- Contiene la lógica de anuncio de presencia y sincronización de displayName
- Mantiene un `displayNameMap` (Map<string, string> via useRef) que asocia `userId → displayName`
- El map se consulta en tres puntos:
   1. **Presencias iniciales** de `channel.presences` → usar displayName si está en el map
   2. **Eventos onchannelpresence** (joins/leaves) → usar displayName si está disponible
   3. **Mensajes entrantes** de tipo `emu_user_online` → actualizar el map + onlineUsers
- Expone `getDisplayName(userId)` pública para que ChatBox resuelva nombres en tiempo de render
- Incluye el propio `userId → displayName` en el map durante `initSocial` para que los mensajes propios muestren el nombre correcto

## Flujo de anuncio de presencia

```
SocialProvider (al conectarse al lobby)
  │
  ├── 1. socket.joinChat("Lobby", 1, true, false)
  │      └── Obtiene presencias iniciales → onlineUsers (con displayNameMap)
  │
  ├── 2. announce() cada 5 segundos:
  │      socket.writeChatMessage(channelId, {
  │        _type: "emu_user_online",
  │        senderId: myUserId,
  │        displayName: displayNameRef.current,
  │        timestamp: Date.now()
  │      })
  │
  └── 3. handleNakamaMessage (escucha "nakama_message"):
         └── content._type === "emu_user_online"
              ├── displayNameMap.current.set(senderId, displayName)
              └── Actualiza onlineUsers (update si existe, add si no)
```

## Flujo de chat con nombre en tiempo real

```
ChatBox.tsx
  │
  ├── getDisplayName(msg.senderId)  ← Resuelve en cada render
  │     └── displayNameMap.current.get(userId) || msg.username (fallback)
  │
  └── Re-render automático:
        └── displayNameMap cambia → updatePresence → setOnlineUsers
              → SocialContextProvider re-renderiza → ChatBox re-renderiza
              → getDisplayName() lee el valor actualizado del map
```

El nombre se resuelve en tiempo de render, no al crear el mensaje. Esto asegura que aunque la presencia llegue después del mensaje de chat, el nombre se corrige automáticamente en el próximo re-render.

## Persistencia
- Clave: `emu_display_name`
- Medio: `localStorage`
- Persiste entre sesiones indefinidamente
- Para cambiar el nombre: se puede eliminar la clave desde DevTools (future: opción en settings)
