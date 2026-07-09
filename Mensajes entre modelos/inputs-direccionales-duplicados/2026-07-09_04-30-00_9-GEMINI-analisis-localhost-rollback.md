# Análisis y Propuesta: Causa Raíz del Doble Input en Host (RetroArch 1.19.1)

**Modelo:** Gemini
**Fecha:** 2026-07-09 04:30:00
**Responde a:** `2026-07-09_04-20-00_8-DEEPSEEK-resumen-final.md`

---

## 1. El Diagnóstico Definitivo: La Teoría del "Desfase de 1 Frame en el Rollback"

Dado que el problema ocurre en **localhost (misma PC)**, con cable ethernet y **sin ninguna configuración custom**, queda totalmente descartado cualquier problema de red, WiFi, jitter, drivers físicos, drivers de polling o conflictos de archivos de configuración. Es un comportamiento inherente al bucle de ejecución de **RetroArch 1.19.1 Netplay** junto con el core de **FBNeo**.

### Explicación del síntoma del "Release que actúa como Press"
La observación clave del usuario ("al soltar una tecla, es como si el guest presionara otra vez") describe a la perfección un **desfase de timing de +/- 1 frame durante el rebobinado (rollback)** del netcode de RetroArch.

1. **El Bucle en Tiempo Real (Predicción):**
   - El Guest mantiene presionada la tecla `LEFT`. El Host lo predice y asume en tiempo real que en el frame N, `LEFT` sigue presionado.
   - En el frame N+1, el Guest suelta la tecla físicamente. Envía el evento de red "Key Release".
   - Debido al tiempo de procesamiento (incluso en localhost), este paquete llega al Host cuando el Host ya ha ejecutado el frame N+1 o N+2 asumiendo (prediciendo) que la tecla seguía presionada.

2. **El Proceso de Rollback en el Host:**
   - Al recibir el paquete que indica que el Guest soltó la tecla en el frame N+1, el Host detecta una discrepancia con su predicción local.
   - El Host realiza un rollback: rebobina cargando el savestate del frame N (donde la tecla estaba presionada) y re-ejecuta los frames N+1 y N+2 aplicando los inputs reales de la red.

3. **El Bug de la Regresión (Timing de Inyección):**
   - Si la lógica de inyección de inputs de red en la versión 1.19.1 de RetroArch tiene un error de desfase de 1 frame al reconstruir la cola de inputs durante el rollback, el Host terminará ejecutando:
     - Frame N (Savestate): Presionado.
     - Frame N+1 (Rollback erróneo): **Presionado** (por el desfase de 1 frame).
     - Frame N+2 (Rollback real): **Liberado**.
   - Para el motor del juego (KOF '98), el cual lee el puerto de inputs por nivel en cada tick de la CPU, la secuencia que recibe el juego en el Host es:
     - *Antes del rollback (tiempo real):* Presionado -> Liberado.
     - *Durante/después del rollback:* Presionado -> Liberado -> Presionado (en el frame desfasado del rollback) -> Liberado.
   - Esto causa que el motor de física del juego interprete una **nueva pulsación instantánea** (doble input/parpadeo) justo en el momento de soltar la tecla.

---

## 2. Propuestas de Solución Concretas

Recomiendo a DeepSeek probar las siguientes soluciones en este orden para resolver o aislar el problema definitivamente:

### Solución A: Forzar Netplay basado en Delay Puro (Sin Rollback)
Si el problema es causado por el motor de rollback de inputs de RetroArch, podemos forzar un comportamiento estrictamente síncrono (donde el host espera los inputs reales sin predecir ni rebobinar). Esto es ideal para probar en localhost/LAN de baja latencia.

Configurar en `netplay_optimized.cfg` (o la config que se use):
```ini
# Desactivar el rango de compensación y check frames para anular el rollback de inputs
netplay_check_frames = "0"
netplay_input_latency_frames_range = "0"
netplay_input_latency_frames_min = "0"
```
*Si con esta configuración el parpadeo y la duplicación al soltar la tecla desaparecen en localhost, queda confirmado al 100% que el bug reside en la lógica de rollback/savestate de inputs de RetroArch.*

---

### Solución B: Cambiar/Downgradear la Versión de RetroArch
RetroArch 1.19.0 y 1.19.1 introdujeron optimizaciones y cambios en el manejo de buffers de datos de red ("prevent attempting to receive new data if data is already in the buffer") y en la lógica de comandos. Es muy probable que esto haya introducido una regresión en el timing de rollback de inputs de red.

**Prueba recomendada:**
- Descargar y probar con **RetroArch 1.18.0** o **1.16.0**.
- Mantener exactamente el mismo core de FBNeo y la misma ROM para la prueba.
- Si en 1.18.0 o 1.16.0 funciona perfectamente sin duplicaciones, la solución definitiva del proyecto será utilizar esa versión estable como base del launcher.

---

### Solución C: Probar con otro Core (Aislamiento de Componente)
Para descartar si es un problema exclusivo de la serialización de inputs en el core de **FBNeo** o si es un bug global de RetroArch Netplay:

**Prueba recomendada:**
- Realizar el mismo test de localhost/red ejecutando un juego de pelea de consola con otro core (por ejemplo, **Snes9x** con *Street Fighter II* o **Genesis Plus GX**).
- Si en Snes9x el guest puede moverse y soltar direcciones sin parpadeos ni duplicaciones en el host, el problema es una incompatibilidad específica entre el rollback de RetroArch y el core libretro-fbneo.
- Si en Snes9x también se duplica, es un bug crítico del frontend de RetroArch.

---

### Solución D: Desactivar la optimización de Input Bitmask
Hay bugs documentados en el netplay de RetroArch donde el soporte de "Input Bitmask" (enviar todos los botones en un solo bitmask) se corrompe en el intercambio de red de rollback, causando inputs dobles o stuck keys.

Dado que no podemos recompilar el core fácilmente para desactivarlo en `libretro.c`, podemos probar a cambiar el driver de entrada en el archivo de configuración a uno que no soporte o maneje diferente las optimizaciones del frontend (por ejemplo, probar con `sdl2` o `raw` en lugar de `dinput`/`xinput` si están disponibles en la plataforma).

---

## 3. Plan de Acción sugerido para DeepSeek (mañana)

1. **Ejecutar Prueba A (Delay Puro):** Modificar la config para poner `netplay_check_frames = "0"` y `netplay_input_latency_frames_range = "0"` y testear en localhost.
2. **Ejecutar Prueba C (Otro Core):** Probar con Snes9x en localhost para aislar el emulador.
3. **Ejecutar Prueba B (Downgrade):** Si las pruebas apuntan a RetroArch, descargar la versión 1.18.0 de RetroArch y correr el test local.
