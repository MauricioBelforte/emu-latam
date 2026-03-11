# GUIA_RELAY_SERVER.md

# Guía de Operación - Emu Latam Relay Server

Esta carpeta contiene el código fuente y las configuraciones para desplegar un servidor intermediario (MITM) para el netplay de Emu Latam.

## Requisitos

- Docker (opcional, para local)
- [flyctl](https://fly.io/docs/hands-on/install-flyctl/) (para despliegue en la nube)

## Tecnología

Se utiliza `netplay_mitm_server` del proyecto RetroArch. Es un servidor UDP ligero que puentea dos clientes netplay sin necesidad de que estos abran puertos.

## Despliegue con Playit.gg (Cero Configuración)

Hemos unificado el servidor de relay y el túnel en una sola imagen de Docker para facilitar el uso sin tarjeta de crédito.

1. **Construir la imagen**:

   ```bash
   docker build -t emu-latam-relay .
   ```

2. **Ejecutar el contenedor**:

   ```bash
   docker run -it emu-latam-relay
   ```

3. **Vincular cuenta**:
   Al iniciar, verás un enlace que dice algo como `https://playit.gg/claim/xxxx`. Ábrelo en tu navegador para asignar el túnel a tu cuenta (puedes crear una al instante sin tarjeta).

4. **Configurar Túnel**:
   En el panel de Playit.gg, asegúrate de que el túnel esté configurado como **UDP** apuntando al puerto **55435**.

5. **Obtener Dominio**:
   Playit te dará una dirección como `tuna-latam.playit.gg`. Esta es la dirección que debes poner en tus configuraciones o compartir con los jugadores.

## Configuración en Nakama

Una vez desplegado, obtendrás una dirección (ej: `emu-latam-relay.fly.dev` o una IP fija). Debes configurar esta dirección en el archivo `backend/local.yml` o en el módulo Lua de Nakama para que los clientes sepan a dónde conectarse.

### Pruebas Locales con Docker

Si quieres probar el relay en tu propia máquina:

1. `docker build -t relay-emu .`
2. `docker run -p 55435:55435/udp relay-emu`

Esto levantará el relay en el puerto UDP 55435 de tu localhost.
