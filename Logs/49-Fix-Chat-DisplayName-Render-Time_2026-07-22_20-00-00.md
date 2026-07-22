# Log 49 - Fix Chat DisplayName Render-Time Resolution

**Fecha:** 2026-07-22
**Commit:** dbffd1c

## Problema
- Mensajes propios en el chat mostraban "Player NNN" en lugar del displayName personalizado
- Mensajes de otros usuarios tardaban en actualizar el nombre o nunca lo actualizaban

## Causa raíz
1. ChatMessage guardaba `username` al crearse (stale, nunca se actualizaba)
2. `displayNameMap` no incluía el propio userId, por lo que mensajes propios no tenían displayName
3. Si la presencia del otro usuario llegaba después del mensaje de chat, el nombre quedaba desactualizado

## Solución
1. **SocialContext.tsx:**
   - Se agregó `getDisplayName(userId: string)` al `SocialContextType` y al provider
   - Implementación: lee `displayNameMap.current.get(uid)` en cada llamada (tiempo real)
   - En `initSocial()`: se agregó `displayNameMap.current.set(myUserId, displayNameRef.current)` para incluir el propio nombre
   - Se usó `useCallback` para la función `getDisplayName`

2. **ChatBox.tsx:**
   - Cambió `msg.username` por `getDisplayName(msg.senderId) || msg.username`
   - El nombre se resuelve en cada render, no al crear el mensaje

## Flujo de corrección automática
```
Presencia llega → displayNameMap actualizado → updatePresence()
  → setOnlineUsers() → SocialContext re-renderiza
  → ChatBox re-renderiza → getDisplayName() lee el valor actualizado
```

## Archivos modificados
- `client/src/context/SocialContext.tsx` — getDisplayName, auto-inclusión propio userId
- `client/src/components/ui/ChatBox.tsx` — render-time resolution

## Documentación actualizada
- `DOCUMENTACION/17-Nombre-Usuario-Personalizado/plan-actual/03-Diseno.md`
- `DOCUMENTACION/17-Nombre-Usuario-Personalizado/plan-actual/04-Codigo.md`
- `DOCUMENTACION/17-Nombre-Usuario-Personalizado/plan-actual/05-Checklist.md`
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md`

## Resultado
✅ Mensajes propios muestran displayName personalizado
✅ Mensajes de otros usuarios corrigen nombre automáticamente al llegar la presencia
✅ Build exitoso (npm run build sin errores)
