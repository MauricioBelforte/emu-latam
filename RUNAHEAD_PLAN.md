# 🎯 INVESTIGACIÓN Y PLAN: REDUCCIÓN DE LATENCIA EN RETROARCH NETPLAY

## 📌 Contexto del Problema
Al jugar KOF '98 online con Bore Tunnel (bore.pub), experimentamos ~500ms de lag. Esto se debe a:
1. **Latencia de Red:** El servidor público de Bore está lejos (probablemente USA/Europa). Un VPS en Sudamérica lo reduciría a ~30-60ms.
2. **Latencia Interna del Juego:** KOF '98 tiene frames de delay inherentes entre presionar un botón y ver la acción en pantalla.
3. **Configuración Default de RetroArch:** Sin optimizaciones, RetroArch no compensa ninguno de estos delays.

Este documento cubre las técnicas disponibles para mitigar la latencia **por software**, sin importar dónde esté el servidor.

---

## 🧠 TÉCNICA 1: RUN-AHEAD (La Principal)

### ¿Qué es?
Run-Ahead ejecuta el juego internamente varios frames "adelante" de lo que ves en pantalla. Cuando presionás un botón, el emulador ya calculó qué pasaría y te muestra el resultado al instante. Puede lograr **menos latencia que el hardware original**.

### ¿Cómo funciona con Netplay?
- En modo Netplay, el sistema de rollback de RetroArch **detecta tu configuración de Run-Ahead**.
- Resta esos frames de su propio cálculo interno de latencia.
- **Resultado:** Si configurás 1 frame de Run-Ahead, internamente Netplay usa `-1` de input latency, lo que hace que el jugador reaccione un frame más rápido.

### Parámetros de Configuración (retroarch.cfg)
```ini
run_ahead_enabled = "true"
run_ahead_frames = "1"
run_ahead_secondary_instance = "false"
```

### ¿Cuántos frames usar para KOF '98?

**Procedimiento para determinar el valor óptimo:**
1. Iniciar KOF '98 en RetroArch (modo offline).
2. Pausar la emulación (tecla `P`).
3. Mantener presionado un botón de acción (ej: puñetazo).
4. Avanzar frame por frame (tecla `K`) hasta que el personaje reaccione.
5. Contar los frames que pasaron **antes** de la reacción. Ese número menos 1 = tu Run-Ahead ideal.

**Recomendación para juegos de pelea:**
- **Empezar con `1` frame.** Es el valor más seguro y ya ofrece una mejora notable.
- **No superar `2` frames.** Valores más altos pueden causar "jitter" visual (saltos de imagen) en juegos de pelea rápidos como KOF, y pueden "comerse" inputs.

### ⚠️ Consideraciones Importantes para FBNeo
- **Segunda Instancia:** Para el core **FBNeo**, los desarrolladores recomiendan mantener `run_ahead_secondary_instance` en **OFF** (`"false"`). Activarla puede causar problemas con este core específico.
- **Rendimiento:** Cada frame de Run-Ahead duplica la carga de CPU. En PCs modernas no es un problema para juegos retro, pero tenerlo en cuenta.
- **Requisito:** El core debe soportar save states. FBNeo los soporta al 100%.

---

## 🧠 TÉCNICA 2: PREEMPTIVE FRAMES (Alternativa Moderna)

### ¿Qué es?
Introducida en RetroArch 1.15 (2023), es una versión más eficiente de Run-Ahead. En vez de re-ejecutar todos los frames constantemente, solo re-ejecuta cuando el estado del control **cambia** (es decir, cuando apretás o soltás un botón).

### Parámetros de Configuración
```ini
preemptive_frames_enable = "true"
preemptive_frames = "1"
run_ahead_enabled = "false"  # ¡IMPORTANTE! Desactivar Run-Ahead si usás Preemptive.
```

### ¿Cuándo usar Preemptive vs Run-Ahead?
| Característica | Run-Ahead | Preemptive Frames |
|:---|:---|:---|
| **Consumo CPU** | Alto (recalcula cada frame) | Bajo (solo al cambiar input) |
| **Madurez** | Más probado (desde 2018) | Más nuevo (desde 2023) |
| **Compatibilidad** | Confirmado con FBNeo | Confirmado con FBNeo |
| **Recomendación** | PCs potentes | PCs más modestas |

**Nuestra decisión:** Empezaremos con **Run-Ahead (1 frame)** por ser la opción más documentada y probada. Si encontramos problemas de rendimiento, cambiaremos a Preemptive Frames.

---

## 🧠 TÉCNICA 3: NETPLAY INPUT LATENCY FRAMES

### ¿Qué es?
Este parámetro añade un delay **intencional** a tus inputs locales para darle tiempo a la red de sincronizar con el otro jugador. Suena contraproducente, pero:
- Si el ping es de 100ms, y configurás 2 frames de input latency, le das al sistema 2 frames extra para recibir los inputs del oponente.
- **Reduce los "rollbacks"** (esos saltos visuales donde el juego corrige posiciones).

### Parámetros de Configuración
```ini
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "0"
```

