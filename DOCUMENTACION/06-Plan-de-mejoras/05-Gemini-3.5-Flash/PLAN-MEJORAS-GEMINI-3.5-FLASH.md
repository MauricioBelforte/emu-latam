# Plan de Mejoras — Gemini 3.5 Flash

> Propuesta estratégica e independiente de análisis técnico para el launcher Emu Latam.
> Generada el 17/07/2026 por Gemini 3.5 Flash.

Este documento presenta una propuesta detallada y de alto impacto técnico orientada a mejorar la confiabilidad, la seguridad, el rendimiento y la experiencia de usuario (UX) en Emu Latam. Se centra en resolver problemas subyacentes de la arquitectura de red y del emulador utilizando tecnologías nativas ya incluidas en el stack, sin duplicar los análisis previos realizados por otros modelos.

---

## Dimensiones Críticas y Propuestas de Mejora

### 1. Diagnóstico de Transporte Tailscale y Ajuste de Buffer Dinámico Pre-Partida
*   **Problema:** Aunque la integración con Tailscale está activa, el launcher no tiene visibilidad del canal real de transporte. Si los dos nodos no logran establecer una conexión P2P directa y en su lugar se conectan a través de un servidor relay de Tailscale (DERP), la latencia aumenta sustancialmente (de ~20ms a >150ms). Esto arruina la experiencia de netplay en KOF '98 sin dar al usuario explicación alguna.
*   **Propuesta:** 
    *   **Diagnóstico Activo:** Invocar la CLI de Tailscale (`tailscale status --json`) en el Main Process antes de lanzar la partida para comprobar si el peer remoto se conecta vía `direct` (P2P) o `relay` (DERP).
    *   **Ajuste Dinámico de Buffers:** Si se detecta un relay DERP o alta latencia, configurar automáticamente en `retroarch/netplay_optimized.cfg` un buffer mayor (ej. `latency_frames_min = 3`, `latency_frames_range = 2`). Si la conexión es directa, fijarla en el valor ultra-bajo (`latency_frames_min = 1`, `latency_frames_range = 1`).
    *   **Visualización en el Frontend:** Mostrar en la sala de juego un indicador de calidad de conexión: "Conexión Directa P2P (Excelente)" o "Conectado vía Relay (Latencia Alta)".

---

### 2. Autenticación Persistente y Matchmaking Nativo en Nakama
*   **Problema:** El launcher usa `loginGhost()` generando cuentas locales anónimas de Nakama temporales. Al reiniciar la app, se crea un usuario nuevo en la base de datos PostgreSQL, contaminándola con cuentas "basura" y perdiendo el historial/estadísticas del jugador. Además, la búsqueda de oponentes y salas es manual en base de datos.
*   **Propuesta:**
    *   **ID de Dispositivo Persistente:** Generar un UUID único persistido de forma segura en las configuraciones locales de la aplicación (usando `electron-store` o un archivo JSON cifrado en `userData`). El launcher usará este UUID para la autenticación persistente con `authenticateDevice()` de Nakama. Esto conserva la cuenta del jugador en múltiples lanzamientos.
    *   **Matchmaking y Parties Nativas:** Reemplazar el modelo manual de salas en base de datos por el motor nativo de matchmaking en tiempo real de Nakama. Los jugadores introducen sus preferencias (ej. región, ping aceptable, rango de habilidad) y Nakama los empareja automáticamente creando la sesión y compartiendo los hashes y puertos de conexión.

---

### 3. Protocolo de Control por Red de RetroArch (UDP Network Commands)
*   **Problema:** Al detener una partida, el launcher finaliza RetroArch matando el proceso (`taskkill` o `process.kill()`). Esto puede dejar archivos corruptos de savestates, no actualiza correctamente las estadísticas locales y corta abruptamente la comunicación TCP, aumentando el riesgo de desyncs colaterales en la red.
*   **Propuesta:**
    *   **Comandos UDP Activos:** RetroArch posee una interfaz opcional de red (`network_cmd_enable = true` en puerto UDP `55400`). El Main Process de Electron puede enviar comandos directos en formato de string simple por socket UDP, tales como `QUIT` para un cierre limpio, `PAUSE` ante un focus out de la ventana o `FAST_FORWARD_TOGGLE` si se detecta desfase.
    *   **Monitoreo del Estado de Emulación:** Usar comandos de red para consultar si el core está corriendo (`GET_STATUS`), permitiendo que el launcher actualice el estado del usuario en Nakama en tiempo real ("En combate", "En el menú de selección").

