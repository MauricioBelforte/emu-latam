# GUÍA COMPLETA: Cómo jugar KOF '98 online con Emu Latam

**Versión:** 2.0 — Mejoras: copia IP con 1 click, firewall automático, health check, auto-refresh IP
**Autores:** PC1 (desktop-j3ahaoe) + PC2 (desktop-b9jd1t0)
**Conexión:** Argentina - Argentina (redes distintas)

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación](#2-instalación)
3. [Configurar Tailscale](#3-configurar-tailscale)
4. [Flujo que funciona: Tailscale Manual (HOST + JOIN)](#4-flujo-que-funciona-tailscale-manual-host--join)
5. [Verificación de conectividad](#5-verificación-de-conectividad)
6. [Solución de problemas comunes](#6-solución-de-problemas-comunes)
7. [Flujos que NO funcionan o no fueron probados](#7-flujos-que-no-funcionan-o-no-fueron-probados)
8. [Empaquetado del EXE](#8-empaquetado-del-exe)
9. [Configuración de RetroArch](#9-configuración-de-retroarch)
10. [Referencia rápida de comandos](#10-referencia-rápida-de-comandos)

---

## 1. Requisitos

### Para AMBAS PCs
- Windows 10/11 (64 bits)
- Tailscale instalado y logueado con la **misma cuenta** (obligatorio)
- La carpeta `Emu Latam-win32-x64/` (el build empaquetado) o el repositorio clonado

### Solo para PC1 (la que HOSTEA el juego)
- PostgreSQL instalado y funcionando (Nakama lo necesita)
- La ROM de KOF '98 (`kof98.zip`) en `retroarch/roms/`
- El core FBNeo (`fbneo_libretro.dll`) en `retroarch/cores/`

### Solo para PC2 (la que se UNE)
- No necesita PostgreSQL
- No necesita Nakama
- Solo necesita la misma ROM y core que PC1 (idénticos)

---

## 2. Instalación

### Opción A: Usar el EXE empaquetado (recomendado)
1. Copiar toda la carpeta `Emu Latam-win32-x64/` desde PC1 a PC2 (USB, Google Drive, etc.)
2. En ambas PCs ejecutar `Emu Latam.exe` dentro de esa carpeta
3. **No necesita Node.js, npm ni nada**

### Opción B: Usar el código fuente (dev)
```powershell
git pull
cd client
npm install
npm run dev
```

### Dónde conseguir los archivos
- **Emu Latam:** `client/dist/Emu Latam-win32-x64/` (se genera con `npm run package`)
- **Tailscale:** https://tailscale.com/download
- **PostgreSQL:** https://www.postgresql.org/download/windows/
- **RetroArch + ROM + core:** Van incluidos en la carpeta `retroarch/`

---

## 3. Configurar Tailscale

### En AMBAS PCs

**1. Instalar Tailscale**
Descargar de https://tailscale.com/download e instalar.

**2. Loguearse con la MISMA cuenta**
```
Email: maurycade@...   ← AMBAS con el mismo email
```

**3. Verificar conexión**
```powershell
# En PC1:
"C:\Program Files\Tailscale\tailscale.exe" status
# Debería ver ambas máquinas:
# 100.98.148.11  desktop-j3ahaoe  maurycade@  windows  active
# 100.91.174.4   desktop-b9jd1t0  maurycade@  windows  active

# En PC2:
"C:\Program Files\Tailscale\tailscale.exe" status
# Debería ver ambas máquinas también
```

**4. IMPORTANTE: Permitir conexiones entrantes**
En Tailscale → Settings (engranaje) → **Allow incoming connections** → ACTIVADO.
O por consola:
```powershell
# Verificar estado actual:
& "C:\Program Files\Tailscale\tailscale.exe" up --json | Select-String "shieldsUp"

# Si shieldsUp=true, desactivar:
& "C:\Program Files\Tailscale\tailscale.exe" up --shields-up=false
```

---

## 4. Flujo que funciona: Tailscale Manual (HOST + JOIN)

**Este es el ÚNICO flujo probado y verificado cross-PC.**

### Paso 1: PC1 — Crear sala + Hostear juego

**1a. Abrir Emu Latam**
Ejecutar `Emu Latam.exe`.

**1b. CREAR SALA**
- Click en **CREAR SALA** (botón verde grande)
- Esperar que aparezca el banner "SALA CREADA" con la IP de Tailscale:
  ```
  SALA CREADA
  100.98.148.11:7350
  ```
  ✅ **Click en la IP para copiarla al portapapeles automáticamente.**
  ✅ **Firewall**: Emu Latam intenta abrir el puerto 7350 automáticamente (si ejecutás como admin).
  ✅ **IP se actualiza sola** cada 30 segundos si cambiara.

**1c. HOST TAILSCALE**
- En la sección Tailscale de la UI, click **HOST TAILSCALE**
- RetroArch se abre automáticamente en modo host
- La pantalla de RetroArch muestra "Waiting for player" o similar

### Paso 2: PC2 — Unirse a la sala + Conectar

**2a. Abrir Emu Latam**
Ejecutar `Emu Latam.exe`.

**2b. UNIRSE A SALA**
- Click en **UNIRSE A SALA**
- PC2 pega la IP que PC1 copió al portapapeles (ej: `100.98.148.11:7350`)
- Puerto: `7350` (ya viene por defecto)
- Click **CONECTAR**
- La app verifica automáticamente si el servidor Nakama es accesible (health check cada 15s)
- Esperar que aparezca "CONECTADO A SALA" y vea a PC1 en el sidebar

**2c. JOIN TAILSCALE**
- En el campo de texto de Tailscale, pegar la IP de PC1 (`100.98.148.11`)
- Click **JOIN TAILSCALE**
- RetroArch se abre automáticamente en modo guest
- La pantalla de RetroArch se conecta al host

### Paso 3: Jugar
- Ambos ven KOF '98
- Seleccionar personajes y pelear
- Si se siente lageado, ver [Configuración de RetroArch](#9-configuración-de-retroarch)

---

## 5. Verificación de conectividad

Antes de intentar jugar, verificar que ambas PCs se vean por Tailscale:

### Health Check Automático (NUEVO)
- **Emu Latam** verifica cada 15 segundos si tu servidor Nakama es accesible.
- Si no lo es, muestra una advertencia ⚠ naranja en la UI.
- No bloquea el juego, solo informa.

### Prueba 1: Status de Tailscale
```powershell
# En ambas PCs:
"C:\Program Files\Tailscale\tailscale.exe" status
# Deben verse mutuamente con estado "active"
```

### Prueba 2: HTTP a Nakama
```powershell
# Desde PC2, probar que llega al Nakama de PC1:
curl.exe http://100.98.148.11:7350 --connect-timeout 10
# Debe responder: algún texto HTML o "OK"
# Si da timeout → hay problema de conectividad.
```

### Prueba 3: Firewall
```powershell
# En PC1 (como admin), si PC2 no puede conectar:
netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=7350 remoteip=100.0.0.0/8
```

---

## 6. Solución de problemas comunes

### 6.1 "No se pudo conectar al servidor. Verifica la IP"
- **Causa:** PC2 no puede alcanzar el Nakama de PC1.
- **Soluciones:**
  1. Verificar que PC1 tenga la sala creada (Nakama corriendo).
  2. Verificar la IP de Tailscale de PC1 (`tailscale status`).
  3. ⚠️ Emu Latam intenta abrir el firewall automáticamente al crear sala. Si falló (por no ser admin), crear la regla manualmente (ver sección 5).
  4. Desactivar firewall temporalmente en PC1 para probar.

### 6.2 Tailscale ping timeout
- **Síntoma:** `tailscale ping` da timeout entre las PCs.
- **Causa:** Las PCs no tienen una conexión activa.
- **Solución:** Reiniciar Tailscale en ambas PCs:
  ```powershell
  net stop Tailscale
  net start Tailscale
  ```
  Luego verificar con `tailscale status`.

### 6.3 La IP de Tailscale cambió
- **Síntoma:** PC2 no conecta a una IP que antes funcionaba.
- **Causa:** Tailscale reasignó IPs (por reconexión, logout, etc.).
- **Solución:** La IP se auto-actualiza cada 30s en la UI. Si el cambio es reciente, esperar unos segundos. También verificar manualmente con `tailscale status` y pasar la nueva IP.

### 6.4 "Nakama OFFLINE" / "WebSocket disconnected"
- **En PC1:** Nakama no pudo iniciar (falta PostgreSQL).
  - **Solución:** Instalar PostgreSQL o verificar que el servicio esté corriendo.
- **En PC2:** No está conectado al Nakama de PC1.
  - **Solución:** Usar UNIRSE A SALA con la IP de PC1.

### 6.5 RetroArch se abre pero no conecta
- **Solución:** Cerrar RetroArch en ambas, verificar que el puerto 55435 no esté ocupado, y reintentar HOST + JOIN.

### 6.6 Desincronización durante la partida
- **Solución:** Ver [Configuración de RetroArch](#9-configuración-de-retroarch).
- Asegurar que ambas PCs tengan exactamente el mismo `kof98.zip` y `fbneo_libretro.dll`.

---

## 7. Flujos que NO funcionan o no fueron probados

### ❌ Sistema de Retos (Challenge)
- Enviar reto desde el Sidebar → elegir método → aceptar.
- **Estado:** NO FUNCIONÓ en esta sesión. Se corrigió un bug (isLaunchingRef) pero no se pudo probar la corrección.
- **Causa probable:** Bug en ChallengeContext.tsx que bloqueaba el handler `_conn`.
- **Alternativa:** Usar el flujo manual (sección 4).

### ❌ Modo LAN Directo (sin Tailscale)
- **Estado:** No probado en redes distintas. Solo funciona si ambas PCs están en la misma red local.

### ❌ Modo Bore
- **Estado:** No probado cross-PC con el build empaquetado.

### ⚠️ Ambos usuarios CREARON SALA
- **Nota:** En esta sesión, PC1 creó sala y PC2 también creó sala (en vez de unirse). Luego PC2 se unió a la sala de PC1. Esto funcionó pero no se probó el flujo donde solo PC1 crea sala y PC2 se une directamente.

---

## 8. Empaquetado del EXE

Para generar el `.exe` distribuible (sin Node.js):

```bash
cd client
npm run package
```

**Qué hace:**
1. `electron-vite build` — compila main + preload + renderer a `out/`
2. `@electron/packager` — empaqueta Electron + app en `dist/Emu Latam-win32-x64/`
3. Copia `backend/`, `retroarch/`, `relay-server/` a `resources/extraResources/`

**Output:** `client/dist/Emu Latam-win32-x64/Emu Latam.exe` (~688 MB)

**Notas:**
- `electron-builder` NO funciona en este equipo (falla winCodeSign por symlinks). Usar `@electron/packager`.
- F12/DevTools deshabilitado en producción.
- Para distribuir, comprimir toda la carpeta `Emu Latam-win32-x64/` en ZIP.

---

## 9. Configuración de RetroArch

### netplay_optimized.cfg (usada por Emu Latam)

```ini
# Run-Ahead: 1 frame oculta latencia de red
run_ahead_enabled = "true"
run_ahead_frames = "1"
run_ahead_secondary_instance = "true"

# Netplay: 1 frame buffer, verificación cada 30 frames
netplay_input_latency_frames_min = "1"
netplay_input_latency_frames_range = "0"
netplay_check_frames = "30"

# Sin rollback (evita inputs duplicados en RetroArch 1.19.1)
# Sin UPnP ni anuncios públicos
```

### Recomendaciones
- AMBAS PCs deben usar el **mismo archivo** `netplay_optimized.cfg`.
- Si hay desync, verificar que la ROM y el core sean **idénticos** en ambas PCs.
- Si hay lag, probar con `latency_min = "2"` (más buffer) o `run_ahead_frames = "2"`.
- Si hay inputs duplicados, mantener `latency_range = "0"` (sin rollback).

---

## 10. Referencia rápida de comandos

```powershell
# === TAILSCALE ===

# Ver estado y IPs
tailscale status

# Ver solo IPs
tailscale ip -4

# Probar conectividad
tailscale ping 100.91.174.4

# Ver diagnóstico de red
tailscale netcheck

# Reiniciar Tailscale (sin cerrar sesión)
net stop Tailscale
net start Tailscale

# === FIREWALL ===

# Abrir puerto 7350 para Tailscale
netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=7350 remoteip=100.0.0.0/8

# Desactivar firewall (solo para pruebas)
netsh advfirewall set allprofiles state off

# Reactivar firewall
netsh advfirewall set allprofiles state on

# === CONECTIVIDAD ===

# Probar conexión HTTP a Nakama
curl.exe http://100.98.148.11:7350 --connect-timeout 10

# === EMPAQUETADO ===

# Generar EXE portable
cd client
npm run package

# === DESARROLLO ===

# Iniciar en modo dev
cd client
npm run dev

# Tests estables
npm run test:stable
```

---

## Notas finales

- Esta guía se basa en una sesión real del 14-Jul-2026 entre dos PCs en Argentina.
- El método más confiable encontrado fue **Tailscale manual (HOST + JOIN)**.
- El sistema de retos tiene un bug corregido pero no probado.
- ✅ **La IP ahora se copia con un click.** ✅ **Firewall automático.** ✅ **Health check integrado.** ✅ **Auto-refresh cada 30s.**
- Para mejor experiencia, ambas PCs deberían tener la misma versión de RetroArch, mismo core FBNeo y misma ROM.
