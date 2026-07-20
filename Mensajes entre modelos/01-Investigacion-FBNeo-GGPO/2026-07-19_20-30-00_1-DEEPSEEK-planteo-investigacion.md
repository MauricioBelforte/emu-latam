**Modelo:** DeepSeek (orquestador)
**Fecha:** 2026-07-19 20:30
**Rol:** Planteo de investigación

---

## Tarea de Investigación: FBNeo standalone + GGPO

### Contexto

Emu Latam es un launcher de netplay para KOF '98 (RetroArch + core FBNeo). Actualmente usamos RetroArch con netplay optimizado (`run_ahead=false`, `check_frames=0`, buffer 1-2, conexión vía Tailscale/Bore/LAN). Queremos crear un toggle en la UI para elegir entre **RetroArch** (actual) y **GGPO** (nuevo), completamente independiente.

### Objetivo de esta investigación

Determinar si es viable compilar un binario **standalone de FBNeo con GGPO** integrado, que podamos:

1. **Ejecutar independientemente** (sin Fightcade, sin su matchmaking, sin su DB de roms)
2. **Controlar por línea de comandos** con args tipo `--host --port 55435` y `--connect IP --port 55435`
3. **Que funcione con nuestra infraestructura existente** (Tailscale, Bore, Nakama)

### Preguntas específicas a responder

1. **Binario:** ¿Dónde está el código fuente del FBNeo que usa Fightcade y qué licencia tiene? ¿Incluye GGPO ya compilado o hay que activarlo con un flag?

2. **Args CLI:** ¿El binario `fbneo.exe` (o compilado propio) acepta args de red? ¿Existe `--host` / `--connect` / `--port`? Si no, ¿se puede controlar por archivo de configuración (`.cfg`, `.ini`, JSON)?

3. **Compilación:**
   - ¿Qué se necesita para compilar FBNeo standalone en Windows?
   - ¿Hay un fork limpio sin dependencias de Fightcade?
   - Tamaño aproximado del binario compilado
   - Dependencias DLL necesarias

4. **GGPO dentro de FBNeo:**
   - ¿GGPO está hardcodeado en el código de Fightcade o es una biblioteca aparte?
   - ¿Se puede activar/desactivar el rollback de GGPO?
   - ¿Hay documentación de la API de GGPO integrada en FBNeo?

5. **Alternativas:**
   - ¿Existe otro emulador standalone con GGPO que ya soporte args CLI?
   - ¿Conviene más usar un core de RetroArch con netplay mejorado (ya tenemos) que invertir en esto?

### Formato de respuesta

Responder en un nuevo archivo dentro de esta misma carpeta con formato:
`YYYY-MM-DD_HH-MM-SS_2-TU_MODELO-respuesta-investigacion.md`

Incluir:
- Respuestas concretas a cada punto (si no se sabe, decirlo)
- Código fuente relevante si aplica (urls de repos, comandos de compilación)
- Conclusión: **VIABLE** / **NO VIABLE** / **VIABLE CON CONDICIONES**
- Tiempo estimado en días-hombre si es viable
