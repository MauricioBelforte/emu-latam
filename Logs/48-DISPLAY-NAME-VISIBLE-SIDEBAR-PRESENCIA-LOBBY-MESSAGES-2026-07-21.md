# Log 48 — Display Name Visible en Sidebar (Presencia vía Lobby Messages)

**Fecha:** 2026-07-21

## Problema
Los usuarios solo veían "player455" o "player324" (Nakama default username) en la sidebar de PLAYERS ONLINE, en lugar del nombre personalizado que habían configurado (ej: "Mauri", "Coco").

## Causa Raíz
- La sidebar usa `UserPresence.username` que proviene de `channel.presences` (Nakama session.username)
- El nombre personalizado estaba en `localStorage("emu_display_name")` pero nunca se compartía con otros usuarios
- `onchannelpresence` se seteba DESPUÉS de `joinChat`, perdiendo eventos de presencia tempranos

## Solución
Reescribir `SocialContext.tsx` con sistema de presencia vía lobby messages:

### Arquitectura
1. **Anuncio periódico:** Cada usuario envía `writeChatMessage(channel, { _type: "emu_user_online", displayName })` cada 5s
2. **Mapa de nombres:** `displayNameMap` (Map via useRef) almacena `userId → displayName` recibido
3. **Todas las fuentes consultan el mapa:**
   - `channel.presences` iniciales
   - `onchannelpresence` joins
   - Mensajes nuevos recibidos
4. **`onchannelpresence` seteado ANTES de `joinChat`** para no perder eventos

### Cambios en SocialContext.tsx
- Nueva constante `USER_PRESENCE_TYPE = "emu_user_online"`
- `displayNameMap` via `useRef<Map<string, string>>`
- `announce()` dentro de `initSocial` después de `joinChat` (usa `chId` local, no state)
- `handleNakamaMessage` procesa `_type === USER_PRESENCE_TYPE`
- Actualiza `onlineUsers` en todas las fuentes con `displayNameMap.current.get(uid) || p.username`
- Effect depende solo de `[isConnected, userId]`, usa refs para displayName

### Archivos modificados
- `client/src/context/SocialContext.tsx` — Reescrito

### Documentación actualizada
- `DOCUMENTACION/17-Nombre-Usuario-Personalizado/plan-actual/` — 7 archivos actualizados
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md` — Item marcado como completado
- `DOCUMENTACION/README.md` — Módulo 17 marcado como completado

## Commits
- `6679f56` — onchannelpresence seteado antes de joinChat + anuncio lobby
- `abbca5f` — Fix intervalo dentro de initSocial (stale closure channelId)
- `667a849` — Enviar displayName desde localStorage
- `bdd6fb3` — Refactor con displayNameMap via ref, todas fuentes consultan mapa
