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

## 2. Sistema de ranking, wins y perfiles de jugador (estilo Fightcade)

### Estado actual
- No existe sistema de ranking ni estadísticas
- Los usuarios solo tienen un nombre personalizado en `localStorage`
- No hay persistencia de wins/losses entre sesiones
- No hay letras de ranking (S/A/B/C/D como en Fightcade)

### Descripción de la funcionalidad deseada

#### 2.1. Perfil de jugador
- Cada usuario tiene un perfil con:
  - Nombre personalizado (ya implementado)
  - Letra de ranking (S, A+, A, B+, B, C, D, F)
  - Récord de victorias/derrotas por juego (ej: kof98: 15W 3L)
  - Racha actual de wins
  - Total de partidas jugadas
  - Fecha de último partido

#### 2.2. Letras de ranking (como Fightcade)
Fightcade usa un sistema de letras basado en ELO:
- S: Élite (ELO > 1800)
- A+: 1600-1800
- A: 1400-1600
- B+: 1200-1400
- B: 1000-1200
- C+: 800-1000
- C: 600-800
- D: 400-600
- F: < 400

Cada victoria suma ELO, cada derrota resta. El monto de ELO ganado/perdido depende del ELO del oponente (ganarle a alguien de mayor ranking da más puntos).

#### 2.3. Persistencia de datos
Los datos deben persistir entre sesiones. Opciones:
- **Nakama Storage**: guardar perfil en Storage de Nakama (collection `player_profiles`, key por userId)
  - ✅ Accesible desde cualquier PC
  - ✅ Compartido entre jugadores (se puede ver el perfil ajeno)
  - ❌ Depende del servidor Nakama (problemas anteriores con cross-user reads)
- **Archivo local JSON**: guardar en `resources/` o `userData/` del sistema de Electron
  - ✅ No requiere servidor
  - ❌ No compartido entre PCs
  - ❌ Se pierde al reinstalar
- **Nakama + caché local**: almacenar en Nakama y cachear localmente
  - ✅ Lo mejor de ambos mundos

#### 2.4. Visualización en UI
- **Sidebar**: mostrar letra de ranking al lado del nombre (ej: "Mauri [A+]")
- **Tooltip o panel**: al clickear un jugador, mostrar estadísticas completas
- **Pantalla de resultado**: después de cada partida, mostrar quién ganó y actualizar ranking

### Lo que haría falta para implementarlo

1. **Diseñar schema de datos**: definir estructura del perfil en Nakama Storage
2. **Implementar backend Nakama**: hooks RPC o funciones server-side para:
   - `getProfile(userId)`: obtener perfil de un jugador
   - `reportMatch(winnerId, loserId)`: reportar resultado de partida, actualizar ELO
3. **Implementar IPC handlers**: en main process para leer/escribir perfiles
4. **Implementar UI en React**: 
   - Mostrar ranking en sidebar
   - Panel de perfil al clickear jugador
   - Actualización automática tras cada partida
5. **Integrar con GGPO/RetroArch**: detectar cuándo termina una partida y quién ganó
   - En GGPO: leer el resultado del emulador (complejo)
   - En RetroArch: netplay no expone resultados fácilmente
   - Alternativa: botón manual "Reportar resultado" al terminar la partida

### Dependencias
- Servidor Nakama funcional (local o VPS)
- Funciones server-side en Nakama (Lua o TypeScript)
- Sistema de detección de fin de partida en el emulador
- UI para mostrar ranking y estadísticas

### Prioridad: Baja (post-VPS deployment)
