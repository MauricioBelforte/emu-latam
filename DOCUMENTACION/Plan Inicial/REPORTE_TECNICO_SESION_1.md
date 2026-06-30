# Reporte Técnico de Inicio: Proyecto KOF LATAM (MVP)

Este documento detalla todas las acciones, decisiones arquitectónicas y configuraciones realizadas durante nuestra primera sesión de trabajo. El objetivo es proporcionar una base sólida y comprensible para el desarrollo de la plataforma estilo Fightcade para KOF '98.

---

## 1. Planificación EstratégICA

Lo primero que hicimos fue transformar una idea general en un **Plan Maestro de Ingeniería** con más de 100 tareas granulares divididas en 10 fases.

**¿Por qué?** Un proyecto de esta complejidad (Netplay, Emulación P2P, Servidores en tiempo real) requiere un mapa detallado para evitar "deuda técnica" y asegurar que cada módulo encaje perfectamente con el siguiente.

---

## 2. Configuración del Entorno y Estructura

Creamos la estructura de directorios base:

- `backend/`: El motor del servidor.
- `client/`: El Launcher (la interfaz que verán los jugadores).
- `emulator/`: Los binarios de FBNeo para ejecutar el juego.

**Acciones realizadas:**

- Inicialización de **Git** para control de versiones.
- Creación de un `.gitignore` optimizado para ignorar archivos pesados como ROMs, binarios y `node_modules`.

---

## 3. Arquitectura del Backend: Nakama & PostgreSQL (Migración a Nativo)

Originalmente planeamos usar Docker, pero debido a incompatibilidades con el kernel de Windows 10 LTSC (Falta de Hyper-V/WSL2 en BIOS), pivotamos hacia una **Instalación Nativa (Bare Metal)**.

**¿Cómo funciona ahora?**

- **Sustitución de Docker**: Ya no usamos contenedores. Instalamos PostgreSQL directamente como un servicio de Windows y ejecutamos el binario `nakama.exe` de forma nativa.
- **Ventaja**: El sistema consume mucho menos RAM (ahorro de ~2GB) y es más estable para el entorno actual del usuario.
- **Conexión**: El Launcher se comunica con Nakama vía HTTP/JSON y WebSockets en el puerto `7350`.

---

## 4. ¿Qué es Nakama y cuál es su función?

Nakama NO es una base de datos, es un **Servidor de Juegos (Game Server)**. Piensa en él como el "Cerebro" que coordina todo lo que no es el juego en sí mismo:

1.  **Gestión de Identidad**: Maneja el registro y login de usuarios.
2.  **Presencia en Tiempo Real**: Sabe quién está conectado, quién está en el lobby y quién está jugando.
3.  **Chat y Social**: Administra los canales de chat global y mensajes privados.
4.  **Matchmaking**: Es el encargado de emparejar a dos jugadores para un combate.
5.  **Sockets (WebSockets)**: Mantiene un "tubo" abierto de comunicación constante entre el Launcher y el servidor.

---

## 5. Gestión de Datos: ¿Qué guardamos en la Base de Datos?

Usamos **PostgreSQL 12** como almacenamiento persistente. Nakama guarda automáticamente allí:

- **Perfiles de Usuario**: Nicknames, avatares y fechas de registro.
- **Cuentas y Seguridad**: Hashes de contraseñas (encriptados) y tokens de sesión.
- **Amigos y Grupos**: Relaciones entre usuarios.
- **Historial de Chat**: Mensajes de los canales (opcionalmente persistentes).
- **Match Records**: Resultados de peleas pasadas, rankings (Leaderboards) y estadísticas de victoria.

---

## 6. Arquitectura del Cliente: Electron + Vite + React

El Launcher es una aplicación híbrida:

- **Electron**: Nos da acceso al sistema de archivos para poder lanzar el emulador `fbneo.exe`.
- **Vite**: Es la herramienta de construcción ultra rápida.
- **React + TypeScript**: Usamos React para una interfaz fluida y moderna, y TypeScript para asegurar que no cometamos errores de lógica al manejar los datos del servidor.

---

## 7. Estado Actual y Próximos Pasos

**Logros:**

- **Backend**: 🟢 **100% Operativo**. PostgreSQL corriendo y Nakama configurado con acceso al Dashboard.
- **Cliente**: 🟡 **Estructura base lista**. Launcher abre y tiene el diseño "Neo-Arcade" aplicado.

**Bloqueos Resueltos:**

- Superada la incompatibilidad de Docker mediante instalación nativa.
- Resuelto el error de "Unknown Error" en el Dashboard mediante claves de seguridad en `local.yml`.

---

## 8. Bitácora de Resolución de Problemas (Debug Log)

| Fecha | Problema                            | Nivel | Solución / Estado                                                                                              |
| :---- | :---------------------------------- | :---- | :------------------------------------------------------------------------------------------------------------- |
| 18/02 | **Docker Engine fails to start**    | MEDIO | Incompatibilidad con Win10 LTSC/BIOS. Se cambió a instalación nativa de Postgres y Nakama.                     |
| 18/02 | **Nakama Dashboard: Unknown Error** | BAJO  | Nakama requiere `encryption_key` y `signing_key` en `local.yml` para sesiones seguras en modo nativo. Añadido. |
| 18/02 | **Módulo 'electron' undefined**     | MEDIO | Shadows del bundle de Vite. Resuelto con `electron-vite` y limpieza de variables de entorno.                   |

---

## 9. Estado de la Misión

- **Launcher**: 🟢 FUNCIONAL.
- **Backend (Nativo)**: 🟢 FUNCIONAL y Migrado.
  - **Dashboard**: [http://127.0.0.1:7351](http://127.0.0.1:7351)
  - **API**: [http://127.0.0.1:7350](http://127.0.0.1:7350)

---

## Mensaje del Ingeniero (Antigravity)

Hemos superado la barrera más difícil: la infraestructura. Ahora que Nakama y Postgres están "hablando" correctamente, podemos enfocarnos totalmente en la experiencia del jugador. El "Insert Coin" está cada vez más cerca.

**Próxima tarea:** Implementar el Layout Principal con CSS Grid y conectar el Launcher con la API de Nakama.

---

_Documento actualizado por Antigravity el 18 de Febrero, 2026._
