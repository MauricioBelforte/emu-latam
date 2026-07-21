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

## Restricciones
- No requiere backend adicional (solo frontend + localStorage)
- Debe funcionar incluso si Nakama no está disponible (modo local)
- El modal debe tener validación básica (nombre no vacío, máximo 20 caracteres)
