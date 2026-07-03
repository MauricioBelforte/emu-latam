# Análisis de Solución - Fase 1.3

## 1. Espera Activa del Servidor Nakama
Para prevenir el login rápido, el frontend de React necesita conocer el estado del servidor local de Nakama. 
- **Alternativa A:** Hacer fetch HTTP directamente desde React al puerto `7350`. 
  *Desventaja:* Mezcla lógica de red nativa y CORS con el frontend directamente.
- **Alternativa B (Elegida):** Exponer una función IPC a través del Main Process de Electron (`check-nakama-health`). El frontend consume este canal para cambiar su estado interno `isServerReady`. Es más desacoplado y consistente con las Reglas de Modularidad.

## 2. Simplificación del Guardado de IP (Join Directo)
El botón "Guardar Configuración" es redundante.
- **Decisión:** Al presionar "JOIN GAME", se lee el estado actual de `customRelay` (el cual se actualiza reactivamente por `onChange` en el input), se guarda en `localStorage` de forma transparente y se procede al lanzamiento de RetroArch.

## 3. Optimización Anti-Lag en RetroArch (Run-Ahead)
De acuerdo a la investigación realizada (`RUNAHEAD_PLAN.md`), se determinaron las siguientes configuraciones óptimas para KOF '98 en core FBNeo:
- **Run-Ahead:** Habilitado (`run_ahead_enabled = "true"`).
- **Frames de Run-Ahead:** `1`. Más de esto puede causar jitter/saltos de renderizado en juegos de pelea.
- **Segunda Instancia:** Desactivada (`run_ahead_secondary_instance = "false"`) debido a incompatibilidades conocidas con el core FBNeo.
- **Netplay Input Latency:** `1` (mínimo delay local para dar tiempo de viaje de red).
- **Video Frame Delay:** `8` (reduce latencia del polling de inputs).
- **Hard GPU Sync:** Activado (`video_hard_sync = "true"`, `video_hard_sync_frames = "0"`) para forzar sincronía CPU-GPU.

### Mecanismo de Inyección en RetroArch
Usaremos la bandera de consola de RetroArch `--appendconfig <archivo.cfg>`. Esto permite que el emulador corra combinando la configuración base del usuario con nuestro perfil específico optimizado para Netplay.