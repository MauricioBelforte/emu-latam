# 🧠 ANTIGRAVITY PROJECT CONTEXT: EMU LATAM

**¡ATENCIÓN ANTIGRAVITY!** Lee este archivo para recuperar el contexto completo del proyecto si el historial de chat no está disponible.

---

## 📌 ESTADO ACTUAL DEL PROYECTO
- **Rama Git:** `feature/relay-cloud`
- **Objetivo:** Crear un launcher tipo Fightcade para KOF '98 sincronizando RetroArch vía TCP.
- **Servicios:** Nakama (Matchmaking/Auth) + Bore (Túnel TCP para evitar apertura de puertos).
- **⚠️ NOTA SOBRE DOCKER:** **NO estamos usando Docker.** Usamos los binarios nativos (`nakama.exe`) y un servicio de Postgres instalado directamente en Windows para mantener el proyecto liviano y evitar configuraciones complejas de contenedores.

## ✅ FASE 1 COMPLETADA (Local Automation)
1. **Auto-Lanzamiento de Nakama:** 
   - La App lanza `backend/nakama.exe` de forma invisible.
   - Posee **Health Check** para evitar duplicados y **Auto-Kill** al cerrar.
2. **Bore Automático (Fase 1.2):**
   - El Host ya no usa archivos `.bat` externos.
   - Al presionar "HOST GAME", la App lanza `bore.exe` internamente.
   - **Captura el Stdout:** Usa un `Regex` para extraer la URL `bore.pub:XXXX` y la carga automáticamente en el campo de Relay.
   - **User Feedback:** Agregado estado de "CREANDO TÚNEL..." en el botón.

## 🚀 PRÓXIMA TAREA: FASE 1.3 & 2 (Estabilidad & VPS)
1. **UX Improvements:** 
   - Hacer que "JOIN" use la IP del campo de texto automáticamente (sin presionar Guardar).
   - Agregar "Loading Spinner" en el inicio para esperar a que Nakama despierte.
   - Optimizar RetroArch (Run-Ahead) para mitigar los 500ms de ping. **📄 Investigación completa en `RUNAHEAD_PLAN.md`**.
2. **Centralización (FASE 2):** Migrar Nakama y Bore al VPS para bajar el ping a <60ms.

## ⚠️ NOTA DE HARDWARE (PC 2)
- **POSTGRES PORT:** En la computadora secundaria de Mauricio, Postgres usa el puerto **5433** (no el estándar 5432). Ajustar `local.yml` antes de testear allá.

## 🛠️ DATOS TÉCNICOS IMPORTANTES
- **Puerto Nakama:** 7350 (API) / 7351 (Console)
- **Puerto RetroArch:** 55435 (TCP)
- **Modo RetroArch:** Se usa `--host --port 55435` y el cliente `--connect HOST --port PORT` por separado (ya que pegados fallaba).
- **Rutas clave:** 
  - `client/src/main/index.ts` (Lógica principal de lanzamiento)
  - `FUTURAS_MEJORAS_TASK.md` (Hoja de ruta con checklists y tests)

---
*Este archivo es una "Cápsula del Tiempo" para que el asistente de IA retome el trabajo instantáneamente.*
