# 06 - Plan de Testings - Nombre de Usuario Personalizado

## Pruebas Unitarias
- [ ] Modal se renderiza correctamente al primer inicio
- [ ] Input acepta nombre válido (3-20 chars alfanumérico)
- [ ] Input rechaza nombre vacío (botón deshabilitado)
- [ ] Input rechaza nombre > 20 caracteres
- [ ] localStorage guarda y recupera el nombre correctamente
- [ ] displayNameMap.set/get funciona correctamente
- [ ] displayNameRef se actualiza al cambiar el nombre

## Pruebas de Integración
- [ ] Al confirmar nombre, el header lo muestra inmediatamente
- [ ] Al confirmar nombre, el sidebar lo muestra
- [ ] Al reiniciar app, el nombre persiste y el modal NO aparece
- [ ] **Presencia: Al conectarse al lobby, la función announce() envía writeChatMessage con _type "emu_user_online"**
- [ ] **Presencia: Los mensajes se envían cada 5 segundos (verificar setInterval)**
- [ ] **Presencia: Al recibir mensaje "emu_user_online", displayNameMap se actualiza**
- [ ] **Presencia: Al recibir mensaje "emu_user_online", onlineUsers se actualiza con el displayName**
- [ ] **Presencia: Presencias iniciales de channel.presences usan displayNameMap si existe la entrada**
- [ ] **Presencia: Eventos onchannelpresence (joins) usan displayNameMap si existe**
- [ ] **Presencia: El usuario actual aparece en onlineUsers con su displayName**
- [ ] **Presencia: Mensajes de tipo no-presencia (chats normales) no interfieren**

## Casos Límite
- [ ] localStorage corrompido o con valor inválido → mostrar modal
- [ ] Nombre con espacios al inicio/final → se trimea
- [ ] Caracteres especiales → se filtran o rechazan
- [ ] **Presencia: Múltiples usuarios enviando presencia simultáneamente → no hay colisiones**
- [ ] **Presencia: Usuario se desconecta → deja de enviar mensajes → onlineUsers se limpia vía onchannelpresence leaves**
- [ ] **Presencia: displayNameMap no crece indefinidamente (solo usuarios activos en el lobby)**
- [ ] **Presencia: Ignorar propio mensaje de presencia (sender === myUserId)**

## Pruebas Cross-PC
- [ ] **Dos PCs en el mismo lobby: cada uno ve el displayName del otro en la sidebar**
- [ ] **Tercer jugador se une: su displayName aparece en la sidebar de todos**
- [ ] **Un jugador cambia su localStorage y reconecta: el nuevo nombre se refleja**

## Resultados de Ejecución
- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron
- [ ] Todas las pruebas Cross-PC pasaron

## Fecha de Ejecución: [YYYY-MM-DD]
## Estado: PENDIENTE
