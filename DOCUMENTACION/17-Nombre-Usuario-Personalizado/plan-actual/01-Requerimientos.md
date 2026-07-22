# 01 - Requerimientos - Nombre de Usuario Personalizado

## Problema
Al iniciar la aplicación, el usuario ve un nombre genérico tipo "Player 345" que no lo identifica. No hay forma de personalizarlo.

## Objetivo
Permitir que el usuario elija su propio nombre de visualización al primer inicio de la app, y que ese nombre se muestre en toda la interfaz (header, sidebar, chat, retos) en lugar del nombre genérico.

## Alcance
- Modal de bienvenida solicitando nombre al primer inicio
- Persistencia del nombre entre sesiones (localStorage)
- Reemplazo del nombre genérico "Player X" por el nombre elegido en toda la UI
- El nombre interno (userId) sigue siendo un identificador UUID, no se modifica
- El nombre elegido se muestra a otros jugadores vía Nakama
- **R5:** Mostrar nombre personalizado de otros usuarios en sidebar de players online

## Restricciones
- No requiere backend adicional (solo frontend + localStorage)
- Debe funcionar incluso si Nakama no está disponible (modo local)
- El modal debe tener validación básica (nombre no vacío, máximo 20 caracteres)
- **No aplica al HUD interno de FBNeo/GGPO:** El "Player 1"/"Player 2" dentro de la ventana de juego lo renderiza FBNeo internamente (quark:direct) y no puede modificarse desde Emu Latam
- El anuncio de presencia debe usar el canal de chat del lobby para evitar depender de Nakama Storage
