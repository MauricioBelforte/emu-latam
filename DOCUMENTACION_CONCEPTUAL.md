# 🧠 Guía Conceptual: ¿Cómo funciona KOF LATAM?

Esta guía explica de forma sencilla y directa las piezas tecnológicas que estamos usando para construir esta plataforma.

---

## 1. El "Cuerpo": Electron

Imagina que **Electron** es un navegador Google Chrome que le quitamos la barra de direcciones y las pestañas, y lo metimos dentro de una caja de aplicación de Windows.

- **Función**: Es el contenedor que permite que nuestro código web se convierta en una aplicación de escritorio (.exe).
- **Superpoder**: A diferencia de una página web normal, Electron tiene permiso para "hablar" directamente con Windows.

## 2. La "Cara": React + TypeScript

Es lo que tú ves y con lo que interactúas (botones, chat, listas).

- **React**: Es la librería que usamos para crear interfaces modernas y rápidas.
- **TypeScript**: Es como un "supervisor de ortografía" para el código. Evita que cometamos errores tontos de programación antes de que la app se ejecute.

## 3. El "Cerebro": Nakama

Es el servidor que acabamos de encender. Nakama no dibuja nada, pero sabe todo lo que pasa.

- **Función**: Maneja los usuarios, el chat, la lista de amigos y el matchmaking (emparejar jugadores).
- **Comunicación**: El Launcher le hace preguntas a Nakama por una "cañería" llamada WebSockets (comunicación instantánea).

## 4. La "Memoria": PostgreSQL

Es la base de datos donde se guarda todo lo que Nakama necesita recordar permanentemente.

- **Datos**: Tus usuarios, récords de peleas, configuraciones del perfil, etc.

## 5. El "Herramientista": Vite

Es la herramienta que usamos mientras desarrollamos. Su único trabajo es que, cada vez que yo escribo una línea de código, tú la veas reflejada en el Launcher en menos de un segundo (Hot Module Replacement).

---

## ❓ ¿Cómo hace React para manejar archivos en Windows?

Esta es la pregunta del millón. **React, por sí solo, NO puede tocar archivos de tu Windows** (por seguridad, igual que una web normal).

Para lograrlo, usamos un truco llamado **IPC (Inter-Process Communication)**, que funciona como un sistema de correos interna:

1.  **React (El Mensajero)**: Tú haces clic en "Jugar". React envía un mensaje: _"Oye, necesito abrir el KOF '98"_.
2.  **Preload.ts (El Puente)**: Este archivo es la única pieza que toca ambos mundos. Recibe el mensaje de React y lo pasa al "Jefe".
3.  **Main.ts (El Jefe/Proceso Principal)**: Este proceso corre en **Node.js** (fuera del navegador). El Jefe recibe el mensaje y dice: _"Entendido, tengo acceso total a la PC. Voy a ejecutar `fbneo.exe` con este comando"_.
4.  **Windows**: Ejecuta el emulador.

**Resumen**: React pide el favor, el Puente traduce el pedido, y el Jefe (Node.js) ejecuta la acción en Windows.

---

## 🛠️ ¿Por qué ya no usamos Docker?

Docker es como un "barco de carga" que lleva contenedores. Queríamos meter la base de datos y el servidor dentro de esos contenedores para que fuera más limpio.
Pero como tu sistema (Windows LTSC) tenía bloqueado el puerto del barco (el kernel de virtualización), decidimos **bajar la mercadería al puerto directamente**:

- Instalamos Postgres y Nakama como aplicaciones normales de Windows.
- **Resultado**: Es más rápido, gasta menos RAM y no dependemos de configuraciones raras del BIOS.

---

_Este documento es para que cualquier persona entienda la magia detrás del capó de KOF LATAM._
