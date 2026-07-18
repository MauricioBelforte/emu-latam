# 04 - Registro de Pruebas - Test de Latencia, Buffer y Rollback

---

## [8] — 2026-07-18: check_frames=300 + input_block_timeout (3 y 10) ❌ NO FUNCIONÓ

### Config probada
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_input_latency_frames_range: 1
- netplay_check_frames: 300
- input_block_timeout: 3 (luego 10)

### Objetivo
Evitar que el check sync interrumpa inputs que llegan justo en el
borde del frame (tiriteo al presionar tecla durante el check).

### Resultados
- **input_block_timeout=3**: ❌ No solucionó el tiriteo
- **input_block_timeout=10**: ❌ No solucionó el tiriteo, y causó desync de audio
- **Conclusión**: El tiriteo no es un problema de "paquete que llega 1ms
  tarde" — el check sync resetea estado del juego y ningún timeout
  de input lo mitiga.

### Veredicto
Volvemos a test [6] (check_frames=0, min=1, range=1).
El desync ocurrió en test [7] (buffer 2-4), no en esta config.
input_block_timeout descartado como solución.

---

## [9] — 2026-07-18: Hallazgo — Tiriteo por check sync en AMBAS PCs

### Descubrimiento
Se encontró un patrón que inicialmente parecía específico del PC Ryzen 7,
pero tras análisis más detallado:

- **PC1 (Ryzen 7 5700G, 16GB RAM, monitor 60Hz)**: Tiriteo MUY NOTORIO.
  El personaje se agacha/se para, frena/acelera, cada `check_frames/60`
  segundos. Con check=30 → cada ~0.5s. Con check=180 → cada ~3s.
  Sin importar si es host o guest, ni el método de conexión.
- **PC2 (Athlon X2, 4GB RAM, monitor 60Hz)**: El MISMO tiriteo existe pero
  es casi imperceptible. Esporádico y asimétrico.

### Características del tiriteo
- **No es solo agachado:** Afecta TODOS los inputs direccionales (← → también).
- **Es rítmico:** Perfectamente sincronizado con el intervalo de `check_frames`.
- **Ocurre en AMBAS PCs:** La diferencia es la intensidad con que se percibe.
- **Causa:** El check sync de RetroArch congela momentáneamente el sistema
  de inputs. No es un problema de "paquete que llega tarde" — es una
  pausa/rolback que interrumpe el input fluido.

### Conclusión
**El tiriteo NO es exclusivo del Ryzen.** El Athlon también lo tiene pero
es imperceptible. La diferencia de notoriedad probablemente se deba a:
1. Ryzen maneja las interrupciones/sincronización de forma más agresiva
2. Ryzen tiene frecuencias de CPU que fluctúan más (boost vs idle)
3. Ryzen tiene GPU/displays que acentúan micro-pausas

### Soluciones viables
- **check_frames=0**: Elimina el tiriteo por completo en ambas PCs, pero
  no hay verificación de sync. Riesgo de desync asumido. Solo ocurrió
  con test [7] (buffer 2-4), no con test [6] (buffer 1-2).
- **check_frames=30 (o más)**: Verifica sync, pero el tiriteo es inevitable
  en el Ryzen. En el Athlon pasa desapercibido. La dirección correcta
  (Athlon host, Ryzen guest) no elimina el tiriteo — solo evita que sea
  en la PC que más lo nota en ese rol específico.
- En la práctica, con check_frames=30 ambos lados lo tienen, pero el que
  está en la Athlon no lo nota y el que está en el Ryzen sí.
  Por eso la "solución" de Athlon host funciona: el tiriteo del Ryzen
  como guest no existe (porque el check lo hace el host, que es la Athlon
  y pasa desapercibido).

### Config recomendada
```ini
run_ahead_enabled = "false"
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "1"
netplay_check_frames = "30"
```
Athlon como host para minimizar el tiriteo percibido por el usuario que
está en la PC más potente (Ryzen).

### Pendiente para próxima sesión
- [ ] **Probar delay intencional al lanzar RA en Ryzen:** Si la Athlon
  tarda en abrir RetroArch y el Ryzen abre instantáneo, el Ryzen tiene
  una "ventaja" de frames antes de que la conexión netplay se establezca.
  Agregar un setTimeout de 3-5s antes de spawnear RA en el Ryzen para
  que ambas PCs inicien netplay sincronizadas. Hipótesis: esto podría
  reducir o eliminar el tiriteo porque el primer check sync no encontraría
  diferencias de inicialización.

---

## [7] — 2026-07-18: Buffer dinámico 2-4 (min=2, range=2) ❌ DESYNC

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 2
- netplay_input_latency_frames_range: 2
- netplay_check_frames: 0

### Objetivo
Eliminar el doble visual en select de personajes subiendo el buffer
base a 2 frames, con rango dinámico hasta 4 si hay jitter.

### Resultados
- **Jugabilidad general**: ✅ Igual que antes, no se siente más lento
- **Doble input en pelea**: ✅ Sin doble toque
- **Select de personajes**: ⚠️ 1er intento: doble movimiento; 2do intento: no
- **Lag percibido**: 2 (igual que min=1, tolerable)
- **Desync**: ❌ OCURRIÓ (mató la partida)
- **Audio**: Sin cortes

### Verificación (revertido a test [6])
Se revirtió a `min=1, range=1, check_frames=0` y se probó de nuevo:
- No se logró reproducir el desync
- La config test [6] se mantiene estable sin desync

