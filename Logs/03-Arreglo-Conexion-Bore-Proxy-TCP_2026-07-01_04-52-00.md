# Log 03: Arreglo Conexión Bore - Proxy TCP

**Fecha:** 2026-07-01 04:52
**Tipo:** Bugfix / Mejora arquitectónica

## Resumen
Se descubrió que RetroArch ignora el flag `--port` cuando se usa como cliente. Siempre conecta al puerto 55435 (default). Esto impedía la conexión a túneles bore que usan puertos dinámicos (ej: `bore.pub:31501`).

## Solución
Se implementó un **proxy TCP local** en el main process de Electron que escucha en `127.0.0.1:55435` y redirige las conexiones al túnel bore (`bore.pub:XXXXX`). El host con relay usa `--host --port 55436` para liberar el puerto 55435 para el proxy.

## Archivos modificados
- `client/src/main/index.ts`: Se agregaron funciones `startProxy()`, `stopAllProxies()`. Se modificó `launch-game` handler para usar proxy en guest con relay y puerto 55436 en host con relay. Se modificó `start-relay-tunnel` para tunelizar puerto 55436.
- `DOCUMENTACION/03-Integracion-Bore/03-Diseno.md`: Actualizado con arquitectura de proxy TCP.
- `DOCUMENTACION/03-Integracion-Bore/04-Codigo.md`: Actualizado con detalles de implementación.
- `DOCUMENTACION/03-Integracion-Bore/05-Checklist.md`: Agregados items del fix.
- `DOCUMENTACION/3-DOCUMENTO-TAREAS-ACTUAL.md`: Agregados items completados del fix.
- `DOCUMENTACION/4-DOCUMENTO-EJECUCION-ACTUAL.md`: Actualizado con arquitectura actual.

## Código nuevo (proxy TCP)
```typescript
function startProxy(targetHost: string, targetPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((localSocket) => {
      const remoteSocket = new net.Socket();
      remoteSocket.connect(targetPort, targetHost, () => {
        localSocket.pipe(remoteSocket);
        remoteSocket.pipe(localSocket);
      });
      // ... error handling ...
    });
    server.listen(55435, "127.0.0.1", () => {
      proxyServers.push(server);
      resolve(55435);
    });
  });
}
```

## Resultado
- **HOST DIRECTO → JOIN GAME:** ✅ Funciona correctamente
- **HOST GAME (BORE) → JOIN GAME:** ✅ Funciona correctamente
- Ambos modos verificados en misma PC con dos ventanas de RetroArch conectadas.
