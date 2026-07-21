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

## Persistencia
- Clave: `emu_display_name`
- Medio: `localStorage`
- Persiste entre sesiones indefinidamente
- Para cambiar el nombre: se puede eliminar la clave desde DevTools (future: opción en settings)
