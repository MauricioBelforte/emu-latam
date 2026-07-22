# GUÍA COMPLETA: Cómo jugar KOF '98 online con Emu Latam

**Versión:** 3.0 — GGPO + RetroArch, Tailscale como método principal
**Conexión recomendada:** Tailscale (WireGuard P2P, baja latencia, sin abrir puertos)

---

## Índice

1. [¿Qué es Emu Latam?](#1-qué-es-emu-latam)
2. [Dos motores: RetroArch vs GGPO](#2-dos-motores-retroarch-vs-ggpo)
3. [Archivos que NO están en GitHub](#3-archivos-que-no-están-en-github)
4. [Instalación (dos métodos)](#4-instalación-dos-métodos)
5. [Configurar Tailscale](#5-configurar-tailscale)
6. [Jugar con RetroArch (Tailscale manual)](#6-jugar-con-retroarch-tailscale-manual)
7. [Jugar con GGPO (FBNeo Fightcade)](#7-jugar-con-ggpo-fbneo-fightcade)
8. [Jugar con RetroArch (modo directo LAN)](#8-jugar-con-retroarch-modo-directo-lan)
9. [Jugar con RetroArch (modo Bore, sin Tailscale)](#9-jugar-con-retroarch-modo-bore-sin-tailscale)
10. [Retos (Challenges)](#10-retos-challenges)
11. [Configuración de red](#11-configuración-de-red)
12. [Solución de problemas comunes](#12-solución-de-problemas-comunes)
13. [Empaquetado del EXE](#13-empaquetado-del-exe)
14. [Desarrollo (npm run dev)](#14-desarrollo-npm-run-dev)
15. [Referencia rápida de comandos](#15-referencia-rápida-de-comandos)

---

## 1. ¿Qué es Emu Latam?

Es un launcher estilo Fightcade para jugar KOF '98 online P2P. Consiste en:

- **Frontend:** React + Vite (interfaz visual)
- **Backend:** Electron + Node.js (orquesta procesos)
- **Servidor de sala:** Nakama (matchmaking, chat, presencia)
- **Netplay:** RetroArch (netplay tradicional) o fcadefbneo (GGPO, menor latencia)
- **Conexión remota:** Tailscale (WireGuard, recomendado) o Bore (túnel TCP público)

### Cómo funciona

1. Un jugador hace de **HOST**: crea sala, inicia el emulador en modo host.
2. El otro jugador se **UNE**: se conecta a la sala y el emulador se lanza en modo guest.
3. El emulador se conecta directo P2P (sin servidor intermediario) usando Tailscale o LAN.

---

## 2. Dos motores: RetroArch vs GGPO

| Característica | RetroArch | GGPO (fcadefbneo) |
|---------------|-----------|-------------------|
| **Latencia** | 1-2 frames de buffer (netplay) | 0 frames (rollback GGPO nativo) |
| **Conexiones** | Tailscale, LAN directa, Bore | Tailscale, LAN directa |
| **Puertos** | TCP 55435 | UDP 6003/6004 |
| **Soporte Bore** | Sí (vía proxy TCP) | No (UDP incompatible con túnel TCP) |
| **Experiencia** | Similar a RetroArch clásico | Similar a Fightcade (más responsivo) |
| **Binario** | `retroarch/retroarch.exe` | `resources/fcadefbneo/fcadefbneo.exe` |
| **Core** | FBNeo via DLL | Nativo (FBNeo compilado con GGPO) |

**Importante:** Ambos motores funcionan independientemente. Podés usar solo RetroArch, solo GGPO, o los dos. El toggle está en la UI.

**Recomendación:** Si ambos tienen Tailscale, usen GGPO (menor latencia). Si uno no puede instalar Tailscale, usen RetroArch + Bore.

---

## 3. Archivos que NO están en GitHub

Por copyright, licencias y peso, estos archivos **están excluidos del repositorio** (`.gitignore`). Necesitás copiarlos manualmente.

### RetroArch (para netplay tradicional)

| Archivo | Ruta esperada | Dónde conseguirlo |
|---------|--------------|-------------------|
| `retroarch.exe` + DLLs | `retroarch/retroarch.exe` | Descargar RetroArch + cores desde libretro.com |
| `fbneo_libretro.dll` | `retroarch/cores/fbneo_libretro.dll` | Online Updater dentro de RetroArch, o descarga directa |
| `kof98.zip` | `retroarch/roms/kof98.zip` | De tu colección personal (no se distribuye) |
| `neogeo.zip` | `retroarch/roms/neogeo.zip` | BIOS de NeoGeo (no se distribuye) |

### FBNeo/GGPO (para modo GGPO)

| Archivo | Ruta esperada | Dónde conseguirlo |
|---------|--------------|-------------------|
| `fcadefbneo.exe` | `resources/fcadefbneo/fcadefbneo.exe` | Copiar desde instalación de Fightcade: `Fightcade/emulator/fbneo/` |
| DLLs (`.dll`) | `resources/fcadefbneo/*.dll` | Misma carpeta de Fightcade |
| `ROMs/` | `resources/fcadefbneo/ROMs/` | Misma carpeta de Fightcade (incluye kof98.zip) |

**Nota:** `client/resources/fcadefbneo/` debe ser una copia exacta de la carpeta `emulator/fbneo/` de Fightcade. Incluye todas las DLLs necesarias, ROMs y assets. Si falta alguna DLL, fcadefbneo no arranca.

### Nakama (servidor de sala)

| Archivo | Ruta esperada | Dónde conseguirlo |
|---------|--------------|-------------------|
| `nakama.exe` | `backend/nakama.exe` | Descargar de heroiclabs.com o del build de Nakama 3.x para Windows |

### PostgreSQL (base de datos, solo para el HOST)

| Software | Versión | Dónde conseguirlo |
|---------|---------|-------------------|
| PostgreSQL | 14+ | https://www.postgresql.org/download/windows/ |

---

## 4. Instalación (dos métodos)

### Método A: Clonar + copiar archivos faltantes (recomendado para devs)

**Paso 1: Clonar el repositorio**
```powershell
git clone https://github.com/MauricioBelforte/emu-latam.git
cd emu-latam
```

**Paso 2: Instalar dependencias**
```powershell
cd client
npm install
```

**Paso 3: Copiar archivos faltantes**
Crear la carpeta `retroarch/` y copiar:
```
retroarch/
├── retroarch.exe          ← De una instalación de RetroArch 1.19.1 (Win64)
├── cores/
│   └── fbneo_libretro.dll ← Core FBNeo
├── roms/
│   ├── kof98.zip          ← ROM de KOF '98
│   └── neogeo.zip         ← BIOS NeoGeo (necesaria para FBNeo)
└── netplay_optimized.cfg  ← Ya está en GitHub
```

Copiar `backend/nakama.exe` desde una descarga oficial de Nakama 3.x.

**Paso 4: (Opcional) Copiar GGPO**
```powershell
cp -Recurse "C:\Fightcade\emulator\fbneo\*" "client\resources\fcadefbneo\"
```

**Paso 5: Instalar PostgreSQL (SOLO en PC1, la que hace de HOST)**
Descargar e instalar desde https://www.postgresql.org/download/windows/. Durante la instalación:
- Puerto: `5432` (default)
- Contraseña: la que quieras (va en `backend/local.yml`)

Si la PC secundaria usa PostgreSQL en puerto `5433`, modificar `backend/local.yml`:
```yaml
database:
  address: 127.0.0.1:5433
```

**Paso 6: Iniciar**
```powershell
cd client
npm run dev
```

### Método B: Copiar carpeta completa por USB (recomendado para jugar)

**En la PC que ya tiene todo funcionando:**
```powershell
cd client
npm run package
```

Esto genera `client/dist/Emu Latam-win32-x64/` (~688 MB). Copiar TODA esta carpeta a un USB.

**En la otra PC:**
1. Copiar la carpeta `Emu Latam-win32-x64/` desde el USB al disco.
2. Ejecutar `Emu Latam.exe` (no necesita Node.js, npm, ni nada).
3. **No necesita PostgreSQL** si solo va a ser GUEST (unirse a partidas).
4. Instalar Tailscale (ver sección 5).

**Para que la otra PC pueda ser HOST también:**
- Necesita PostgreSQL instalado.
- La ROM `kof98.zip` y el core `fbneo_libretro.dll` ya están incluidos en `resources/extraResources/retroarch/` dentro de la carpeta empaquetada.

---

## 5. Configurar Tailscale

**Importante:** Tailscale es el método más recomendado. Cero configuración de router, baja latencia, funciona desde redes distintas.

### En AMBAS PCs

**1. Instalar Tailscale**
Descargar de https://tailscale.com/download e instalar (siguiente, siguiente, siguiente).

**2. Loguearse con la MISMA cuenta**
```powershell
# Al abrir Tailscale por primera vez, pide login con Google/Microsoft/Email
# Usar EL MISMO email en ambas PCs
```

**3. Verificar conexión**
```powershell
tailscale status
# Debería ver ambas máquinas activas:
# 100.x.x.x   PC1   user@   windows   active
# 100.y.y.y   PC2   user@   windows   active
```

**4. PERMITIR CONEXIONES ENTRANTES**
Por defecto Tailscale bloquea conexiones entrantes. Hay que desactivarlo:
```powershell
tailscale up --shields-up=false
```
O desde la interfaz: Settings → **Allow incoming connections** → ON.

**5. Probar conectividad (desde PC2)**
```powershell
# Reemplazar con la IP de PC1 que aparece en tailscale status
tailscale ping 100.x.x.x
# Debería responder: "pong from PC1 in XXms"
```

---

## 6. Jugar con RetroArch (Tailscale manual)

**Este es el flujo más probado y confiable.**

### En PC1 (Host)

1. Abrir Emu Latam (`Emu Latam.exe` o `npm run dev`).
2. Click **CREAR SALA** (botón verde grande).
3. Aparece el banner "SALA CREADA" con la IP de Tailscale. **Click en la IP para copiarla**.
4. En la sección "OTROS MÉTODOS DE CONEXIÓN", abrir **TAILSCALE**.
5. Click **HOST TAILSCALE**.
6. RetroArch se abre en modo host (pantalla "Waiting for player").

### En PC2 (Guest)

1. Abrir Emu Latam.
2. Click **UNIRSE A SALA**.
3. Pegar la IP que te pasó PC1 (ej: `100.x.x.x:7350`). Click **CONECTAR**.
4. En la sección TAILSCALE, pegar la IP de PC1 en el campo de texto.
5. Click **JOIN TAILSCALE**.
6. RetroArch se abre y se conecta automáticamente.

### En ambas

- Seleccionar personajes y jugar.
- Para verificar que están conectados: en RetroArch, apretar F11 (netplay stats) o ver si el otro jugador aparece en el chat de Emu Latam.

---

## 7. Jugar con GGPO (FBNeo Fightcade)

**Requiere:** Tailscale en ambas PCs y los binarios de fcadefbneo copiados en `client/resources/fcadefbneo/`.

El toggle de motor está al lado del logo, entre el chat y los botones principales.

### En PC1 (Host)

1. Asegurar que el toggle muestre **GGPO** (si no, hacer click para cambiarlo).
2. Click **CREAR SALA**.
3. Aparece la IP automáticamente. **Click para copiar**.
4. Abrir la sección **TAILSCALE** (o la que corresponda según conexión).
5. Click **HOST GGPO**.
6. Aparece "ESPERANDO OPONENTE..." con la IP visible.

### En PC2 (Guest)

1. Asegurar que el toggle esté en **GGPO**.
2. Click **UNIRSE A SALA**.
3. Pegar la IP de PC1, click **CONECTAR**.
4. En la vista de GGPO, aparece la sala de PC1 con su nombre e IP.
5. Click **UNIRSE**.
6. Cuando el host detecta al guest, ambos lanzan automáticamente fcadefbneo.

### Notas
- Bore NO está disponible en modo GGPO (UDP incompatible con túnel TCP).
- El modo GGPO usa puertos UDP 6003 (host) y 6004 (guest).
- Si no se ven salas GGPO, verificar que ambos estén en el mismo lobby de Nakama.

---

## 8. Jugar con RetroArch (modo directo LAN)

**Solo funciona si ambas PCs están en la misma red local** (mismo router/módem).

### En PC1 (Host)
1. **CREAR SALA** (IP local se detecta automáticamente).
2. Abrir **LAN** en la sección de métodos.
3. Click **HOST DIRECTO (sin bore)**.
4. RetroArch se abre en modo host.

### En PC2 (Guest)
1. **UNIRSE A SALA** con la IP LAN de PC1 (ej: `192.168.0.10:7350`).
2. Abrir **LAN**.
3. Click **JOIN LAN**.
4. RetroArch se conecta directamente a PC1.

---

## 9. Jugar con RetroArch (modo Bore, sin Tailscale)

**Para cuando Tailscale no es una opción** (ej: el guest no puede instalarlo). Bore crea un túnel TCP público, pero puede tener más latencia.

### En PC1 (Host)
1. **CREAR SALA**.
2. Abrir **BORE**.
3. Click **1. HOST GAME (BORE)**.
4. Esperar que aparezca la URL de bore (ej: `bore.pub:12828`). Copiarla.
5. Pasar la URL a PC2.
6. RetroArch se abre en modo host.

### En PC2 (Guest)
1. **UNIRSE A SALA** (IP de PC1).
2. Abrir **BORE**.
3. Pegar la URL de bore (ej: `bore.pub:12828`).
4. Click **2. JOIN GAME**.
5. RetroArch se conecta vía el túnel TCP.

---

## 10. Retos (Challenges)

Emu Latam tiene un sistema de retos integrado. No es necesario crear/ Unirse a sala manualmente.

### Flujo
1. Ambos deben estar conectados (INSERT COIN + ver al otro en el sidebar de usuarios online).
2. Click en el nombre del usuario en el sidebar → **ENVIAR RETO**.
3. El otro recibe una notificación → **ACEPTAR** (tiene tiempo limitado).
4. Se ejecuta el flujo automático de conexión según el motor seleccionado (RetroArch o GGPO).

**Nota:** Los retos con GGPO usan descubrimiento automático de IP (no es necesario copiar nada). Los retos con RetroArch pueden necesitar configurar el método de conexión antes.

---

## 11. Configuración de red

### Firewall (solo PC1, la que hostea)
Emu Latam intenta abrir puertos automáticamente. Si falla (por no estar como admin):
```powershell
# Abrir puerto 7350 (Nakama) para toda la red Tailscale
netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=7350 remoteip=100.0.0.0/8
```

### PostgreSQL
- **PC1:** Puerto 5432 (default). PostgreSQL debe estar instalado y el servicio corriendo.
- **PC2 (solo guest):** No necesita PostgreSQL.
- **Si PostgreSQL está en otro puerto:** Editar `backend/local.yml` con el puerto correcto.

### Puertos usados por los emuladores
| Emulador | Modo | Protocolo | Puerto |
|----------|------|-----------|--------|
| RetroArch | Host | TCP | 55435 |
| RetroArch | Guest (con proxy Bore) | TCP | 55435 (loopback) |
| RetroArch | Forwarder (Host+Bore) | TCP | 55436 |
| fcadefbneo | Host GGPO | UDP | 6003 |
| fcadefbneo | Guest GGPO | UDP | 6004 |

---

## 12. Solución de problemas comunes

### "retroarch.exe no encontrado"
Falta copiar RetroArch. Ver sección 3.

### "fcadefbneo.exe no encontrado"
No copiaste la carpeta de Fightcade. Ver sección 3 (GGPO).

### "No se pudo conectar al servidor. Verifica la IP"
- Verificar que PC1 tenga la sala creada (Nakama corriendo).
- Verificar la IP de Tailscale de PC1 (`tailscale status`).
- Verificar que `--shields-up=false` en Tailscale.
- Desactivar firewall temporalmente en PC1 para probar.

### "No veo la sala del otro en GGPO"
- Verificar que ambos estén en GGPO mode (toggle en GGPO).
- Verificar que ambos estén conectados al mismo lobby (INSERT COIN).
- Si usan Nakama local, PC2 debe estar UNIDO A SALA de PC1.

### "Nakama OFFLINE" / "INSERT COIN bloqueado"
- **PC1:** Nakama no pudo iniciar. Falta PostgreSQL o el puerto 7350 está ocupado.
- **PC2:** No está conectado al Nakama de PC1. Usar UNIRSE A SALA.

### "El chat muestra Player 324 en vez del nombre"
El nombre personalizado se configuró, pero puede tardar unos segundos en propagarse. También verificar que ambos tengan el nombre guardado en "TU NOMBRE" (Netplay Config Modal).

### RetroArch se abre pero no conecta
- Cerrar RetroArch en ambas PCs.
- Verificar que el puerto 55435 no esté ocupado (`netstat -ano | findstr 55435`).
- Reintentar HOST + JOIN.

### Desincronización durante la partida
- Asegurar que AMBAS PCs tengan exactamente el mismo `kof98.zip` y `fbneo_libretro.dll`.
- Si una PC tiene ROM modificada (hack), no va a sincronizar.
- Si el problema persiste, ajustar `netplay_check_frames` o `netplay_input_latency_frames_min` desde el editor de configuración (ícono ⚙ en el header).

### Inputs del guest se duplican en pantalla del host (RetroArch)
El fix final está en `netplay_optimized.cfg`: `run_ahead_enabled = "false"` + `check_frames = "0"`. Si aún persiste, abrir el editor de configuración (⚙) y poner `netplay_check_frames = "0"`.

---

## 13. Empaquetado del EXE

Para generar el `.exe` distribuible (sin Node.js):
```powershell
cd client
npm run package
```

**Qué incluye:**
- `retroarch/` completo (RetroArch + cores + ROMs)
- `backend/nakama.exe`
- `relay-server/bore.exe`
- `client/resources/fcadefbneo/` (si existe)

**Output:** `client/dist/Emu Latam-win32-x64/Emu Latam.exe` (~688 MB)

**Distribución:** Comprimir toda la carpeta `Emu Latam-win32-x64/` en ZIP y pasar por USB/Google Drive.

---

## 14. Desarrollo (npm run dev)

Para levantar el proyecto en modo desarrollo:
```powershell
cd client
npm run dev
```

Esto abre:
- Una ventana de Electron (la app principal)
- Una segunda ventana (modo guest para test local)
- La terminal muestra logs de Nakama, bore y el main process

**Comandos útiles:**
```powershell
npm run build             # Compila TypeScript
npm run package           # Empaqueta EXE
npm run test:stable       # Tests automatizados (35+ tests)
npx tsc --noEmit          # Verificar tipos TypeScript
```

---

## 15. Referencia rápida de comandos

```powershell
# === TAILSCALE ===
tailscale status                              # Ver estado e IPs
tailscale ip -4                               # Ver solo IP propia
tailscale ping 100.x.x.x                      # Probar conectividad
tailscale up --shields-up=false               # Permitir conexiones entrantes

# === FIREWALL ===
netsh advfirewall firewall add rule name="Nakama Tailscale" dir=in action=allow protocol=TCP localport=7350 remoteip=100.0.0.0/8

# === EMPAQUETADO ===
cd client; npm run package                    # Generar EXE portable

# === DESARROLLO ===
cd client; npm run dev                        # Iniciar en modo desarrollo
cd client; npm run build                      # Compilar TypeScript
cd client; npm run test:stable                # Tests automatizados

# === GIT ===
git pull                                      # Actualizar código
git status                                    # Ver cambios
```

---

## Notas finales

- **Método más recomendado:** Tailscale + GGPO (mínima latencia, automático).
- **Si no pueden usar GGPO:** Tailscale + RetroArch funciona excelente.
- **Si no pueden usar Tailscale:** RetroArch + Bore (más latencia pero funcional).
- Los binarios de RetroArch y fcadefbneo **no están en GitHub**. Hay que copiarlos manualmente o pasar la carpeta empaquetada por USB.
- Tanto RetroArch como GGPO funcionan independientemente. Se puede usar solo uno.
- La primera PC (Host) necesita PostgreSQL. Las PCs guest NO.
