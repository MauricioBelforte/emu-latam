# 🧠 ANTIGRAVITY PROJECT CONTEXT: EMU LATAM

**¡ATENCIÓN ANTIGRAVITY!** Lee este archivo para recuperar el contexto completo del proyecto si el historial de chat no está disponible.

---

## 📌 ESTADO ACTUAL DEL PROYECTO
- **Rama Git:** `feature/relay-cloud`
- **Objetivo:** Crear un launcher tipo Fightcade para KOF '98 sincronizando RetroArch vía TCP.
- **Servicios:** Nakama (Matchmaking/Auth) + Bore (Túnel TCP para evitar apertura de puertos).

## ✅ FASE 1 COMPLETADA (Local Automation)
1. **Auto-Lanzamiento de Nakama:** 
   - La App lanza `backend/nakama.exe` de forma invisible.
   - Posee **Health Check** para evitar duplicados y **Auto-Kill** al cerrar.
2. **Bore Automático (Fase 1.2):**
   - El Host ya no usa archivos `.bat` externos.
   - Al presionar "HOST GAME", la App lanza `bore.exe` internamente.
   - **Captura el Stdout:** Usa un `Regex` para extraer la URL `bore.pub:XXXX` y la carga automáticamente en el campo de Relay.
   - **User Feedback:** Agregado estado de "CREANDO TÚNEL..." en el botón.

## 🚀 PRÓXIMA TAREA: FASE 2 (VPS & Cloud)
1. **Centralización:** Migrar Nakama y el servidor de Bore al VPS para tener una IP fija y 24/7.
2. **Invitaciones Automáticas:** Implementar el "Matchmaking" real donde el Invitado ve un cartel para unirse sin pegar IPs.
3. **Optimización Sugerida:** Configurar `netplay_check_frames` en RetroArch para suavizar el lag una vez que el VPS esté en una zona cercana (Sudamérica).

## 🛠️ DATOS TÉCNICOS IMPORTANTES
- **Puerto Nakama:** 7350 (API) / 7351 (Console)
- **Puerto RetroArch:** 55435 (TCP)
- **Modo RetroArch:** Se usa `--host --port 55435` y el cliente `--connect HOST --port PORT` por separado (ya que pegados fallaba).
- **Rutas clave:** 
  - `client/src/main/index.ts` (Lógica principal de lanzamiento)
  - `FUTURAS_MEJORAS_TASK.md` (Hoja de ruta con checklists y tests)

---
*Este archivo es una "Cápsula del Tiempo" para que el asistente de IA retome el trabajo instantáneamente.*
