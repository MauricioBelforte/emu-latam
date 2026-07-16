# 03 - Diseño - Registro de Fallas y Soluciones (Plan Inicial)

## Estructura del documento

El archivo `04-Codigo.md` funciona como **bitácora incremental**. Los problemas se agregan al principio (más reciente primero).

```
04-Codigo.md
├── # Bitácora de Fallas y Soluciones
│
├── ## Problema más reciente (arriba)
│   ├── Síntoma
│   ├── Causa raíz
│   ├── Solución aplicada
│   ├── Código/Comandos
│   ├── Verificación
│   └── Logs relacionados
│
├── ## Problema anterior
│   └── ...
│
└── ## Problema más antiguo (abajo)
    └── ...
```

## Reglas de actualización

1. **Siempre agregar al principio** del archivo `04-Codigo.md` (y su copia en `plan-actual/`).
2. **No eliminar entradas anteriores** — el historial completo se conserva.
3. **Actualizar el índice** en `02-Analisis.md` con cada nueva entrada.
4. **Actualizar `05-Checklist.md`** marcando las soluciones aplicadas.

## Flujo de uso

```
Surge un problema → Se identifica causa → Se aplica solución
  → Se documenta en 04-Codigo.md (plan-actual)
  → Se copia a 04-Codigo.md (plan-inicial)
  → Se actualiza índice en 02-Analisis.md
  → Se actualiza 05-Checklist.md
  → Se genera log en Logs/ (opcional)
```
