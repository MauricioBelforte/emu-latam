# 04 — Código del Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN
> **Estado:** Plan inicial (código planificado)

---

## 1. Archivos a Crear

| Archivo | Descripción |
|:--------|:------------|
| `client/src/main/bootstrap.ts` | Funciones publish/fetch bore URL vía dpaste.org + inicio bore Nakama |
| `client/test_bootstrap.js` | Tests simulados (mock HTTP, sin red real) |

## 2. Archivos a Modificar

| Archivo | Cambio |
|:--------|:--------|
| `client/src/main/index.ts` | Registrar 3 IPC handlers: `bootstrap-host`, `bootstrap-guest`, `bootstrap-close` |
| `client/src/main/services/ipcChannels.ts` | Agregar 3 canales al whitelist |
| `client/src/preload/index.ts` | (Opcional) No necesita cambios porque usa ipcRenderer.invoke genérico |
| `client/src/App.tsx` | Agregar botón "SALA PÚBLICA" + lógica de room code |

---

## 3. Funciones Clave (planificadas)

### `bootstrap.ts`

```typescript
// Constantes
const PASTE_API = "https://dpaste.org/api/";
const PASTE_RAW = "https://dpaste.org";
const BORE_NAKAMA_PORT = 7350;

// 1. Publicar bore URL en dpaste.org
export async function publishBoreUrl(boreUrl: string): Promise<{ success: boolean; roomCode?: string; error?: string }>

// 2. Obtener bore URL desde dpaste.org por room code
export async function fetchBoreUrl(roomCode: string): Promise<{ success: boolean; boreUrl?: string; error?: string }>

// 3. Iniciar bore para Nakama
export async function startNakamaBore(): Promise<{ success: boolean; url?: string; error?: string }>

// 4. Handler principal del host
export async function handleBootstrapHost(): Promise<HandlerResult>

// 5. Handler principal del guest
export async function handleBootstrapGuest(roomCode: string): Promise<HandlerResult>

// 6. Cerrar sala pública
export async function handleBootstrapClose(): Promise<HandlerResult>
```

### IPC Handlers (index.ts)

```typescript
ipcMain.handle("bootstrap-host", async () => handleBootstrapHost());
ipcMain.handle("bootstrap-guest", async (_e, { roomCode }) => handleBootstrapGuest(roomCode));
ipcMain.handle("bootstrap-close", async () => handleBootstrapClose());
```

### App.tsx

```tsx
// Estado
const [bootstrapStatus, setBootstrapStatus] = useState("");
const [roomCode, setRoomCode] = useState("");
const [bootstrapBoreUrl, setBootstrapBoreUrl] = useState("");

// Handlers
const handleBootstrapHost = async () => { ... }
const handleBootstrapGuest = async (code: string) => { ... }
const handleBootstrapClose = async () => { ... }
```

---

## 4. Flujo de Datos (dpaste.org API)

### Host → POST
```
POST https://dpaste.org/api/
Content-Type: application/x-www-form-urlencoded

content=bore.pub:28734&title=emu-sala

Respuesta:
  Status: 201
  Location: https://dpaste.org/aB3xZ6/
  
Room code = "aB3xZ6"
```

### Guest → GET
```
GET https://dpaste.org/aB3xZ6/raw/

Respuesta:
  bore.pub:28734
```

---

## 5. Manejo de Errores

| Escenario | Comportamiento |
|:----------|:---------------|
| dpaste.org timeout (5s) | Retornar error, mostrar URL manual al host |
| Room code inválido | dpaste devuelve 404 → error "Código inválido" |
| bore no responde | Timeout 10s → error "No se pudo iniciar túnel Nakama" |
| Nakama no está corriendo | Error "Nakama no está activo" |
| Guest ya conectado | No hay cambio, la config se sobreescribe |
| Host cierra sala | Mata bore, restaura Nakama config a localhost |
