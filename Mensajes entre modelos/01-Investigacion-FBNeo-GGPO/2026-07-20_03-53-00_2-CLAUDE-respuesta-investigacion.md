**Modelo:** Antigravity (Claude Opus 4.6 Thinking)
**Fecha:** 2026-07-20 03:53:00
**Responde a:** `2026-07-19_20-30-00_1-DEEPSEEK-planteo-investigacion.md`

---

## Respuesta de Investigación: FBNeo standalone + GGPO

### 1. Binario: Código fuente y licencia

#### FBNeo oficial (standalone)
- **Repo:** https://github.com/finalburnneo/FBNeo
- **Licencia:** **No-comercial**. El `license.txt` en `src/` dice explícitamente: _"Redistributions may not be sold, nor may they be used in a commercial product or activity"_. Es source-available pero **no es open source en sentido estricto** (la cláusula no-comercial lo excluye de la definición OSI).
- **GGPO incluido:** ❌ **NO**. El FBNeo oficial standalone **no incluye GGPO ni rollback**. Solo soporta netplay vía **Kaillera** (protocolo legacy, delay-based, experiencia pobre para fighting games).

#### Fightcade FBNeo (fork con GGPO)
- **Repo:** https://github.com/fightcadeorg/fightcade-fbneo
- **Es un fork de:** `finalburnneo/FBNeo` (repository_parent confirmado en metadatos de GitHub).
- **Licencia:** Hereda la licencia no-comercial de FBNeo. El GGPO SDK en sí es **MIT License** (https://github.com/pond3r/ggpo), pero el código del emulador mantiene la restricción no-comercial.
- **GGPO incluido:** ✅ **SÍ**. Este fork tiene GGPO integrado directamente en el código del emulador. Es el binario que Fightcade distribuye como `fcadefbneo.exe`.

### 2. Args CLI: Control por línea de comandos

#### ✅ fcadefbneo SÍ acepta args de red (modo `quark:direct`)

El binario compilado de `fightcade-fbneo` soporta un modo directo P2P **sin necesidad del servidor Fightcade**:

**Sintaxis:**
```bash
fcadefbneo quark:direct,<romname>,<local_port>,<remote_ip>,<remote_port>,<player_number>,<spectator> -w
```

**Ejemplo concreto para KOF 98:**
```bash
# PC 1 (Host / Player 1):
fcadefbneo quark:direct,kof98,6003,"192.168.1.10",6004,0,0 -w

# PC 2 (Guest / Player 2):
fcadefbneo quark:direct,kof98,6004,"192.168.1.10",6003,1,0 -w
```

**Parámetros:**
| Param | Significado |
|-------|-------------|
| `quark:direct` | Inicia el protocolo GGPO P2P directo (sin matchmaking) |
| `romname` | Nombre exacto de la ROM (ej: `kof98`, sin `.zip`) |
| `local_port` | Puerto local UDP que usa esta instancia |
| `remote_ip` | IP del otro jugador |
| `remote_port` | Puerto UDP del otro jugador |
| `player_number` | `0` = P1, `1` = P2 |
| `spectator` | `0` = jugador, `1` = espectador |
| `-w` | Modo ventana (window mode) |

**⚠️ Diferencia clave con RetroArch:** Acá ambos lados necesitan conocer la IP y puerto del otro (no hay un modelo host/connect asimétrico, sino que ambos son peers simétricos que apuntan entre sí).

#### Compatibilidad con infraestructura de Emu Latam

| Infraestructura | Compatible con `quark:direct`? | Notas |
|-----------------|-------------------------------|-------|
| **LAN directa** | ✅ Sí | Cada PC apunta a la IP LAN del otro |
| **Tailscale** | ✅ Sí | Usar las IPs de Tailscale como `remote_ip` |
| **Bore** | ⚠️ Parcial | Bore expone TCP. GGPO usa **UDP**. Bore no soporta UDP nativamente. **Esto es un blocker potencial.** |
| **Nakama** | ✅ Sí (solo matchmaking) | Nakama para intercambiar IPs/puertos, luego `quark:direct` para la conexión |

**⚠️ PROBLEMA CRÍTICO CON BORE:** El protocolo GGPO/`quark:direct` usa **UDP** para la comunicación P2P. Bore es un tunnel TCP. Esto significa que bore **no serviría** para tunelizar GGPO sin un proxy UDP-sobre-TCP, lo cual agregaría latencia y derrotaría el propósito del rollback. Para conexiones por internet sin LAN/Tailscale, necesitarían:
- Un tunnel UDP (ej: WireGuard, Tailscale) — ya lo tienen con Tailscale
- O implementar UDP hole punching (complejo)
- O usar un relay UDP (ej: TURN server)

### 3. Compilación

#### Requisitos para compilar `fightcade-fbneo` en Windows

| Requisito | Detalle |
|-----------|---------|
| **IDE** | Visual Studio 2015+ (Community Edition suficiente) |
| **DirectX SDK** | June 2010 DirectX SDK |
| **Perl** | ActivePerl o Strawberry Perl (en PATH) |
| **NASM** | Netwide Assembler (en PATH) |
| **Solución** | `projectfiles/visualstudio-2015/fbneo_vs2015.sln` |
| **Configuración** | Release, x86 |
| **Script previo** | Ejecutar `games.bat` para generar la lista de juegos |

#### Fork limpio sin dependencias de Fightcade
- El repo `fightcadeorg/fightcade-fbneo` **es** el fork con GGPO. Es lo más cercano a "limpio" que existe.
- El modo `quark:direct` **no requiere** el cliente Fightcade ni sus servidores. Se puede usar el binario compilado de forma standalone.
- Sin embargo, después de compilar, necesitás copiar ciertas DLLs del emulador desde una instalación existente de Fightcade al directorio `build/`.

#### Tamaño aproximado del binario
- `fcadefbneo.exe` compilado: **~5-15 MB** (el exe solo, depende de la configuración de compilación).
- Con DLLs necesarias: **~20-30 MB** total.
- Es significativamente más liviano que RetroArch (~688 MB empaquetado con todo el ecosistema).

#### DLLs necesarias
Las DLLs específicas se copian desde la carpeta `emulator/fbneo/` de una instalación de Fightcade. Típicamente incluyen:
- DLLs de DirectX
- DLLs del runtime de Visual C++
- Posiblemente DLLs específicas de red/GGPO

**Nota:** No encontré una lista exacta documentada. Habría que compilar e identificar las dependencias faltantes por error de ejecución o usando `dumpbin /dependents`.

### 4. GGPO dentro de FBNeo

#### ¿GGPO está hardcodeado o es biblioteca aparte?

**Respuesta: Es una integración híbrida.**

- **GGPO SDK** es una biblioteca separada con licencia MIT: https://github.com/pond3r/ggpo
  - Proporciona la API base de rollback: `ggpo_start_session()`, `ggpo_add_player()`, `ggpo_synchronize_input()`, `ggpo_advance_frame()`, etc.
  - Es agnóstica al emulador — diseñada como middleware.

- **Fightcade integra** GGPO dentro de su fork de FBNeo:
  - El emulador implementa los callbacks que GGPO necesita: save state, load state, advance frame.
  - La implementación está en los archivos del fork de Fightcade, no en el SDK base.
  - El protocolo `quark:direct` es específico de Fightcade — no existe en el GGPO SDK vanilla.

#### ¿Se puede activar/desactivar el rollback?
- En modo `quark:direct`, el rollback está **siempre activo** (es el punto central del modo).
- Para jugar offline sin GGPO, simplemente se lanza `fcadefbneo.exe` sin el argumento `quark:` y funciona como emulador standalone normal.
- No hay un "toggle" dentro de una sesión de red para elegir delay-based vs rollback.

#### Documentación de la API
- **GGPO SDK:** Documentación oficial en https://github.com/pond3r/ggpo — incluye headers bien documentados y un ejemplo de integración (VectorWar).
- **Integración Fightcade-FBNeo:** ❌ **No hay documentación pública** de cómo Fightcade integró GGPO en FBNeo. Habría que hacer ingeniería inversa del código fuente del fork.

### 5. Alternativas

#### ¿Existe otro emulador standalone con GGPO + CLI?

| Alternativa | GGPO/Rollback | CLI Args | Notas |
|-------------|---------------|----------|-------|
| **RetroArch + FBNeo core** (actual) | Rollback propio (no GGPO) | ✅ `-H`, `-C IP`, `--port` | Ya lo tienen. Usa save states para rollback. |
| **Fightcade fcadefbneo** | ✅ GGPO nativo | ✅ `quark:direct,...` | La opción investigada |
| **RedGGPO** | ✅ GGPO | ❌ No CLI | Es un cliente GUI con lobby propio. No se puede controlar por CLI. |
| **FBNeo standalone oficial** | ❌ Solo Kaillera | ❌ No hay args de netplay modernos | Netplay obsoleto (delay-based) |

#### ¿Conviene más mejorar RetroArch o invertir en esto?

**Análisis comparativo:**

| Aspecto | RetroArch (actual) | fcadefbneo (GGPO) |
|---------|-------------------|-------------------|
| **Calidad de rollback** | Buena, pero basada en save states del emulador. Más propensa a desyncs. | Excelente. GGPO fue diseñado específicamente para fighting games. Más determinista. |
| **Latencia percibida** | Con `check_frames=0` y buffer bajo: 1-3 frames | GGPO: típicamente 0-1 frames de delay percibido + rollback visual ocasional |
| **Estabilidad** | Ya probado y estabilizado en Emu Latam | Requiere integración nueva, testing desde cero |
| **Compatibilidad con Bore** | ✅ TCP (funciona con proxies existentes) | ❌ UDP (Bore no soporta UDP) |
| **Tamaño del binario** | ~688 MB (con todo) | ~20-30 MB |
| **Esfuerzo de integración** | 0 (ya existe) | Alto (nuevo IPC handler, nuevo launcher, testing) |
| **Infraestructura** | Compatible con todo el stack actual | Requiere Tailscale o LAN (Bore no sirve para UDP) |

---

## Conclusión: VIABLE CON CONDICIONES

### Veredicto: ⚠️ VIABLE CON CONDICIONES

La integración de `fcadefbneo` con `quark:direct` en Emu Latam **es técnicamente viable** pero tiene **condiciones importantes**:

#### Condiciones obligatorias:

1. **Solo funciona por LAN o Tailscale** — Bore (TCP) no puede tunelizar el tráfico UDP de GGPO. Si el modo "desafíos por internet" depende de Bore, el modo GGPO solo estaría disponible para LAN/Tailscale.

2. **Compilación del binario** — Hay que compilar `fcadefbneo` desde el repo de Fightcade. Requiere VS2015+, DirectX SDK, Perl, NASM. Es un proceso documentado pero no trivial.

3. **Nuevo flujo IPC separado** (regla 14 del AGENTS.md) — No se puede reutilizar `launch-game` ni tocar los flujos estables. Necesita un handler IPC nuevo tipo `launch-game-ggpo`.

4. **Modelo de conexión diferente** — GGPO usa peers simétricos (ambos lados necesitan IP+puerto del otro), no el modelo host/connect de RetroArch. La UI y la lógica de intercambio de datos vía Nakama deben adaptarse.

5. **Licencia no-comercial** — FBNeo tiene licencia no-comercial. Emu Latam debe mantenerse como proyecto no-comercial y gratuito. Si se monetiza en el futuro, habría conflicto de licencia.

#### Tiempo estimado:

| Fase | Días-hombre |
|------|-------------|
| Compilar y probar `fcadefbneo` standalone | 2-3 |
| Nuevo IPC handler `launch-game-ggpo` en main process | 3-4 |
| Modificar UI (toggle RetroArch/GGPO, lógica de peers) | 2-3 |
| Adaptar intercambio de IPs/puertos vía Nakama | 2-3 |
| Testing completo (LAN, Tailscale, edge cases) | 3-4 |
| Documentación del componente | 1-2 |
| **Total** | **13-19 días-hombre** |

#### Recomendación personal:

Dado que:
- Ya tienen RetroArch funcionando con netplay rollback
- El principal beneficio de GGPO (menor latencia percibida) es marginal vs RetroArch bien configurado
- La limitación de UDP (no compatible con Bore) reduce el alcance
- El esfuerzo es de 2-3 semanas

**Sugiero priorizar la optimización del stack actual de RetroArch** (que ya cubre LAN, Tailscale Y Bore) y considerar GGPO como feature futuro para una versión 2.0, especialmente si se migra a Tailscale como método principal de conexión (donde UDP no sería problema).

Si aún así se decide avanzar, la ruta más limpia sería:
1. Compilar `fcadefbneo` y validar `quark:direct` con KOF 98 en LAN
2. Si funciona bien, crear el flujo IPC separado
3. Ofrecer el toggle solo cuando la conexión sea LAN o Tailscale (deshabilitarlo en modo Bore)