---

### 4. Watchdog de Procesos y Gestión de Códigos de Salida
*   **Problema:** Cuando RetroArch o Bore fallan al iniciar (por ejemplo, falta del core FBNeo, ROM incorrecta con diferente hash o falta de BIOS `neogeo.zip`), el proceso hijo finaliza silenciosamente con un código de error y el usuario ve un estado de carga infinito en la interfaz.
*   **Propuesta:**
    *   **Supervisor de Procesos Hijos:** Crear una clase centralizada en el Main Process que supervise todos los `child_process` (`retroarch.exe`, `bore.exe`, `nakama.exe`).
    *   **Mapeo de Errores y Diagnóstico:** Interceptar el stream `stderr` y escuchar el evento `close`. Si el proceso se detiene con un código distinto de cero, parsear el error. Si el código es `1` y en stderr figura falta de neogeo, la UI de React recibirá un evento IPC con un diagnóstico descriptivo ("Falta el BIOS neogeo.zip en la carpeta retroarch/system") en lugar de un spinner indeterminado.

---

### 5. Handshake de Control en Transparent Forwarder (Seguridad Contra Escaneos)
*   **Problema:** Para jugar a través de Bore, se expone el puerto del forwarder local a la red pública a través de `bore.pub:XXXXX`. Cualquier actor malicioso en Internet que escanee los puertos abiertos de `bore.pub` y envíe tráfico TCP en el momento adecuado puede conectarse al puerto netplay de RetroArch de la víctima o saturar el proxy del launcher.
*   **Propuesta:**
    *   **Handshake Criptográfico Ligero:** En lugar de pipear bytes transparentes directamente, el Transparent Forwarder (Node.js) escuchará la conexión entrante y exigirá un token efímero de validación (generado durante la señalización por Nakama) antes de reenviar el tráfico al puerto 55435.
    *   **Control de Conexiones por IP:** Restringir la comunicación en el forwarder local únicamente a la IP asignada del oponente verificada por la sala de matchmaking, rechazando paquetes provenientes de IPs escaneadoras.

---

### 6. Sistema de Repeticiones (Replays) e Intercambio de Capturas en Nakama Storage
*   **Problema:** No hay forma de compartir partidas jugadas ni capturas de victorias en la comunidad. Las grabaciones de inputs de RetroArch quedan almacenadas localmente en cada PC de forma aislada.
*   **Propuesta:**
    *   **Integración de Nakama Storage:** Utilizar la API de objetos de almacenamiento de Nakama para permitir que, al finalizar un reto, el launcher cargue el archivo de grabación de inputs `.bsv` de RetroArch y las capturas de pantalla tomadas.
    *   **Listado Comunitario en React:** Crear una sección de "Repeticiones de la Comunidad" donde cualquier usuario pueda descargar los archivos `.bsv` compartidos y lanzarlos directamente con un clic desde el launcher con RetroArch en modo reproducción de replay (`retroarch.exe --play-replay`).

---

## Matriz de Priorización y Complejidad

| Mejora | Complejidad de Desarrollo | Impacto UX / Red | Prioridad sugerida |
| :--- | :--- | :--- | :--- |
| **1. Diagnóstico Tailscale & Buffer** | Media-Baja | Crítico | **Alta** |
| **2. Matchmaking Nativo & Cuentas** | Media-Alta | Alto | **Alta** |
| **3. Comandos de Red UDP (RA)** | Media | Media | **Media** |
| **4. Watchdog & Mapeo de Errores** | Baja | Alto (Estabilidad) | **Alta** |
| **5. Handshake de Red en Proxy** | Media-Alta | Alto (Seguridad) | **Baja** |
| **6. Repeticiones & Replays** | Media | Alto (Comunidad) | **Media** |
