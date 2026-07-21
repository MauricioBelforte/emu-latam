# 04 - Código - Nombre de Usuario Personalizado

## Archivos involucrados

| Archivo | Acción |
|---------|--------|
| `client/src/components/ui/NamePickerModal.tsx` | NUEVO |
| `client/src/context/AuthContext.tsx` | Modificado: loginGhost + localStorage |
| `client/src/App.tsx` | Modificado: +estado + montaje del modal |

## Funciones clave

### AuthContext.tsx
```typescript
const loginGhost = useCallback(async () => {
  // ... auth existente ...
  // Fallback local:
  setUserId(`local-${crypto.randomUUID()}`);
  const randomName = `Player ${Math.floor(Math.random() * 999) + 1}`;
  const saved = localStorage.getItem("emu_display_name");
  setUsername(saved || randomName);
  setIsAuthenticated(true);
}, []);
```

### NamePickerModal.tsx
```tsx
interface NamePickerModalProps {
  onConfirm: (name: string) => void;
}

// Overlay + ModalBox
// Input + botón "EMPEZAR"
// Validación: 3-20 chars, alfanumérico
// Al confirmar: localStorage.setItem("emu_display_name", name) → onConfirm(name)
```

### App.tsx
```tsx
const [showNamePicker, setShowNamePicker] = useState(false);

// Después de loginGhost, verificar si hay nombre guardado:
useEffect(() => {
  if (isAuthenticated && !localStorage.getItem("emu_display_name")) {
    setShowNamePicker(true);
  }
}, [isAuthenticated]);

const handleNameConfirm = (name: string) => {
  localStorage.setItem("emu_display_name", name);
  setShowNamePicker(false);
  // Recargar estado de auth para actualizar username
  window.location.reload(); // o volver a llamar loginGhost
};

// En el return:
{showNamePicker && <NamePickerModal onConfirm={handleNameConfirm} />}
```
