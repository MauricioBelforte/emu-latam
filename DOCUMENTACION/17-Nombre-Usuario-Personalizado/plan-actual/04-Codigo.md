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
