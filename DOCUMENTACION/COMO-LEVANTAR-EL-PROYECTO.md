# 🚀 Cómo Levantar el Proyecto Emu Latam (Sin Errores)

Este documento explica paso a paso cómo iniciar el entorno de desarrollo de Emu Latam desde cero.

---

## Requisitos Previos

| Requisito | Detalle |
|-----------|---------|
| **Node.js** | v18 o superior |
| **npm** | Incluido con Node.js |
| **PostgreSQL** | Corriendo en `127.0.0.1:5432` (o `5433` en la PC secundaria de Mauricio) |
| **Base de datos** | Debe existir una base de datos llamada `nakama` en PostgreSQL |

### ⚠️ Nota sobre PostgreSQL (PC Secundaria)
En la PC secundaria de Mauricio, PostgreSQL corre en el puerto **5433**. Antes de iniciar, verificar que el archivo `backend/local.yml` apunte al puerto correcto:
```yaml
database:
  address:
    - "postgres:localdb@127.0.0.1:5433/nakama"
```

### Diagnostico que funciono el 2026-06-30

En esta maquina el proyecto levanto correctamente con PostgreSQL instalado como servicio de Windows, pero las herramientas `psql`, `createdb` y `pg_isready` no estaban en el `PATH`.

1. Verificar si PostgreSQL esta instalado como servicio:
```powershell
Get-Service | Where-Object { $_.Name -match 'postgres|pgsql|postgresql' -or $_.DisplayName -match 'postgres|pgsql|postgresql' }
```

Resultado esperado en esta maquina:
```text
postgresql-x64-17    Running
```

2. Verificar que el puerto configurado en `backend/local.yml` responda:
```powershell
Test-NetConnection 127.0.0.1 -Port 5432
```

Resultado esperado:
```text
TcpTestSucceeded : True
```

3. Si `psql` no aparece en consola, usar el binario instalado por PostgreSQL:
```powershell
Get-ChildItem -Path 'C:\Program Files\PostgreSQL' -Recurse -Filter psql.exe -ErrorAction SilentlyContinue
```

Ruta encontrada:
```text
C:\Program Files\PostgreSQL\17\bin\psql.exe
```

4. Validar que exista la base `nakama` con las credenciales usadas por `backend/local.yml`:
```powershell
$env:PGPASSWORD='localdb'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h 127.0.0.1 -p 5432 -U postgres -d postgres -Atc "SELECT datname FROM pg_database WHERE datname = 'nakama';"
```

Resultado esperado:
```text
nakama
```

5. Ejecutar las migraciones de Nakama desde `backend/`:
```powershell
cd backend
.\nakama.exe migrate up --config local.yml
```

Resultado observado:
```text
Successfully applied migration count=14
```

6. Levantar la app desde `client/`:
```powershell
cd ..\client
npm run dev
```

7. Validar que el entorno quedo arriba:
```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5173/' -TimeoutSec 5
Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:7350/' -TimeoutSec 5
Invoke-RestMethod -Uri 'http://localhost:7350/healthcheck' -TimeoutSec 5
```

Resultados esperados:
- `http://localhost:5173/` responde HTTP 200.
- `http://localhost:7350/` responde HTTP 200.
- `http://localhost:7350/healthcheck` responde `{}`.
- `nakama.exe` queda escuchando en los puertos `7350` y `7351`.

Nota: `npm run lint` puede fallar por errores existentes de ESLint/typing. Ese fallo no impidio el levantamiento manual validado el 2026-06-30.

---

## Paso 1: Instalar Dependencias

Solo es necesario la primera vez o cuando se agreguen dependencias nuevas.

```bash
cd client
npm install
```

---

## Paso 2: Levantar el Proyecto en Modo Desarrollo

Desde la carpeta `client/`:

```bash
cd client
npm run dev
```

### ¿Qué hace este comando?
1. **Compila el Main Process** de Electron (`client/src/main/index.ts`) → `out/main/index.js`.
2. **Compila el Preload** (`client/src/preload/index.ts`) → `out/preload/index.js`.
3. **Inicia el servidor de desarrollo de Vite** para el frontend React en `http://localhost:5173/`.
4. **Abre la ventana de Electron** que carga la UI de React.
5. **Lanza Nakama automáticamente** en modo oculto (sin ventana de consola visible).

### ¿Cuánto tarda?
Aproximadamente **3-5 segundos** hasta que aparezca la ventana.

---

## Paso 3: Verificar que Todo Funciona

Al abrir la ventana deberías ver:

1. **"INICIANDO SERVIDOR..."** → El botón principal aparece deshabilitado con una animación de pulso mientras Nakama termina de arrancar.
2. **"INSERT COIN"** → Después de ~2-5 segundos, el botón cambia a su estado normal y se habilita. Esto significa que Nakama respondió correctamente al Health Check.
3. **Sin errores en la consola del desarrollador** → Presionar `Ctrl+Shift+I` para abrir DevTools y verificar que no haya errores rojos.

---

## Problemas Comunes y Soluciones

### ❌ "Error intentando conectar con Nakama Server local"
**Causa:** PostgreSQL no está corriendo o la base de datos `nakama` no existe.
**Solución:**
1. Verificar que PostgreSQL esté activo: `pg_isready -h 127.0.0.1 -p 5432`
2. Verificar que la BD exista: `psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='nakama'"`
3. Si no existe, crearla: `createdb -U postgres nakama`

### ❌ La ventana de Electron NO aparece (lanzado desde terminal del asistente IA)
**Causa:** Si se ejecuta `npm run dev` desde la terminal integrada del agente IA (sandbox), la ventana gráfica de Electron queda invisible porque el proceso corre aislado del escritorio del usuario.
**Solución:** Siempre ejecutar `npm run dev` desde una terminal nativa del sistema operativo o desde la terminal integrada del editor (VS Code / Antigravity IDE), NO desde el chat del asistente IA.

### ❌ `"ChildProcess" is imported but never used`
**Causa:** Advertencia menor de Vite. Ya fue corregida usando `import type`.
**Solución:** Si reaparece, cambiar `import { ChildProcess }` por `import type { ChildProcess }` en `client/src/main/index.ts`.

### ❌ Puerto 5173 ya está en uso
**Causa:** Otra instancia de Vite o de la app quedó corriendo.
**Solución:**
```bash
# Matar procesos huérfanos de Electron y Nakama
taskkill /F /IM electron.exe /T
taskkill /F /IM nakama.exe /T
```

### ❌ Puerto 7350 ya está en uso (Nakama duplicado)
**Causa:** Se cerró la app pero Nakama quedó corriendo en segundo plano.
**Solución:** La app detecta automáticamente si Nakama ya está corriendo y no lo duplica. Si persiste:
```bash
taskkill /F /IM nakama.exe
```

---

## Estructura de Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el entorno completo de desarrollo (Vite + Electron + Nakama) |
| `npm run build` | Compila el proyecto para producción |
| `npm run lint` | Ejecuta el linter de TypeScript/ESLint |
| `npm run preview` | Previsualiza la build de producción |

---

## Detener el Proyecto

Para cerrar correctamente:
1. **Cerrar la ventana de Electron** (clic en la X o `Alt+F4`).
2. El proceso de Nakama se cierra automáticamente al cerrar Electron.
3. Si quedaron procesos huérfanos:
```bash
taskkill /F /IM electron.exe /T
taskkill /F /IM nakama.exe /T
```

---

*Última actualización: 2026-06-30*
