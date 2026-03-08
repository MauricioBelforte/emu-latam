# PLAN_V2.md

# MASTER PLAN V2 - Emu Latam (Arquitectura Relay)

Este documento detalla la nueva hoja de ruta para la Versión 2 del proyecto. En esta etapa, **la conexión deja de ser de PC a PC (P2P directo)**. El objetivo principal es evitar que tanto el servidor (Host) como el Cliente tengan que abrir puertos o modificar la configuración de su router (Port Forwarding) para poder jugar.

Esta es una bifurcación del proyecto original (v1), el cual queda intacto en su respectiva rama y carpeta de documentación (`documentacion_v1`) por si se desea retomar la conexión P2P directa en el futuro.

La nueva arquitectura se basará en un **Servidor Relay / Servidor Intermedio** que hará de puente entre los jugadores. Este esquema debe mantenerse **gratuito y modular**, permitiendo que si el servidor actual es lento, sea sencillo desacoplar el servicio y conectar otro. En el futuro, el sistema permitirá a los usuarios elegir entre distintos servidores gratuitos y probar su latencia.

---

## FASE 1: REESTRUCTURACIÓN DEL PROYECTO Y PLANIFICACIÓN (5 Tareas)

- [x] 1.01. Mover toda la documentación antigua (v1) a la carpeta `documentacion_v1` para preservar el historial P2P. [FACIL]
- [x] 1.02. Crear el nuevo `README.md` alineado con la visión V2 (Arquitectura en base a Relay). [FACIL]
- [x] 1.03. Crear este documento (`PLAN_V2.md`) detallando las nuevas fases y tareas. [FACIL]
- [ ] 1.04. Crear una rama en git específica para la V2 (`git checkout -b v2-relay-architecture`). [FACIL]
- [ ] 1.05. Investigar y documentar las opciones gratuitas de Relay Servers compatibles (Coturn, Netplay MITM de RetroArch, u opciones custom UDP sobre Fly.io/Oracle). [MEDIO]

---

## FASE 2: DESPLIEGUE DEL SERVIDOR RELAY MODULAR (10 Tareas)

- [ ] 2.01. Seleccionar la tecnología del servidor intermediario (Ej. servidor Relay nativo de RetroArch, Coturn, o Custom UDP en Node/Go). [MEDIO]
- [ ] 2.02. Registrar una cuenta en un proveedor cloud gratuito tier (Ej. Oracle Cloud Always Free, o Fly.io). [FACIL]
- [ ] 2.03. Desarrollar o configurar el script del servidor Relay para que acepte tráfico de los emuladores y conecte a ambos endpoints. [AVANZADO]
- [ ] 2.04. Crear el archivo `Dockerfile` para empaquetar de forma modular el servidor Relay. [MEDIO]
- [ ] 2.05. Desplegar el contenedor del servidor Relay en la nube elegida. [MEDIO]
- [ ] 2.06. Configurar reglas de Firewall y Red Virtual en el proveedor cloud para permitir tráfico UDP en los puertos seleccionados. [MEDIO]
- [ ] 2.07. Testear la latencia y funcionamiento del Relay simulando dos conexiones desde una máquina local. [FACIL]
- [ ] 2.08. Crear un microservicio (API) ligero que emita la URL o IP del servidor Relay actual, validando nuestra filosofía de arquitectura modular. [MEDIO]
- [ ] 2.09. Preparar el backend (Nakama) para consumir o informar dinámicamente sobre la disponibilidad de los Relays. [MEDIO]
- [ ] 2.10. Escribir un manual de despliegue claro e independiente en subcarpeta modular, llamado `GUIA_RELAY_SERVER.md`. [FACIL]

---

## FASE 3: ADAPTACIÓN DEL MATCHMAKING EN NAKAMA (5 Tareas)

- [ ] 3.01. Modificar el script de Matchmaking en Nakama para eliminar la dependencia de un host público. [AVANZADO]
- [ ] 3.02. Inyectar la dirección IP y el Puerto del servidor Relay seleccionado dentro del payload del MatchData. [MEDIO]
- [ ] 3.03. (Opcional - Futuro) Desarrollar lógica en Lua simulando un evaluador de ping que derive al jugador al mejor Relay de una lista (Ej: Miami, Sao Paulo). [AVANZADO]
- [ ] 3.04. Levantar o preparar una tabla en base de datos PostgreSQL de servidores Relay autorizados. [FACIL]
- [ ] 3.05. Crear petición RPC desde el cliente hacia Nakama para que el jugador obtenga el array de Servidores Relay disponibles en su frontend. [MEDIO]

