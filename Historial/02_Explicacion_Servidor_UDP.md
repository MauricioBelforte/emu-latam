# EXPLICACIÓN TÉCNICA Y PASO A PASO - SISTEMA RELAY V2

Este documento explica de forma sencilla cómo funciona la nueva arquitectura de **Emu Latam V2**, por qué usamos los servidores y cómo puedes ponerlo en marcha aunque no te funcione Docker Desktop.

---

## 1. ¿Qué es un "Relay Server" y por qué lo necesitamos?

En la **V1**, para jugar, uno de los dos tenía que ser el "Host" y abrir una puerta en su router (Port Forwarding). Si no lo hacías, internet bloqueaba la conexión del otro jugador.

En la **V2**, usamos un **Relay Server (Servidor Intermediario)**:

- Es como un "punto de encuentro" en internet.
- Tú te conectas al servidor, tu amigo se conecta al mismo servidor.
- El servidor recibe los datos de uno y se los pasa al otro inmediatamente.
- **Resultado**: Como ambos están haciendo una conexión "hacia afuera" al servidor, el router no bloquea nada. **Nadie tiene que configurar su router.**

---

## 2. ¿Qué hace Playit.gg en todo esto?

Incluso el servidor tiene problemas para ser visto en internet si lo corres en una PC normal. **Playit.gg** es un servicio de "Túnel":

1.  Crea un camino privado desde tu servidor hacia sus servidores globales.
2.  Te da una dirección fija (ejemplo: `emu-latam.playit.gg`).
3.  Cualquier persona en el mundo que use esa dirección llegará a tu servidor de juegos, sin que tengas que tocar un solo cable de tu router.

---

## 3. Sobre Docker y tu problema con Docker Desktop

Docker es una tecnología que permite "empaquetar" todo el servidor (programas, librerías, configuraciones) dentro de una caja llamada **Contenedor**.

- **La ventaja**: Si logras correr el contenedor, el servidor funcionará _exactamente igual_ en tu PC, en la mía o en un servidor en la nube.
- **Tu problema**: Si Docker Desktop no te funciona en Windows, **no te preocupes**. Tienes dos caminos:

### Camino A: No usar Docker en tu PC (Ejecutar en la Nube)

Esta es la opción profesional. Puedes alquilar (o usar gratis) un servidor en la nube (como Oracle Cloud o una VPS). Esos servidores **siempre** tienen Docker funcionando de forma nativa y perfecta. Tú solo subes los archivos que creamos (`Dockerfile` y `start_relay.sh`) y el servidor se encarga de todo.

### Camino B: Ejecutarlo sin Docker (Manual)

Si quieres correr el servidor en tu propia PC para probar y no tienes Docker, tendrías que compilar el código a mano (instalar GCC, compilar el archivo `.c`, descargar el agente de Playit). Es más engorroso, por eso Docker es la mejor opción para "servidores".

---

## 4. Guía Paso a Paso para Empezar

Si quieres tener tu propio servidor funcionando hoy mismo, este es el orden:

### Paso 1: Crear cuenta en Playit.gg

1.  Ve a [playit.gg](https://playit.gg) y créate una cuenta gratuita (no pide tarjeta).
2.  Mantén la sesión abierta en tu navegador.

### Paso 2: Decidir dónde va a vivir el servidor

- **Si es para probar**: Intenta arreglar Docker Desktop o usa una máquina virtual con Linux.
- **Si es para jugar en serio**: Lo ideal es usar un servidor en la nube (VPS). Hay opciones como **VPSWala** (que mencioné en la investigación) que ofrecen 15 días gratis en Argentina sin tarjeta.

### Paso 3: Poner a correr el servidor (Usando los archivos que creamos)

Una vez que tengas acceso a una terminal (consola) donde funcione Docker, haces esto:

1.  Copias la carpeta `relay-server` a ese lugar.
2.  Ejecutas: `docker build -t emu-relay .` (Esto fabrica el servidor).
3.  Ejecutas: `docker run -it emu-relay` (Esto lo pone a funcionar).
4.  **Vinculación**: Verás que en la consola sale un mensaje con un enlace de Playit. Lo copias, lo pegas en tu navegador y listo. Tu servidor ya tiene una dirección pública.

### Paso 4: Configurar el Cliente (App de Electron)

Una vez que Playit te de tu dirección (ej: `kof98-latam.playit.gg`), esa dirección es la que se usará en el sistema de retos.

---

## 5. Resumen

- La **Guía Relay** (`relay-server/GUIA_RELAY_SERVER.md`) es el manual técnico rápido.
- Este archivo es para que entiendas el concepto.
- **No necesitas Docker Desktop funcionando para que el proyecto avance**, porque el servidor Relay está pensado para vivir en la nube, donde Docker siempre funciona bien.

Si el tema de servidores te resulta muy complejo, no te preocupes, yo puedo seguir preparando los scripts para que cuando decidas dónde alojarlo, sea solo copiar y pegar un comando sencillo.
