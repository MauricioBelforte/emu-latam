# 04 - Código - Nombre de Usuario Personalizado

## Archivos involucrados

| Archivo | Acción |
|---------|--------|
| `client/src/components/ui/NamePickerModal.tsx` | NUEVO |
| `client/src/context/AuthContext.tsx` | Modificado: loginGhost + localStorage + updateDisplayName |
| `client/src/App.tsx` | Modificado: +estado + montaje del modal |
| `client/src/ggpo/lib/ggpoNet.ts` | Modificado: GgpoRoom + hostName/guestName |
| `client/src/ggpo/main/ggpoHandler.ts` | Modificado: buildQuarkArgs + playerName como 8vo parámetro |
| `client/src/ggpo/context/GgpoContext.tsx` | Modificado: pasar nombres en startHosting/joinRoom |
| `client/src/context/SocialContext.tsx` | Modificado: anuncio de presencia + displayNameMap + sincronización |
| `client/src/components/layout/Sidebar.tsx` | Sin cambios (ya lee onlineUsers de useSocial y renderiza user.username) |

## Funciones clave

### NamePickerModal.tsx
```tsx
// Modal de bienvenida al primer inicio
// Input con validación: 3-20 chars, solo letras y espacios
// Botón EMPEZAR → guarda en localStorage + llama a updateDisplayName
// Se muestra UNA SOLA VEZ (solo si localStorage no tiene "emu_display_name")
```

### AuthContext.tsx
```typescript
const loginGhost = useCallback(async () => {
  // Nakama disponible:
  const displayName = localStorage.getItem("emu_display_name");
  setUsername(displayName || session.username);

  // Fallback local:
  const saved = localStorage.getItem("emu_display_name");
  setUsername(saved || `Player ${Math.floor(Math.random() * 999) + 1}`);

const updateDisplayName = (name: string) => {
  localStorage.setItem("emu_display_name", name);
  setUsername(name);
};
```

### App.tsx
```tsx
const [showNamePicker, setShowNamePicker] = useState(false);

useEffect(() => {
  if (isAuthenticated && !localStorage.getItem("emu_display_name")) {
    setShowNamePicker(true);
  }
}, [isAuthenticated]);

<NamePickerModal onConfirm={(name) => { updateDisplayName(name); setShowNamePicker(false); }} />
```

### SocialContext.tsx — Anuncio de presencia y sincronización de displayName

```typescript
const USER_PRESENCE_TYPE = "emu_user_online";

// Ref para el mapa de displayNames (userId → displayName)
// Persiste entre renders sin causar re-renders
const displayNameMap = useRef<Map<string, string>>(new Map());

// Ref para el displayName actual (evita closure stale)
const myDisplayName = localStorage.getItem("emu_display_name") || authUsername || "Player";
const displayNameRef = useRef(myDisplayName);
displayNameRef.current = myDisplayName;
```

**Inicialización del lobby (dentro de useEffect):**
```typescript
const initSocial = async () => {
  const channel = await socket.joinChat("Lobby", 1, true, false);
  chId = channel.id;
  setLobbyChannelId(chId);

  // Presencias iniciales: usar displayNameMap si existe
  const presences = Array.isArray(channel.presences)
    ? channel.presences
    : Object.values(channel.presences);
  const list: UserPresence[] = presences.map((p: any) => {
    const uid = p.userId || p.user_id;
    return {
      userId: uid,
      username: displayNameMap.current.get(uid) || p.username,
      isOnline: true,
    };
  });
  // Auto-incluir al usuario actual con su displayName
  if (myUserId && !list.find((u) => u.userId === myUserId)) {
    list.push({ userId: myUserId, username: displayNameRef.current, isOnline: true });
  }
  setOnlineUsers(list);

  // Anunciar presencia cada 5 segundos
  const announce = () => {
    socket.writeChatMessage(chId!, {
      _type: USER_PRESENCE_TYPE,
      senderId: myUserId,
      displayName: displayNameRef.current,
      timestamp: Date.now(),
    }).catch(() => {});
  };
  announce();
  intervalId = setInterval(announce, 5000);
};
```

**Manejo de mensajes de presencia (handleNakamaMessage):**
```typescript
const handleNakamaMessage = (event: Event) => {
  const message = (event as CustomEvent).detail;
  const content = typeof message.content === "string"
    ? JSON.parse(message.content)
    : message.content;

  if (content._type === USER_PRESENCE_TYPE) {
    const sender = message.sender_id || content.senderId;
    if (sender === myUserId) return; // Ignorar propio mensaje
    const disp = content.displayName || content.username || message.username;
    displayNameMap.current.set(sender, disp);
    setOnlineUsers((prev) => {
      const exist = prev.find((u) => u.userId === sender);
      if (exist) {
        if (exist.username !== disp) {
          return prev.map((u) => u.userId === sender ? { ...u, username: disp } : u);
        }
        return prev;
      }
      return [...prev, { userId: sender, username: disp, isOnline: true }];
    });
  }
};
```

**Manejo de eventos de presencia en el canal:**
```typescript
socket.onchannelpresence = (presence) => {
  setOnlineUsers((prev) => {
    let nextUsers = [...prev];
    presence.joins?.forEach((join: any) => {
      const uid = join.userId || join.user_id;
      if (uid && !nextUsers.find((u) => u.userId === uid)) {
        nextUsers.push({
          userId: uid,
          username: displayNameMap.current.get(uid) || join.username,
          isOnline: true,
        });
      }
    });
    presence.leaves?.forEach((leave: any) => {
      const leaveId = leave.userId || leave.user_id;
      if (leaveId && leaveId !== myUserId) {
        nextUsers = nextUsers.filter((u) => u.userId !== leaveId);
      }
    });
    return nextUsers;
  });
};
```

### sidebar (Sidebar.tsx) — Sin cambios necesarios
```tsx
// Ya usa useSocial() → onlineUsers → user.username
// El username ahora contiene el displayName personalizado
// porque SocialContext lo sincroniza automáticamente
const { onlineUsers } = useSocial();
onlineUsers.map((user) => (
  <UserItem key={user.userId} ...>
    {user.username} {isSelf && "(TÚ)"}
  </UserItem>
));
```

### GGPO — Nombre en ventana de pelea
El nombre personalizado se pasa al motor FBNeo vía el protocolo quark:direct:

```typescript
// ggpoHandler.ts — buildQuarkArgs
let quark = `quark:direct,${rom},${localPort},${remoteIp},${remotePort},${playerNumber},0`
if (playerName) quark += `,${playerName}`

// GgpoRoom almacena los nombres para intercambiarlos entre PCs
interface GgpoRoom {
  hostName?: string   // Publicado por el host al crear sala
  guestName?: string  // Publicado por el guest al unirse
}

// Host: lee guestName del room al lanzar
await electron.ipcRenderer.invoke("ggpo-launch", {
  playerName: guest.room.guestName || undefined,
})

// Guest: lee hostName del room al lanzar
await electron.ipcRenderer.invoke("ggpo-launch", {
  playerName: room.hostName || undefined,
})
```

De esta forma, FBNeo muestra el nombre elegido (ej: "Pepe") en lugar de "Player 1" / "Player 2".