### Recomendación
- Valor `1` o `2` según el ping real.
- **Ambos jugadores deben usar el mismo valor** para sincronizar correctamente.

---

## 🧠 TÉCNICA 4: NETPLAY CHECK FRAMES

### ¿Qué es?
Este parámetro controla cada cuántos frames RetroArch verifica la sincronización entre los jugadores.

### Parámetros de Configuración
```ini
netplay_check_frames = "0"
```

### Recomendación  
- Ponerlo en `0` **puede reducir el stuttering** (micro-cortes).
- **Riesgo:** Al desactivar la protección contra desincronización, podrían producirse desyncs más frecuentes que requieran reconexión.
- **Para KOF '98** (juego corto, peleas de 2 min): el riesgo es aceptable.

---

## 🧠 TÉCNICA 5: FRAME DELAY

### ¿Qué es?
Retrasa ligeramente la ejecución del emulador para mover el "polling" de inputs más cerca del momento de renderizado. Esto reduce la latencia entre tu control y lo que ves.

### Parámetros
```ini
video_frame_delay = "8"
```
- Valor recomendado: entre `4` y `15` ms.
- Si causa crackling de audio o caída de FPS, bajar el valor.

---

## 🧠 TÉCNICA 6: HARD GPU SYNC

### ¿Qué es?
Fuerza al GPU a sincronizarse con la CPU en cada frame, eliminando frames "pre-renderizados" que añaden latencia visual.

### Parámetros
```ini
video_hard_sync = "true"
video_hard_sync_frames = "0"
```

---

## 🛠️ PLAN DE IMPLEMENTACIÓN EN EL CÓDIGO

### Estrategia: `--appendconfig`
RetroArch permite cargar un archivo de configuración extra que **sobrescribe** los valores default. Esto es ideal porque:
- No tocamos el `retroarch.cfg` principal del usuario.
- Creamos un archivo dedicado para netplay.
- Lo cargamos automáticamente desde nuestro código de Electron.

### Paso 1: Crear archivo `retroarch/netplay_optimized.cfg`
```ini
# ========================================
# EMU LATAM - CONFIGURACIÓN ANTI-LAG
# ========================================

# Run-Ahead (1 frame para KOF 98)
run_ahead_enabled = "true"
run_ahead_frames = "1"
run_ahead_secondary_instance = "false"

# Netplay Latency Compensation
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "0"
netplay_check_frames = "0"

# Frame Delay (reducir visual lag)
video_frame_delay = "8"

# GPU Sync (eliminar frames pre-renderizados)
video_hard_sync = "true"
video_hard_sync_frames = "0"
```

### Paso 2: Modificar `client/src/main/index.ts`
Agregar `--appendconfig` al spawn de RetroArch:

```typescript
// En la sección donde armamos spawnArgs:
const optimizedCfg = path.join(retroArchDir, "netplay_optimized.cfg");
if (fs.existsSync(optimizedCfg)) {
  spawnArgs.push("--appendconfig", optimizedCfg);
}
```

### Paso 3: Test
1. Lanzar el juego con `npm run dev`.
2. Presionar `1. HOST GAME`.
3. En la consola de RetroArch (si tiene log habilitado), verificar que los parámetros se cargaron:
   - Buscar `"Setting 'run_ahead_enabled' to 'true'"` en el log.
4. Verificar mejora subjetiva de la latencia.

---

## 📊 RESUMEN DE IMPACTO ESPERADO

| Técnica | Reducción Estimada | Riesgo |
|:---|:---|:---|
| **Run-Ahead (1 frame)** | ~16ms (1 frame @ 60fps) | Bajo |
| **Netplay Input Latency** | Elimina rollbacks visuales | Ninguno |
| **Frame Delay** | ~8ms adicionales | Ninguno |
| **Hard GPU Sync** | ~5-10ms | Ninguno |
| **netplay_check_frames=0** | Menos stuttering | Posibles desyncs |
| **TOTAL ESTIMADO** | **~30-40ms menos de lag percibido** | |

> **NOTA:** Estos ajustes mejoran la latencia PERCIBIDA. La latencia de red real (ping) solo mejorará con un VPS más cercano geográficamente (Fase 2).

---

## 🔗 FUENTES CONSULTADAS
- [Libretro Docs: Run-Ahead](https://docs.libretro.com/guides/runahead/)
- [Reddit: FBNeo y Run-Ahead - Recomendaciones de desarrolladores](https://www.reddit.com/r/RetroArch/)
- [RetroArch Wiki: Command Line Interface (--appendconfig)](https://docs.libretro.com/guides/cli-intro/)
- [YouTube: RetroArch Preemptive Frames vs Run-Ahead (2024)](https://www.youtube.com/)
- [NHL94 Community: Netplay Input Latency Frames Guide](https://www.nhl94.com/)
- [Reddit: netplay_check_frames y stuttering](https://www.reddit.com/r/RetroArch/)

---
*Documento de investigación para la Fase 1.3 del proyecto Emu Latam. Listo para ser aplicado en la próxima sesión de desarrollo.*
