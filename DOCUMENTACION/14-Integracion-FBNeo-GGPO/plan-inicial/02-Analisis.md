# Análisis: Integración FBNeo + GGPO

## Análisis del dominio

### Fightcade-FBNeo (fork con GGPO)
- **Repo**: `github.com/fightcadeorg/fightcade-fbneo` — fork de `finalburnneo/FBNeo` con GGPO integrado
- **Licencia**: No-comercial (hereda de FBNeo). GGPO SDK es MIT License.
- **GGPO integrado**: Sí, el fork incluye el protocolo `quark` que envuelve la API de GGPO SDK
- **Modo directo P2P**: `quark:direct` permite conexión sin servidores de Fightcade

### Protocolo quark:direct
```
fcadefbneo quark:direct,<romname>,<local_port>,<remote_ip>,<remote_port>,<player_number>,<spectator> -w
```

| Parámetro | Descripción |
|-----------|-------------|
| romname | Nombre exacto de la ROM (ej: `kof98`, sin `.zip`) |
| local_port | Puerto UDP local de esta instancia |
| remote_ip | IP del otro jugador |
| remote_port | Puerto UDP del otro jugador |
| player_number | `0` = P1 (host), `1` = P2 (guest) |
| spectator | `0` = jugador, `1` = espectador |
| -w | Modo ventana |

**Modelo simétrico**: A diferencia del modelo host/connect de RetroArch, acá ambos peers son simétricos. Cada uno necesita conocer la IP y puerto del otro. Ambos se conectan mutuamente.

### Alternativas evaluadas

| Alternativa | Veredicto | Motivo |
|-------------|-----------|--------|
| Seguir con RetroArch solo | ❌ Descartado | El usuario quiere la opción GGPO aunque sea futuro |
| RedGGPO | ❌ Descartado | GUI cerrada, no tiene CLI, no se puede controlar |
| FBNeo standalone oficial | ❌ Descartado | Solo netplay Kaillera (delay-based, obsoleto) |
| Compilar GGPO SDK + emulador propio | ❌ Descartado | Esfuerzo desproporcionado |
| **fightcade-fbneo (quark:direct)** | ✅ **Elegido** | GGPO nativo, CLI args, fork existente, ~20-30 MB |

### Requisitos de compilación

| Requisito | Detalle |
|-----------|---------|
| IDE | Visual Studio 2015+ (Community) |
| DirectX SDK | June 2010 |
| Perl | ActivePerl o Strawberry Perl (en PATH) |
| NASM | Netwide Assembler (en PATH) |
| Solución VS | `projectfiles/visualstudio-2015/fbneo_vs2015.sln` |
| Config | Release, x86 |
| Script previo | Ejecutar `games.bat` para generar lista de juegos |

### Dependencias de red (diferencia clave con RetroArch)

| Aspecto | RetroArch (actual) | fcadefbneo (GGPO) |
|---------|-------------------|-------------------|
| Protocolo | TCP | UDP |
| Modelo | Asimétrico (host/connect) | Simétrico (peer-to-peer) |
| Puerto | 1 puerto (55435) | 2 puertos (local + remote) |
| Proxy | Sí (forwarder TCP) | No aplica (UDP) |
| Bore | ✅ Compatible | ❌ Incompatible (UDP) |
| Tailscale | ✅ Compatible | ✅ Compatible (UDP nativo) |
| LAN | ✅ Compatible | ✅ Compatible |

### Decisión de implementación

Se procede con la integración de `fcadefbneo` vía `quark:direct` como feature opcional. La implementación será un flujo completamente separado (nuevo IPC handler, nueva lógica de UI, nueva gestión de procesos) que no toque los flujos RetroArch existentes. El toggle estará disponible solo cuando el método de conexión sea LAN o Tailscale (deshabilitado en modo Bore).
