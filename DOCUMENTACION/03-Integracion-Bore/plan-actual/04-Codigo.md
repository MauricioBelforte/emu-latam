# Código

## `client/src/main/index.ts`

### Funciones clave

#### `startProxy(targetHost, targetPort)` (nueva)
Crea un servidor TCP en `127.0.0.1:55435`. Cada conexión entrante (de RetroArch guest) es redirigida a `targetHost:targetPort` (ej: `bore.pub:31501`). Usa `pipe()` bidireccional para el reenvío de datos.

```typescript
function startProxy(targetHost: string, targetPort: number): Promise<number>
```

#### `stopAllProxies()`
Cierra todos los servidores proxy activos. Se llama automáticamente cuando el guest RetroArch termina (`child.on("close")`).

#### `launch-game` handler
- **Host + relay:** Usa `--host --port 55436` (puerto no-default para liberar 55435)
- **Guest + relay (bore):** Inicia proxy local en 55435 que reenvía al relay URL, luego spawn RetroArch con `--connect 127.0.0.1`
- **Guest + relay (directo/localhost):** Si relayIp es `127.0.0.1:55435`, no usa proxy, conecta directo con `--connect 127.0.0.1 --port 55435`
- **Host + directo:** `--host --port 55435`
- **Guest + directo:** `--connect 127.0.0.1 --port 55435`

#### `start-relay-tunnel` handler
Ahora spawn `bore local 55436 --to bore.pub` en lugar de `55435` (consistente con el host que escucha en 55436).

## `client/src/App.tsx`

- `handleTestGame(true)` → HOST GAME (BORE): inicia túnel bore, spawn host RA con useRelay=true
- `handleTestGame(false)` → JOIN GAME: lee relay URL de archivo, spawn guest RA con useRelay=true
- `handleDirectHost()` → HOST DIRECTO: spawn host RA con useRelay=false, guarda `127.0.0.1:55435` en archivo

## Logs relevantes
- `logs/main_process.log` - salida completa del main process
- Los logs confirman: bore creado, proxy iniciado, RetroArch conectado exitosamente (ambos modos)