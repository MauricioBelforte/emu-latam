# MASTER PLAN - KOF LATAM (MVP 1.0)

Este documento es la guía maestra para el desarrollo de la plataforma estilo Fightcade para KOF '98 (MVP). Contiene un desglose detallado fase por fase con más de 100 tareas.

---

## FASE 0: PREPARACIÓN Y CONFIGURACIÓN DEL ENTORNO (10 Tareas)

- [x] 0.01. Instalar VS Code / Antigravity [FACIL]
- [ ] 0.02. Instalar extensión "Docker" [FACIL]
- [ ] 0.03. Instalar extensión "ESLint" [FACIL]
- [ ] 0.04. Instalar extensión "Prettier" [FACIL]
- [ ] 0.05. Instalar extensión "C/C++" [FACIL]
- [ ] 0.06. Instalar Docker Desktop y validar con `docker --version`. [FACIL]
- [x] 0.07. Instalar Node.js (LTS) y validar con `node -v`. [FACIL]
- [x] 0.08. Crear carpeta raíz `emu-latam` y ejecutar `git init`. [FACIL]
- [x] 0.09. Crear `.gitignore` (node_modules, dist, .env, roms). [FACIL]
- [x] 0.10. Crear estructura de directoios: `backend`, `client`, `emulator`. [FACIL]

---

## FASE 1: BACKEND - NAKAMA & POSTGRES NATIVO (15 Tareas)

- [x] 1.01. Instalar PostgreSQL 12+ (Manual - Navegador). [FACIL]
- [x] 1.02. Configurar usuario 'postgres' con contraseña 'localdb'. [FACIL]
- [x] 1.03. Crear base de datos llamada 'nakama'. [FACIL]
- [x] 1.04. Descargar binario de Nakama para Windows. [FACIL]
- [x] 1.05. Ubicar binario en carpeta `backend/`. [FACIL]
- [x] 1.06. Crear archivo `backend/local.yml` (Configuración). [MEDIO]
- [x] 1.07. Configurar string de conexión a DB en `local.yml`. [FACIL]
- [x] 1.08. Crear script `backend/migrate.bat` para migraciones. [FACIL]
- [x] 1.09. Crear script `backend/start_server.bat` para ejecución. [FACIL]
- [x] 1.10. Ejecutar migraciones iniciales. [MEDIO]
- [x] 1.11. Iniciar servidor Nakama nativo. [FACIL]
- [x] 1.12. Verificar logs en consola (Startup done). [FACIL]
- [x] 1.13. Acceder al Dashboard en `http://127.0.0.1:7351`. [FACIL]
- [x] 1.14. Validar consola de Nakama con admin:password. [FACIL]
- [x] 1.15. Comprobar métricas de DB desde el Dashboard. [FACIL]

---

## FASE 2: CLIENTE - ESTRUCTURA BASE (ELECTRON + REACT) (15 Tareas)

- [x] 2.01. Ejecutar `npm create vite@latest` [FACIL]
- [x] 2.02. Seleccionar React + TypeScript. [FACIL]
- [x] 2.03. Instalar `electron` como devDependency. [FACIL]
- [x] 2.04. Instalar `electron-builder` como devDependency. [FACIL]
- [x] 2.05. Crear `client/electron/main.ts` (Proceso Principal). [MEDIO]
- [x] 2.06. Crear `client/electron/preload.ts` (Context Bridge). [MEDIO]
- [x] 2.07. Configurar `vite.config.ts` para compilar React. [MEDIO]
- [x] 2.08. Configurar plugin `vite-plugin-electron`. [MEDIO]
- [x] 2.09. Configurar scripts en `package.json`. [FACIL]
- [x] 2.10. Instalar `concurrently`. [FACIL]
- [x] 2.11. Instalar `wait-on`. [FACIL]
- [x] 2.12. Crear estructura `src/components`, `src/pages`, `src/styles`. [FACIL]
- [x] 2.13. Instalar `styled-components` o configurar CSS Modules. [FACIL]
- [x] 2.14. Definir estilos globales (Arcade Theme). [MEDIO]
- [x] 2.15. Ejecutar "Hola Mundo" en ventana de Electron. [FACIL]

