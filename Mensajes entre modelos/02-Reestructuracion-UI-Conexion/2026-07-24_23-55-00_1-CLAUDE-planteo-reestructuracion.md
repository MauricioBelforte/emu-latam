# Planteo de Tarea: Reestructuración UI de Conexión y Unificación de Salas

**Modelo:** Claude / Gemini
**Fecha:** 2026-07-24 23:55:00
**Tema:** Reestructuración de la Interfaz Principal y Flujo de Conexiones (Módulo 21)

---

## 🎯 Objetivo de la Tarea

Reestructurar la pantalla principal (`App.tsx`), el modal de selección de método de reto (`MethodPicker.tsx`), y la lógica de retos (`ChallengeContext.tsx`) para unificar la experiencia del usuario y eliminar la confusión de los 6 botones actuales.

---

## 📐 Especificación del Nuevo Flujo

### 1. Pantalla Principal (Pre-Autenticación) — 4 Botones en 2 Secciones

Al abrir la aplicación, en el primer panel principal (antes de conectarse), **solo debe haber 4 botones organizados en 2 secciones**:

#### Sección 1: ▸ SALA TAILSCALE ◂ (Color Cyan `#00f3ff`)
- **[CREAR SALA]**: Inicia Nakama local en `127.0.0.1:7350`, obtiene IP de Tailscale y autentica al usuario.
- **[UNIRSE A SALA]**: Solicita la IP de Tailscale de la PC host para conectar a su servidor Nakama.

#### Sección 2: ▸ SALA P2P ◂ (Color Verde `#0f0`)
- **[CREAR SALA]**:
  1. Inicia Nakama local en `127.0.0.1:7350`.
  2. Ejecuta `bootstrap-host` (levanta túnel bore + genera código numérico en dpaste.org).
  3. Ejecuta simultáneamente `p2p-start-broadcast` para emitir en la red LAN.
  4. Muestra el CÓDIGO NUMÉRICO prominente en pantalla para compartir.
- **[UNIRSE A SALA]**:
  1. Primero intenta **auto-descubrimiento en LAN** (`p2p-discover-host`, espera 4 segundos).
  2. Si detecta una sala en la misma red LAN local, se conecta automáticamente sin pedir código.
  3. Si NO encuentra sala en LAN, solicita ingresar el **código numérico** de 5-6 dígitos.
  4. Resuelve la URL remota mediante `bootstrap-guest` y conecta al Nakama remoto.

---

### 2. Controles Post-Autenticación

Una vez dentro de la sala (Autenticado):
1. **Header / Info de Sala**: Muestra el código o la IP y los usuarios conectados.
2. **Toggle RETROARCH ↔ GGPO**: El interruptor que define qué motor de peleas se va a utilizar.
3. **Eliminar la sección colapsable "OTROS MÉTODOS DE CONEXIÓN"**: Ya no debe mostrarse el menú gigante desplegable con opciones redundantes.
4. **Botón [DEBUG]**: Colocar un botón pequeño y discreto al fondo para abrir las pruebas locales de debug si fuera necesario.

---

### 3. Sistema de Retos y MethodPicker Dinámico

Cuando un jugador presiona **RETAR** sobre un oponente en el panel lateral (Sidebar):
1. El modal `MethodPicker` debe responder dinámicamente según:
   - **`salaType`**: Si la sala actual es `tailscale` o `p2p`.
   - **`engine`**: Si el toggle está en `retroarch` o `ggpo`.

#### Opciones Mostradas en MethodPicker:

| Tipo de Sala | Toggle Engine | Opciones Disponibles |
|--------------|---------------|----------------------|
| **Tailscale** | RetroArch | 1. Tailscale (Directo)<br/>2. LAN (Auto-detectado) |
| **Tailscale** | GGPO | 1. Tailscale (Directo) *(GGPO solo usa IP directa)* |
| **P2P** | RetroArch | 1. P2P Automático (Hole punch / Relay)<br/>2. LAN (Auto-detectado)<br/>3. Bore (Túnel) |
| **P2P** | GGPO | 1. P2P Automático (WAN Relay UDP)<br/>2. LAN (Auto-detectado) *(Bore no se muestra por incompatibilidad UDP/TCP)* |

---

## 🛠️ Archivos a Modificar

1. **`client/src/App.tsx`**:
   - Reemplazar estados `isP2pSala`, `isBootstrapSala`, `showOtherMethods` por un nuevo estado `salaType: "tailscale" | "p2p" | null`.
   - Reestructurar el JSX de la tarjeta principal `GameCard`.
   - Unificar los handlers de creación y unión a salas.

2. **`client/src/components/ui/MethodPicker.tsx`**:
   - Recibir props `salaType` y `engine`.
   - Renderizar únicamente los métodos filtrados según la matriz anterior.

3. **`client/src/components/ui/ChallengeModal.tsx`**:
   - Pasar `salaType` y `engine` al `MethodPicker`.

4. **`client/src/context/ChallengeContext.tsx`**:
   - Incorporar `salaType` en `ChallengeData`.
   - Sincronizar el flujo de conexión según `salaType`.

---

## 📋 Instrucciones para el Próximo Modelo

1. Consultar la documentación recién creada en `DOCUMENTACION/21-Reestructuracion-UI-Conexion/plan-inicial/`.
2. Seguir el checklist definido en `05-Checklist.md`.
3. Ejecutar `npm run dev` en `client/` para verificar la compilación continua.
4. Ejecutar el plan de testings definido en `06-Plan-Testings.md` y volcar los resultados en `07-Resultados-Testings.md` dentro de `plan-actual/`.
5. Registrar el avance en `Logs/` y actualizar `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md`.
