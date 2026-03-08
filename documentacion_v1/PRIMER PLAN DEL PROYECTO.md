Este es el **Plan Maestro "Proyecto KOF-LATAM"**.

El objetivo de esta "Primera Versión Funcional" (MVP) es:

1. Abrir tu Launcher.
2. Ver a otro usuario conectado.
3. Hacer clic en "Retar".
4. Que se abra la ventana de KOF '98 y empiece la pelea.

---

### 📂 Estructura del Proyecto en VS Code

Lo primero, creá una carpeta raíz llamada `emu-latam` y dentro vamos a tener 3 sub-carpetas principales. Tu explorador de archivos debe verse así:

```text
emu-latam/
├── backend/          # Aquí vive Docker y la lógica de Nakama
├── client/           # El Launcher (Electron + React)
├── emulator/         # El código C++ de FBNeo + GGPO
└── README.md

```

**Extensiones recomendadas para instalar YA en VS Code:**

* **Docker** (Microsoft)
* **ESLint / Prettier** (Para el JS/TS)
* **C/C++** (Microsoft) - Para cuando toquemos el emulador.

---

### FASE 1: El Backend (La Base)

**Objetivo:** Tener un servidor local que acepte usuarios.

1. **Directiva:** Abre la terminal en la carpeta `backend`.
2. **Archivo:** Crea un archivo `docker-compose.yml`.
3. **Código:** Copia el siguiente contenido (optimizado para desarrollo local):

```yaml
version: '3'
services:
  postgres:
    container_name: kof_db
    image: postgres:12.2-alpine
    environment:
      - POSTGRES_DB=nakama
      - POSTGRES_PASSWORD=localdb
    volumes:
      - data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  nakama:
    container_name: kof_server
    image: heroiclabs/nakama:3.16.0
    entrypoint:
      - /bin/sh
      - -ec
      - >
        /nakama/nakama migrate up --database.address postgres:localdb@postgres:5432/nakama &&
        /nakama/nakama --database.address postgres:localdb@postgres:5432/nakama --logger.level DEBUG --session.token_expiry_sec 7200
    restart: always
    links:
      - postgres
    depends_on:
      - postgres
    ports:
      - "7349:7349"
      - "7350:7350"
      - "7351:7351"
volumes:
  data:

```

4. **Ejecución:** En la terminal de VS Code: `docker-compose up -d`.
5. **Validación:** Entra a `http://127.0.0.1:7351` en tu navegador. Si ves el login de Nakama, **Fase 1 completada**.

---

### FASE 2: El Cliente (El Launcher)

**Objetivo:** Una ventana que conecte al servidor y muestre quién está online.

1. **Directiva:** Abre la terminal en la carpeta `client`.
2. **Inicialización:** Vamos a usar **Vite** con Electron (es más rápido y moderno).
```bash
npm create @quick-start/electron my-app -- --template react-ts
cd my-app
npm install @heroiclabs/nakama-js

```


3. **Lógica de Conexión:**
En `src/renderer/src/App.tsx`, vamos a limpiar el código y poner la lógica de conexión.
```typescript
import { Client } from "@heroiclabs/nakama-js";
import { useEffect, useState } from "react";

// Configuración apuntando a tu Docker local
const client = new Client("defaultkey", "127.0.0.1", "7350");
client.useSSL = false;

function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const connect = async () => {
      // Autenticación "invisible" con ID del dispositivo (para probar rápido)
      const deviceId = "test-id-" + Math.floor(Math.random() * 1000);
      const session = await client.authenticateDevice(deviceId, true, "JugadorBeta");
      setSession(session);
      console.log("Conectado! Token:", session.token);

      // Aquí luego nos uniremos al socket para ver a otros
    };
    connect();
  }, []);

  return (
    <div className="container">
      <h1>KOF LATAM LAUNCHER</h1>
      <p>Estado: {session ? "🟢 Conectado al Servidor" : "🔴 Desconectado"}</p>
      <button onClick={() => alert("Buscando pelea...")}>Jugar KOF 98</button>
    </div>
  );
}
export default App;

```


4. **Ejecución:** `npm run dev`. Deberías ver una ventana negra que diga "🟢 Conectado al Servidor".

---

### FASE 3: El Emulador (La Integración Cruda)

**Objetivo:** Conseguir un binario de FBNeo que acepte comandos por consola.

Esta es la parte donde la mayoría se traba. No vamos a modificar el código C++ hoy, vamos a usar los **argumentos de línea de comandos**.

1. **Descarga:** Necesitamos el ejecutable de **FBNeo** (o Fightcade FBNeo) y ponerlo en la carpeta `emulator`.
2. **La ROM:** Consigue la rom `kof98.zip` (legalmente, guiño guiño) y ponla en la carpeta `emulator/roms`.
3. **El Truco:** FBNeo acepta comandos para lanzar juegos directo.
* Prueba manual en terminal:
`./fbneo.exe kof98` (Esto debería abrir el juego directo sin menús).



---

### FASE 4: La "Orquestación" (Node.js lanza C++)

**Objetivo:** Que el botón "Jugar" de tu Launcher abra el emulador.

En Electron, el proceso "Renderer" (la UI) no puede abrir programas por seguridad. Debes pedírselo al proceso "Main".

1. **En `src/main/index.ts` (Proceso Principal):**
Añade un manejador de eventos (IPC).
```typescript
import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import path from 'path'

// Escuchamos la petición de la UI
ipcMain.handle('launch-game', async (event, args) => {
  const emulatorPath = path.join(__dirname, '../../../emulator/fbneo.exe'); // Ajustar ruta real
  const romName = 'kof98';

  console.log("Lanzando emulador...");

  // Aquí es donde ocurre la magia. 
  // Spawn crea un subproceso independiente.
  const game = spawn(emulatorPath, [romName], {
    cwd: path.dirname(emulatorPath) // Importante: ejecutar en la carpeta del emulador
  });

  game.on('close', (code) => {
    console.log(`Juego cerrado con código ${code}`);
  });
});

```


2. **En `src/renderer/src/App.tsx` (Tu UI):**
Conecta el botón:
```typescript
const launchGame = () => {
  // @ts-ignore (Electron expone esto si configuras el preload)
  window.electron.ipcRenderer.invoke('launch-game');
}

// En el return...
<button onClick={launchGame}>Lanzar KOF 98</button>

```



---

### FASE 5: La Lógica P2P (GGPO) - El Gran Final

Para la versión 1.0, simularemos el netplay.

El flujo real que implementaremos después es:

1. Usuario A reta a Usuario B en Nakama.
2. Nakama intercambia sus IPs.
3. El Launcher de A ejecuta: `fbneo.exe kof98 -connect <IP_DE_B> -port 7000`
4. El Launcher de B ejecuta: `fbneo.exe kof98 -host -port 7000`

### Tu tarea para hoy (Next Step):

¿Te animás a completar la **Fase 1 y 2**? Es decir, tener el Docker corriendo y el Launcher mostrando "Conectado".

Si lográs eso, el siguiente paso es que te pase el código exacto para que Nakama maneje el sistema de "Retos" (Challenges) en TypeScript.