---

## FASE 3: UI/UX - DISEÑO DE INTERFAZ (10 Tareas)

- [x] 3.01. Diseñar Layout Principal (Grid CSS/Flexbox). [MEDIO]
- [x] 3.02. Crear componente `Sidebar`. [FACIL]
- [x] 3.03. Crear componente `UserList`. [FACIL]
- [x] 3.04. Crear componente `ChatBox`. [FACIL]
- [x] 3.05. Crear componente `GameLobby`. [FACIL]
- [x] 3.06. Implementar modal/pantalla de Login. [MEDIO]
- [x] 3.07. Implementar modal de "Desafío Recibido". [MEDIO]
- [x] 3.08. Añadir iconos (usar `react-icons`). [FACIL]
- [x] 3.09. Crear tema de colores (Arcade). [FACIL]
- [x] 3.10. Responsive check. [MEDIO]

---

## FASE 4: INTEGRACIÓN DE NAKAMA EN CLIENTE (10 Tareas)

- [x] 4.01. Instalar `@heroiclabs/nakama-js`. [FACIL]
- [x] 4.02. Crear archivo `src/lib/nakama.ts` (Singleton). [MEDIO]
- [x] 4.03. Implementar función `authenticateDevice`. [MEDIO]
- [ ] 4.04. Implementar función `authenticateEmail`. [MEDIO]
- [x] 4.05. Guardar sesión en `localStorage`. [FACIL]
- [x] 4.06. Crear React Context `AuthContext`. [MEDIO]
- [x] 4.07. Implementar restauración de sesión. [MEDIO]
- [x] 4.08. Conectar socket (`client.createSocket`). [AVANZADO]
- [x] 4.09. Manejar eventos de conexión/desconexión. [MEDIO]
- [x] 4.10. Mostrar indicador de estado de conexión "Ping". [FACIL]

---

## FASE 5: SOCIAL - PRESENCIA Y LISTA DE USUARIOS (10 Tareas)

- [x] 5.01. Suscribirse a "Status Presence" en Nakama. [AVANZADO]
- [x] 5.02. Enviar evento de presencia propio al conectar. [MEDIO]
- [x] 5.03. Escuchar eventos de `StreamData` (vía ChannelPresence). [AVANZADO]
- [x] 5.04. Actualizar lista de usuarios cuando alguien entra. [MEDIO]
- [x] 5.05. Actualizar lista de usuarios cuando alguien sale. [MEDIO]
- [x] 5.06. Filtrar usuario propio de la lista / Indicar cuál es propio. [FACIL]
- [x] 5.07. Mostrar estado del usuario (Online/Playing). [MEDIO]
- [ ] 5.08. Implementar click en usuario para ver detalles. [FACIL]
- [ ] 5.09. Testear con 2 clientes simulados. [MEDIO]
- [x] 5.10. Optimizar renderizado de lista (memoization/estado unificado). [MEDIO]

---

## FASE 6: CHAT (10 Tareas)

- [x] 6.01. Crear canal de chat global "lobby" en Nakama. [MEDIO]
- [x] 6.02. Unirse al canal "lobby" al iniciar sesión. [MEDIO]
- [x] 6.03. UI: Input de texto y botón enviar. [FACIL]
- [x] 6.04. Enviar mensaje al canal (`socket.writeChatMessage`). [MEDIO]
- [x] 6.05. Escuchar mensajes entrantes (`socket.onchannelmessage`). [MEDIO]
- [x] 6.06. Formatear mensajes (Time - User - Content). [FACIL]
- [x] 6.07. Diferenciar mensajes propios de ajenos (CSS). [FACIL]
- [x] 6.08. Auto-scroll al fondo al llegar nuevo mensaje. [FACIL]
- [ ] 6.09. Notificación visual de mensaje no leído. [MEDIO]
- [x] 6.10. Persistir historial de chat (limitado). [MEDIO]

