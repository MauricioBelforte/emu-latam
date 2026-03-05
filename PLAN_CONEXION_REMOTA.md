# 🕹️ Plan de Conexión Remota — KOF '98 Netplay (PC a PC)

> **Objetivo:** Lograr que una segunda PC descargue el proyecto, lo ejecute sin complicaciones y pueda jugar KOF '98 online contra la primera PC.

---

## 📋 Checklist General

- [ ] **Fase 1:** Automatizar el arranque de Nakama con Docker — **Dificultad: BAJA** 🟢
- [ ] **Fase 2:** Preparar el paquete de RetroArch para distribución — **Dificultad: BAJA** 🟢
- [ ] **Fase 3:** Hacer que el Launcher apunte a una IP de servidor configurable — **Dificultad: BAJA** 🟢
- [ ] **Fase 4:** Configurar la red (Firewall + Port Forwarding) — **Dificultad: ALTA** 🔴
- [ ] **Fase 5:** Escribir la guía de instalación para la segunda PC — **Dificultad: BAJA** 🟢
- [ ] **Fase 6:** Prueba de conexión real entre dos PCs — **Dificultad: MEDIA/ALTA** 🟡🔴

---

## 🔧 Fase 1: Automatizar el arranque de Nakama con Docker

**Dificultad: BAJA** 🟢
_Es una fase sencilla que consiste en crear scripts de automatización (.bat) para facilitar el inicio del servidor y el cliente._

### Problema actual:

Hoy hay que levantar Nakama manualmente con `start_server.bat` (que usa un `nakama.exe` local) o con `docker-compose`. Esto es propenso a errores y el nuevo usuario no sabrá qué hacer.

### Solución:

Crear un script `start.bat` en la **raíz del proyecto** que levante TODO automáticamente (Nakama + Launcher) con un solo doble clic.

---

## 📦 Fase 2: Preparar el paquete de RetroArch para distribución

**Dificultad: BAJA** 🟢
_Solo requiere identificar los archivos correctos y comprimirlos. No implica tocar código complejo._

### Problema actual:

La carpeta `retroarch/` pesa ~640MB y está en `.gitignore` (correctamente). La segunda PC no la tendrá al clonar el repo.

### Solución:

Crear un ZIP comprimido con SOLO los archivos necesarios de RetroArch y subirlo a Google Drive / Mega / GitHub Releases.

---

## 🌐 Fase 3: IP del servidor Nakama configurable

**Dificultad: BAJA** 🟢
_Es un cambio pequeño en el código para permitir que el Launcher se conecte a una IP externa mediante variables de entorno._

### Problema actual:

El archivo `nakama.ts` tiene la IP del servidor Nakama hardcodeada como `127.0.0.1` (localhost). Si la segunda PC quiere conectarse al servidor Nakama que corre en tu PC, necesita tu IP.

### Solución:

Hacer que la IP del servidor se lea de una **variable de entorno** o de un **archivo de configuración** simple. Así cada jugador puede apuntar al servidor correcto sin tocar código.

---

## 🔥 Fase 4: Configurar la Red

**Dificultad: ALTA** 🔴
_Esta es la parte más difícil porque depende de factores externos: el modelo del router, los permisos de Windows y el proveedor de Internet (ISP). Requiere paciencia._

### Escenario A: Misma Red Local (LAN)

Si las dos PCs están en la misma red WiFi/Ethernet:

- [ ] 4.1 — Abrir puertos en el Firewall de Windows.
- [ ] 4.2 — Identificar IP local de la PC servidor.

### Escenario B: A través de Internet (WAN)

Si las PCs están en redes diferentes:

- [ ] 4.4 — **Port Forwarding**: Abrir puertos en el panel del Router (esta es la parte crítica).

---

## 📖 Fase 5: Guía de Instalación para la Segunda PC

**Dificultad: BAJA** 🟢
_Es puramente documentación para que el otro jugador sepa qué instalar y qué botones apretar._

### Tareas:

- [ ] 5.1 — Crear archivo `GUIA_INSTALACION.md` en la raíz con instrucciones paso a paso.

---

## 🧪 Fase 6: Prueba de Conexión Real

**Dificultad: MEDIA/ALTA** 🟡🔴
_Es el "momento de la verdad". Si las fases anteriores fallaron por un pequeño detalle de red, aquí es donde lo descubriremos y habrá que debuguear._

### Tareas:

- [ ] 6.1 — **PC 1 (Tu PC - Host del Servidor)** inicia sesión.
- [ ] 6.2 — **PC 2 (Segunda PC - Cliente)** se conecta.
- [ ] 6.3 — Verificación de lista de jugadores y sincronización del juego.

---

## 📊 Resumen de Archivos a Crear/Modificar

| #   | Archivo                    | Acción              | Fase | Dificultad |
| --- | -------------------------- | ------------------- | ---- | ---------- |
| 1   | `start.bat`                | CREAR               | 1    | Baja       |
| 2   | `client/src/lib/nakama.ts` | MODIFICAR (línea 5) | 3    | Baja       |
| 3   | `client/.env.example`      | CREAR               | 3    | Baja       |
| 4   | `GUIA_INSTALACION.md`      | CREAR               | 5    | Baja       |

---

## 🚨 Reglas de Seguridad (NO ROMPER NADA):

1. **NO modificar** `ChallengeContext.tsx`, `SocialContext.tsx` o `Sidebar.tsx`.
2. **NO modificar** `index.ts` (main) — El lanzador ya funciona.
3. **SOLO TOCAR** los archivos listados en la tabla de arriba.

---

_Plan analizado y actualizado por Antigravity — 5 de Marzo, 2026_
