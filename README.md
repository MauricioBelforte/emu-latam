# EMU LATAM - V2 (Arquitectura en Servidor Relay)

¡Bienvenido a la rama V2 del proyecto **Emu Latam**!

Esta versión representa una evolución significativa de nuestro cliente de emparejamiento y lanzamiento para KOF '98 (y títulos retro). Hemos transicionado de un modelo P2P directo (PC a PC) a un **Modelo basado en Servidores Relay**.

## ¿Por qué esta bifurcación / etapa V2?

En la Versión 1 (P2P), uno de los jugadores (el Host de la partida) estaba obligado a realizar **Port Forwarding** (apertura de puertos) manualmente en la configuración de su Router para que el jugador contrario pudiera conectarse. Esto generó fricción técnica intolerable y una barrera de entrada alta para gran parte de los usuarios, además de posibles inseguridades en sus redes locales.

En esta **V2**, **ningún usuario necesita configurar su router**.
Toda la lógica de red ahora pasa por un **Servidor Intermediario (Relay)** ubicado en la nube, que acepta las conexiones salientes de ambos emuladores y funciona como puente transparente para cruzar datos.

### Pilares Fundamentales de la V2:

1. **Cero Configuración de Router**: Iniciar y conectarse a una partida multijugador será tan rápido como hacer "Clic". El port forwarding desaparece.
2. **Infraestructura Gratuita (Free Tier)**: Aprovecharemos instancias en la nube que ofrezcan capas gratuitas (Como Oracle Cloud Always Free, Render o Fly.io) para contener el pequeño núcleo UDP del Relay, conservando el proyecto 100% libre de costos de mantenimiento.
3. **Altamente Modular**: La lógica de Relay Server se programa de forma abstraída. El cliente (la app) sencillamente consultará qué IP usar. Si un servidor Relay deja de funcionar o tiene alta latencia (lag), simplemente se remueve de un listado y se conecta otro.
4. **Selector de Servidores**: Más adelante, el jugador tendrá la capacidad de elegir o probar pings contra diversos Relay gratuitos distribuidos globalmente, asegurando una conexión ideal con su contrincante.

## Estructura del Proyecto

- `/documentacion_v1`: Contiene exclusivamente todo el gran historial de documentación conceptual y guías técnicas referidas a la V1 y el enfoque PC to PC si en el futuro se quiere investigar o retomar.
- `/backend`: Nuestro servidor **Nakama** encargado de emparejamientos (Matchmaking), usuarios, chat global y emisión de Relay dinámico.
- `/client`: Aplicación Desktop desarrollada en **React + Electron** que sirve de Launcher principal.
- `/emulator`: Binarios, assets y configuraciones base del emulador seleccionado.

## Plan Maestro

Para comprender de cerca el listado de tareas exhaustivo, el progreso y los niveles de dificultad que integran el desarrollo de la arquitectura Relay, debes consultar el documento raíz **`PLAN_V2.md`**.

> **Estado Actual**: Refactorización de red y modularidad en progreso. Generando scripts de despliegue Relay.