---

## FASE 7: EMULADOR - SETUP Y CONTROL (10 Tareas)

- [ ] 7.01. Descargar FBNeo adaptable a CLI. [FACIL]
- [ ] 7.02. Organizar carpeta `emulator/`. [FACIL]
- [ ] 7.03. Configurar ruta relativa en el código. [MEDIO]
- [ ] 7.04. Probar lanzamiento manual: `fbneo.exe kof98`. [FACIL]
- [ ] 7.05. En Electron Main: Importar `spawn`. [FACIL]
- [ ] 7.06. Crear IPC Handler `launch-game`. [MEDIO]
- [ ] 7.07. Pasar argumentos al proceso spawn. [MEDIO]
- [ ] 7.08. Manejar errores "Archivo no encontrado". [FACIL]
- [ ] 7.09. Exponer `launchGame` en `preload.ts`. [FACIL]
- [ ] 7.10. Botón "Test Game" en UI. [FACIL]

---

## FASE 8: SISTEMA DE RETOS (MATCHMAKING) (10 Tareas)

- [ ] 8.01. Definir estructura de MatchData para retos. [AVANZADO]
- [ ] 8.02. UI: Botón "Retar" en perfil de usuario. [FACIL]
- [ ] 8.03. Enviar solicitud de reto directo a usuario B. [AVANZADO]
- [ ] 8.04. Usuario B recibe evento y muestra Modal. [MEDIO]
- [ ] 8.05. Usuario B acepta: Enviar confirmación. [MEDIO]
- [ ] 8.06. Usuario B rechaza: Enviar rechazo. [FACIL]
- [ ] 8.07. Usuario A recibe respuesta. [MEDIO]
- [ ] 8.08. Si aceptado: Ambos clientes inician preparación. [AVANZADO]
- [ ] 8.09. Determinar quién es HOST y quién es CLIENT. [MEDIO]
- [ ] 8.10. Timeout de reto (30s). [MEDIO]

---

## FASE 9: NETPLAY - LANZAMIENTO SINCRONIZADO (10 Tareas)

- [ ] 9.01. Obtener IP (STUN o Manual). [AVANZADO]
- [ ] 9.02. Host ejecuta: `fbneo.exe kof98 -host -port 7000`. [MEDIO]
- [ ] 9.03. Client ejecuta: `fbneo.exe kof98 -connect <IP>`. [MEDIO]
- [ ] 9.04. Automatizar inserción de IP en comando. [AVANZADO]
- [ ] 9.05. Bloquear UI mientras se juega. [FACIL]
- [ ] 9.06. Detectar cierre del juego (`child.on('close')`). [MEDIO]
- [ ] 9.07. Actualizar presencia a "Online" al cerrar. [MEDIO]
- [ ] 9.08. Manejar desconexión durante juego. [MEDIO]
- [ ] 9.09. Loggear resultado (simulado). [FACIL]
- [ ] 9.10. Test de lag local. [MEDIO]

---

## FASE 10: PULIDO, BUILD Y RELEASE (10 Tareas)

- [ ] 10.01. Revisión de seguridad. [MEDIO]
- [ ] 10.02. Limpiar logs de consola excesivos. [FACIL]
- [ ] 10.03. Configurar iconos de la aplicación. [FACIL]
- [ ] 10.04. Verificaciones finales de estilos. [FACIL]
- [ ] 10.05. Configurar `electron-builder.yml`. [MEDIO]
- [ ] 10.06. Ejecutar `npm run build`. [MEDIO]
- [ ] 10.07. Probar instalador en máquina limpia. [MEDIO]
- [ ] 10.08. Escribir `README.md` final. [FACIL]
- [ ] 10.09. Documentar arquitectura técnica. [MEDIO]
- [ ] 10.10. BACKUP DEL PROYECTO Y CIERRE. [FACIL]