---

## FASE 4: ADAPTACIÓN DEL CLIENTE (DESKTOP APP - ELECTRON) (10 Tareas)

- [ ] 4.01. Limpiar los textos e interfaces que instaban al host a "Abrir Puertos de su Router". [FACIL]
- [ ] 4.02. Diseñar e implementar un menú desplegable en el panel de Opciones del Usuario para que seleccione su Relay de preferencia o elija "Automático". [MEDIO]
- [ ] 4.03. Modificar el IPC Main (`launchGame`) en el proceso de Node/Electron para parsear la inyección de la IP del Relay. [MEDIO]
- [ ] 4.04. Obtener del evento de Nakama la IP asignada del servidor intermedio para una partida específica. [MEDIO]
- [ ] 4.05. Inyectar el comando correcto en el emulador para conectarse siendo Jugador 1 (emulando Host vía Relay). [AVANZADO]
- [ ] 4.06. Inyectar el comando correcto en el emulador para conectarse siendo Jugador 2 (emulando Cliente vía Relay). [AVANZADO]
- [ ] 4.07. Construir un medidor de ping visual para cada Relay Server en la lista, permitiendo al usuario probar en tiempo real la conexión. [MEDIO]
- [ ] 4.08. Aplicar overlay de estado: "Conectando con el Servidor Intermediario... por favor espere". [FACIL]
- [ ] 4.09. Probar todo el flujo end-to-end simulado con dos clientes abriendo subprocesos dentro de la misma PC hacia el Relay Cloud. [MEDIO]
- [ ] 4.10. Mostrar panel de resumen de partida (Ping, Server usado y Estado de Sync) al regresar de la partida local. [FACIL]

---

## FASE 5: CONFIGURACIÓN DEL EMULADOR PARA SERVIDOR RELAY (8 Tareas)

_Nota: Abstraer el proceso variará según usemos FBNeo puro vs RetroArch. Los checkbacks asumen una transición limpia._

- [ ] 5.01. Evaluar si la implementación de Relay será nativa por MITM (`netplay_mitm_server` de RetroArch) o requerirá un frontend Kaillera/GGPO. [AVANZADO]
- [ ] 5.02. Definir los mapeos de línea de comandos en un nuevo archivo `config_relay_template.ini`. [MEDIO]
- [ ] 5.03. Crear los scripts batch de prueba manual rápida (`start_relay_host.bat` y `start_relay_client.bat`). [FACIL]
- [ ] 5.04. Validar permisos con el Firewall de Windows para los protocolos de enrutamiento del nuevo ejecutable. [MEDIO]
- [ ] 5.05. Observar en logs y revisar desincronizaciones frente a caídas artificiales de paquetes UDP (Lag simulation). [AVANZADO]
- [ ] 5.06. Configurar el tamaño de buffer o input delay frames (`netplay_input_frames`) de acuerdo al ping entre el jugador y el Relay. [MEDIO]
- [ ] 5.07. Pasar dichos frames de buffer automáticamente desde la interfaz Electron hacia los argumentos del ejecutable del emulador. [AVANZADO]
- [ ] 5.08. Documentar detalladamente todos los comandos e instrucciones en `GUIA_EMULADOR_RELAY.md`. [FACIL]

---

## FASE 6: PRUEBAS EXTERNAS Y DISTRIBUCIÓN (5 Tareas)

- [ ] 6.01. Generar nueva compilación del cliente Electron (App V2). [MEDIO]
- [ ] 6.02. Entregar esta compilación a dos testers externos operando en redes residenciales cerradas sin puertos abiertos y validar conexión pura y limpia. [FACIL]
- [ ] 6.03. Analizar métricas y uso de memoria / ancho de banda (Bandwidth) consumido en la instancia del Relay gratuito. [MEDIO]
- [ ] 6.04. Reparar potenciales flujos de de-sync del rollback si la red intermitente causa estragos cruzando el Relay. [AVANZADO]
- [ ] 6.05. Finalizar release de código cerrado, empaquetar MVP V2 y hacer push a la rama respectiva. [FACIL]
