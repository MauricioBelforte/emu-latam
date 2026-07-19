# 02 - Análisis - Editor de Configuración Netplay

## Dominio del problema
RetroArch guarda su configuración en archivos .cfg con formato:
```
# comentario
clave = "valor"
```

Emu Latam usa `--appendconfig netplay_optimized.cfg` al lanzar RetroArch.
Este archivo contiene ~20 líneas entre comentarios y settings. Solo 4 son
editables por el usuario:

1. `netplay_check_frames` — frecuencia de verificación de sync (0-600)
2. `netplay_input_latency_frames_min` — buffer mínimo (0-3)
3. `netplay_input_latency_frames_range` — rango dinámico del buffer (0-3)
4. `run_ahead_enabled` — predicción de frames (true/false)

## Alternativas consideradas

| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| Modal con sliders | Integrado en la UI, sin cambiar de ventana | Ocupa espacio en el modal | ✅ Elegida |
| Página separada | Más espacio para configs | Rompe flujo de navegación actual | ❌ |
| Editor externo (bloc de notas) | Sin código nuevo | Mala UX, el usuario debe buscar el archivo | ❌ |
| Config en localStorage + override al lanzar | No toca el .cfg | No persiste si se borra la cache, no refleja cambios manuales | ❌ |

## Decisión técnica
Modal con sliders + escritura directa al .cfg. Esto permite:
- Persistencia real (el cambio sobrevive a reinicios de la app)
- Compatibilidad con lanzamiento manual de RetroArch (los cambios quedan en el archivo)
- Transparencia: el usuario puede ver el archivo modificado si quiere

## Formato de escritura
Se usa regex para buscar y reemplazar la línea exacta:
```
/^(clave\s*=\s*)"([^"]*)"/m
```
Esto preserva comentarios y el orden de las líneas.
