# Informe de Cambios 02 - Documentacion de levantamiento

## Descripcion breve
Se documento el procedimiento real que permitio levantar el proyecto en la maquina local con PostgreSQL 17 instalado como servicio de Windows.

## Codigo original
El archivo `DOCUMENTACION/COMO-LEVANTAR-EL-PROYECTO.md` solo indicaba el flujo general:

```markdown
cd client
npm run dev
```

Tambien mencionaba validar PostgreSQL con herramientas como `pg_isready`, `psql` y `createdb`, pero no documentaba el caso donde esas herramientas existen en `C:\Program Files\PostgreSQL\17\bin` y no estan disponibles en el `PATH`.

## Nuevo codigo
Se agrego la seccion `Diagnostico que funciono el 2026-06-30` con:

```powershell
Get-Service | Where-Object { $_.Name -match 'postgres|pgsql|postgresql' -or $_.DisplayName -match 'postgres|pgsql|postgresql' }
Test-NetConnection 127.0.0.1 -Port 5432
Get-ChildItem -Path 'C:\Program Files\PostgreSQL' -Recurse -Filter psql.exe -ErrorAction SilentlyContinue
$env:PGPASSWORD='localdb'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h 127.0.0.1 -p 5432 -U postgres -d postgres -Atc "SELECT datname FROM pg_database WHERE datname = 'nakama';"
cd backend
.\nakama.exe migrate up --config local.yml
cd ..\client
npm run dev
```

Tambien se agregaron validaciones HTTP:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5173/' -TimeoutSec 5
Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:7350/' -TimeoutSec 5
Invoke-RestMethod -Uri 'http://localhost:7350/healthcheck' -TimeoutSec 5
```

## Resultado
- PostgreSQL se documento como servicio `postgresql-x64-17`.
- Se registro que `psql` no estaba en `PATH`, pero existia en `C:\Program Files\PostgreSQL\17\bin\psql.exe`.
- Se documento que la base `nakama` existia y que las migraciones de Nakama aplicaron correctamente.
- Se documento que Vite respondio en `http://localhost:5173/` y Nakama en `http://localhost:7350/`.
- Se dejo asentado que `npm run lint` falla por errores existentes de ESLint/typing, sin impedir el levantamiento manual.
