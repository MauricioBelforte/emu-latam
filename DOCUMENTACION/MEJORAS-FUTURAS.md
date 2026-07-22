# Mejoras Futuras

## 1. Mostrar nombre personalizado dentro del emulador GGPO (fcadefbneo)

### Estado actual
- El emulador `fcadefbneo.exe` siempre muestra "Player 1" y "Player 2" dentro del juego
- El campo `playerName` como 8vo argumento en `quark:direct` NO está soportado por el binario estándar de Fightcade
- Nuestro código YA envía `playerName` en `buildQuarkArgs()` (ver `client/src/ggpo/main/ggpoHandler.ts:24-25`), pero el binario lo ignora

### Formato actual de quark:direct
```
quark:direct,<rom>,<local_port>,<remote_ip>,<remote_port>,<player_number>,<spectator> -w
```
(7 campos, sin playerName)

### Lo que se intentó
```typescript
let quark = `quark:direct,${rom},${localPort},${remoteIp},${remotePort},${playerNumber},0`
if (playerName) quark += `,${playerName}`  // 8vo campo, ignorado por el binario
```

### Qué haría falta para solucionarlo

#### Opción A — Modificar el binario de fcadefbneo (recomendada)
1. Obtener el código fuente de fightcade-fbneo (https://github.com/fightcade/fightcade-fbneo)
2. Buscar el parser de `quark:direct` en el código fuente (probablemente en `src/burner/` o similar)
3. Agregar soporte para el 8vo campo como `playerName`
4. Pasar ese valor al display name del jugador en la UI del emulador
5. Compilar un nuevo `fcadefbneo.exe` con Visual Studio 2015+ (según docs del proyecto)
6. Reemplazar el binario en `client/resources/fcadefbneo/`

#### Opción B — Usar archivo de configuración
1. Investigar si fcadefbneo lee un archivo de configuración (`.cfg`, `.ini`) que permita setear el player name
2. Si existe, escribir ese archivo antes de lanzar el emulador
3. Si no existe, es una feature request para el proyecto upstream

#### Opción C — Parche en runtime (hack)
1. Una vez iniciado el emulador, usar Windows API (SendMessage, FindWindow) para modificar el título de la ventana o los textos internos
2. Poco confiable, frágil ante actualizaciones del emulador

### Dependencias
- Conocimiento de C/C++ y del codebase de fightcade-fbneo
- Visual Studio 2015+ para compilar
- Tiempo para forkear y modificar el proyecto upstream
- Alternativamente: esperar a que Fightcade agregue soporte oficial para `playerName` en `quark:direct`

### Referencias
- Handler de GGPO: `client/src/ggpo/main/ggpoHandler.ts`
- Args que se envían: `buildQuarkArgs()` en `ggpoHandler.ts:22-27`
- UI que recolecta el nombre: `client/src/components/ui/NetplayConfigModal.tsx` (campo "TU NOMBRE")
- Nombre se persiste en: `localStorage.getItem("emu_display_name")`
- Ya se muestra correctamente en sidebar de PLAYERS ONLINE (ver Módulo 17)