### Conclusión
El buffer más grande (`min=2, range=2`) causó desync. Posiblemente
porque al tener 2-4 frames de margen, el estado del juego divergió
sin que `check_frames=0` lo detectara. Con buffer 1-2 la divergencia
no alcanza a acumularse.

**CONFIG DEFINITIVA: test [6] — min=1, range=1, check_frames=0, run_ahead=false**

---

## [6] — 2026-07-16: Buffer dinámico + check=0 ✅ CONFIG FINAL

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_input_latency_frames_range: 1
- netplay_check_frames: 0

### Resultados
- **Personaje parado al agachado**: ✅ Desapareció por completo
- **Doble toque en pelea**: ✅ No hay
- **Select personajes**: ⚠️ Mínimo doble visual en host (imperceptible)
- **Desync**: ✅ No se detectó
- **Lag percibido**: 1 (instantáneo)
- **Audio**: ✅ Sin cortes

### Conclusión
**CONFIGURACIÓN DEFINITIVA confirmada el 18-Jul-2026.** El rollback
(check_frames) causaba las interrupciones de inputs sostenidos (agachado).
input_block_timeout no lo mitiga porque el tiriteo es por reset de estado,
no por timing de paquete.

**Nota importante:** El tiriteo con check_frames>0 solo ocurre en el PC
Ryzen 7. En el Athlon X2 nunca tirittea. La config check_frames=30 funciona
perfectamente cuando la Athlon es host y la Ryzen es guest. Ver test [9].

### Config final
```ini
run_ahead_enabled = "false"
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "1"
netplay_check_frames = "0"
```

---

## [5] — 2026-07-16: Buffer dinámico + check=30 ❌

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_input_latency_frames_range: 1
- netplay_check_frames: 30 (↓ desde 180)

### Objetivo
Reducir check_frames de 180 a 30 (0.5s) para corregir desyncs más rápido.

### Resultados
- Doble toque: ❌ Se nota claramente. Al mantener agachado, el personaje
  se para solo intermitentemente (rollback corrigiendo inputs cada 0.5s).
- Desync: ?
- Select personajes: ?

### Conclusión
check_frames=30 es demasiado frecuente. El rollback de RetroArch corrige
los inputs del guest cada 0.5s y eso se traduce en que un "hold" se
interrumpa visiblemente. Se vuelve a check_frames=180.

---

---

## [4] — 2026-07-16: Buffer dinámico 1-2 (min=1, range=1) ✅ JUGABLE

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_input_latency_frames_range: 1
- netplay_check_frames: 180

### Objetivo
Probar buffer dinámico: arranca en 1 frame (rápido) pero sube a 2
automáticamente si hay fluctuación.

### Modo
- Tipo: Tailscale cross-PC
- Host: PC2 / Guest: PC1 (guest presiona ← en select, host ve doble)
- Sentido inverso también probado

### Resultados
- **Jugabilidad general**: ✅ MUY BUENA. Sin lag perceptible. Respuesta rápida.
- **Doble input en juego**: ✅ No hay. Los movimientos durante la pelea son correctos.
- **Select de personajes**: ⚠️ En PC del host se ve un doble movimiento visual
  cuando el guest elige personaje (se mueve 2 slots y vuelve), pero en la
  PC del guest se ve normal. Es solo visual, no afecta la selección real.
- **Lag percibido**: 1 (instantáneo, mejor que buffer=2 fijo)
- **Audio**: Sin cortes durante la pelea.

### Conclusión
Esta es la mejor configuración hasta ahora. El doble movimiento en el select
de personajes parece ser un artefacto visual de netplay en esa pantalla
específica (FBNeo maneja distinto los inputs en select), no un problema real
de input duplicado. Durante la pelea el comportamiento es correcto en ambos lados.

### Recomendación
Usar esta configuración como estable: `min=1, range=1, check=180, run_ahead=false`.
El doble visual en select es aceptable y no afecta la jugabilidad.

---

## [3] — 2026-07-16: Buffer 2 + check 180 + run_ahead false (suspendido)

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 2 (no probado, saltamos a [4])
- netplay_check_frames: 180

---

## [2] — 2026-07-16: Buffer 1 + check 180 + run_ahead false ❌

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 1
- netplay_check_frames: 180

### Resultados
- Doble toque: ❌ VOLVIÓ (confirmado, misma configuración que [1] pero con buffer=1)
- Desync: ?
- Lag percibido: 1 (instantáneo)

### Conclusión
El buffer de 1 frame es insuficiente. Incluso con run_ahead=false,
el doble toque aparece. El mínimo necesario es 2 frames.
Run-ahead no era la causa principal; el buffer de 1 frame no da
margen para que los inputs del guest lleguen a tiempo.

---

## [1] — 2026-07-16: Buffer 2 + check 180 ✅

### Config
- run_ahead_enabled: false
- netplay_input_latency_frames_min: 2
- netplay_check_frames: 180

### Modo
- Tipo: Tailscale cross-PC
- Host: PC2 / Guest: PC1

### Resultados
- Doble toque: ✅ No hay
- Desync: ❌ Se detectó desync (personaje muerto en una PC, vivo en otra)
- Lag percibido: 3 (notorio, "lento")

### Observaciones
Usuario reporta sensación de lentitud con buffer=2. El desync ocurrió a pesar de check=180.

---

