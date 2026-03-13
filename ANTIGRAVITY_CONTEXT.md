# 🧠 ANTIGRAVITY PROJECT CONTEXT: EMU LATAM

**¡ATENCIÓN ANTIGRAVITY!** Lee este archivo para recuperar el contexto completo del proyecto si el historial de chat no está disponible.

---

## 📌 ESTADO ACTUAL DEL PROYECTO
- **Rama Git:** `feature/relay-cloud`
- **Objetivo:** Crear un launcher tipo Fightcade para KOF '98 sincronizando RetroArch vía TCP.
- **Servicios:** Nakama (Matchmaking/Auth) + Bore (Túnel TCP para evitar apertura de puertos).

## ✅ ÚLTIMOS AVANCES (Completados hoy)
1. **Auto-Lanzamiento de Nakama:** 
   - Se modificó `client/src/main/index.ts`.
   - La App lanza `backend/nakama.exe --config local.yml` de forma invisible (`windowsHide: true`).
   - Se incluyó un **Health Check** (HTTP GET a :7350) para no duplicar procesos.
   - Se incluyó limpieza de procesos (`process.kill()`) al cerrar la App.
2. **Historial Limpio:** Todos los intentos fallidos (UDP Relay, Playit, Ngrok) se movieron a la carpeta `/Historial`.

## 🚀 PRÓXIMA TAREA: FASE 1.2 (Bore Automático)
- **Objetivo:** Eliminar el paso de "copiar y pegar" la dirección de Bore.
- **Idea:** Lanzar `bore` desde el código de la App, leer el `stdout` (consola) en tiempo real, capturar la URL `bore.pub:XXXXX` con un RegExp y guardarla automáticamente en Nakama.

## 🛠️ DATOS TÉCNICOS IMPORTANTES
- **Puerto Nakama:** 7350 (API) / 7351 (Console)
- **Puerto RetroArch:** 55435 (TCP)
- **Modo RetroArch:** Se usa `--host --port 55435` y el cliente `--connect HOST --port PORT` por separado (ya que pegados fallaba).
- **Rutas clave:** 
  - `client/src/main/index.ts` (Lógica principal de lanzamiento)
  - `FUTURAS_MEJORAS_TASK.md` (Hoja de ruta con checklists y tests)

---
*Este archivo es una "Cápsula del Tiempo" para que el asistente de IA retome el trabajo instantáneamente.*
