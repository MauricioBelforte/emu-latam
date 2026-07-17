# Estructura de Código Propuesta — Gemini 3.5 Flash

## 1. Archivos Involucrados (Nuevos Módulos)
Para implementar las mejoras propuestas sin alterar los flujos blindados actuales, se propone la creación de submódulos en `client/src/main/`:

- [NEW] `client/src/main/services/tailscale-monitor.ts` — Lógica de diagnóstico de red.
- [NEW] `client/src/main/services/process-watchdog.ts` — Monitoreo de ciclos de vida de binarios.
- [NEW] `client/src/main/services/retroarch-control.ts` — Socket UDP para comandos de RetroArch.
- [NEW] `client/src/main/services/safe-forwarder.ts` — Forwarder TCP con control de token.

## 2. Esbozo de Funciones Clave (Main Process)

### tailscale-monitor.ts
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TailscaleStatus {
  isDirect: boolean;
  pingMs: number;
}

export async function checkPeerStatus(peerIp: string): Promise<TailscaleStatus> {
  try {
    const { stdout } = await execAsync('tailscale status --json');
    const status = JSON.parse(stdout);
    const peer = Object.values(status.Peer || {}).find((p: any) => p.TailscaleIPs.includes(peerIp)) as any;
    
    if (!peer) {
      return { isDirect: false, pingMs: 999 };
    }
    
    return {
      isDirect: !peer.DERP,
      pingMs: peer.PingMs || 0
    };
  } catch (error) {
    console.error('[Tailscale Diagnostic] Error running status:', error);
    return { isDirect: false, pingMs: 999 };
  }
}
```

### process-watchdog.ts
```typescript
import { ChildProcess } from 'child_process';

export class ProcessWatchdog {
  static monitor(name: string, child: ChildProcess, onCrash: (errorMsg: string) => void) {
    child.on('close', (code) => {
      console.log(`[Watchdog] ${name} closed with code ${code}`);
      if (code !== null && code !== 0) {
        let diagnostic = `El proceso ${name} falló con código de salida ${code}.`;
        
        // Mapeo simple de errores conocidos de RetroArch
        if (name === 'RetroArch' && code === 1) {
          diagnostic += ' Esto podría deberse a la falta del core FBNeo o del archivo BIOS neogeo.zip.';
        }
        
        onCrash(diagnostic);
      }
    });

    child.stderr?.on('data', (data) => {
      console.error(`[Watchdog - ${name} Error]:`, data.toString());
    });
  }
}
```

### safe-forwarder.ts (Handshake de Seguridad)
```typescript
import * as net from 'net';

export function createSafeForwarder(listenPort: number, targetPort: number, validToken: string) {
  const server = net.createServer((socket) => {
    let authenticated = false;

    socket.once('data', (data) => {
      const payload = data.toString().trim();
      if (payload.startsWith(`TOKEN:${validToken}`)) {
        authenticated = true;
        // Pipear el resto de los datos al host RetroArch
        const target = net.connect(targetPort, '127.0.0.1', () => {
          socket.pipe(target);
          target.pipe(socket);
        });
        
        target.on('error', () => socket.destroy());
        socket.on('error', () => target.destroy());
      } else {
        console.warn('[Safe Forwarder] Intento de intrusión detectado. Cerrando conexión.');
        socket.destroy();
      }
    });

    // Timeout de autenticación
    setTimeout(() => {
      if (!authenticated) {
        socket.destroy();
      }
    }, 2000);
  });

  server.listen(listenPort, '0.0.0.0');
  return server;
}
```

## 3. Logs Relacionados (Ejemplos)
*   `[LOG] [Tailscale Diagnostic] Peer 100.120.5.8 es DIRECT (P2P). Ping estimado: 24ms. Cargando buffers optimizados.`
*   `[LOG] [Watchdog] RetroArch se cerró inesperadamente con código de salida 1. Detalle: BIOS neogeo.zip no encontrado.`
*   `[WARNING] [Safe Forwarder] Token incorrecto o inexistente provisto por 198.51.100.42. Conexión rechazada.`
