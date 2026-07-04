# 04-Codigo — DeepSeek V4 Flash Free

## Archivos Involucrados

### Archivos a CREAR

| Archivo | Propósito |
|---------|-----------|
| `client/src/main/config.ts` | Constantes: puertos, rutas, timeouts, secrets (.env) |
| `client/src/main/logging.ts` | Sistema de logging con rotación (extraído de index.ts) |
| `client/src/main/network-utils.ts` | getLanIp, getTailscaleIp, waitForPort con cacheo |
| `client/src/main/tcp-proxy.ts` | startProxy, stopProxy, startPortForwarder, stopPortForwarder |
| `client/src/main/process-manager.ts` | launchNakama, launchRetroArch, launchBore, killProcesos |
| `client/src/main/ipc-handlers.ts` | Todos los IPC handlers, registerHandlers() |
| `client/src/shared/types.ts` | Interfaces compartidas: ElectronAPI, LaunchGameArgs, etc. |
| `client/src/renderer/hooks/useToast.ts` | Hook para sistema de notificaciones |
| `client/src/renderer/components/ui/Toast/ToastContainer.tsx` | Contenedor de toasts (portal) |
| `client/src/renderer/components/ui/Toast/Toast.tsx` | Componente de notificación individual |
| `client/src/renderer/components/ui/Spinner/LoadingSpinner.tsx` | Spinner reutilizable |
| `client/src/renderer/components/ui/StatusBar/ConnectionStatus.tsx` | Barra de estado de conexión |
| `client/src/renderer/types/electron.d.ts` | Declaración de tipos para window.electron |
| `client/vitest.config.ts` | Configuración de Vitest |
| `client/.github/workflows/ci.yml` | GitHub Actions workflow |
| `backend/docker-compose.yml` | Dockerización Nakama + PostgreSQL |
| `backend/Dockerfile` | Dockerfile para Nakama con config personalizada |
| `backend/bore-server/` | Scripts para servidor Bore propio |

### Archivos a MODIFICAR

| Archivo | Cambio |
|---------|--------|
| `client/src/main/index.ts` | Reducir a orquestador (~50 líneas), importar módulos |
| `client/src/preload/index.ts` | Agregar whitelist de canales IPC + tipos |
| `client/electron/preload.ts` | Evaluar eliminación (duplicado) |
| `client/src/renderer/App.tsx` | Optimizar health check, lazy loading, usar useToast |
| `client/src/renderer/context/AuthContext.tsx` | Integrar con useToast, health check inteligente |
| `client/src/renderer/context/SocialContext.tsx` | Usar tipos tipados de window.electron |
| `client/src/renderer/context/ChallengeContext.tsx` | Mover lógica de red a IPC handlers nuevos |
| `client/package.json` | Agregar scripts: test:unit, lint-staged, prepare |
| `client/tsconfig.json` | Agregar paths para @shared/* |
| `backend/local.yml` | Externalizar secrets a variables de entorno |
| `.gitignore` | Agregar .env, logs/rotated/ |

### Archivos a ELIMINAR

| Archivo | Razón |
|---------|-------|
| `client/electron/preload.ts` | Duplicado obsoleto de `client/src/preload/index.ts` |

## Funciones Clave

### Config (config.ts)

```typescript
export const PORTS = {
  RETROARCH: 55435,
  FORWARDER: 55436,
  NAKAMA: 7350,
  BORE_LOCAL: 55436,
} as const;

export const PATHS = {
  RETROARCH_EXE: 'C:\\Emuladores\\RetroArch\\retroarch.exe',
  BORE_EXE: '.\\bin\\bore.exe',
  NAKAMA_DIR: '.\\bin\\nakama',
  ROM: 'D:\\Juegos\\Roms\\kof98.zip',
} as const;

export const TIMEOUTS = {
  PORT_WAIT: 10000,
  HEALTH_CHECK_INTERVAL: 1000,
  HEALTH_CHECK_STOP_AFTER_AUTH: true,
  CACHE_NETWORK_TTL: 30000,
};

export const SECRETS = {
  NAKAMA_ENCRYPTION_KEY: process.env.NAKAMA_ENCRYPTION_KEY || 'default-dev-key',
  NAKAMA_SIGNING_KEY: process.env.NAKAMA_SIGNING_KEY || 'default-dev-key',
};
```

### Whitelist de Canales IPC (preload/index.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED_INVOKE_CHANNELS = [
  'launch-game',
  'start-relay-tunnel',
  'start-mitm-local',
  'stop-mitm-local',
  'kill-retroarch',
  'tailscale-host',
  'tailscale-join',
  'get-lan-ip',
  'start-relay-tunnel-v2',
  'cancel-challenge',
] as const;

const ALLOWED_ON_CHANNELS = [
  'relay-url',
  'retroarch-exit',
] as const;

const api = {
  invoke: (channel: string, ...args: any[]) => {
    if (!ALLOWED_INVOKE_CHANNELS.includes(channel as any)) {
      return Promise.reject(new Error(`IPC channel '${channel}' not allowed`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    if (!ALLOWED_ON_CHANNELS.includes(channel as any)) {
      console.warn(`IPC on channel '${channel}' not allowed`);
      return;
    }
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('electron', api);
```

### Types Compartidos (shared/types.ts)

```typescript
export interface LaunchGameArgs {
  mode: 'host' | 'guest';
  useRelay: boolean;
  relayIp?: string;
  hostType?: 'bore' | 'tailscale';
}

export interface RelayTunnelArgs {
  mode: 'host' | 'guest';
  guestUsername?: string;
}

export interface MitmArgs {
  action: 'start' | 'stop';
  mode?: 'host' | 'guest';
}

export interface TailscaleArgs {
  action: 'host' | 'join';
}

export interface ElectronAPI {
  invoke: {
    launchGame(args: LaunchGameArgs): Promise<void>;
    startRelayTunnel(args: RelayTunnelArgs): Promise<string>;
    startMitmLocal(args: MitmArgs): Promise<void>;
    stopMitmLocal(): Promise<void>;
    killRetroarch(): Promise<void>;
    tailscaleHost(): Promise<string>;
    tailscaleJoin(): Promise<void>;
    getLanIp(): Promise<string>;
    startRelayTunnelV2(args: RelayTunnelArgs): Promise<string>;
    cancelChallenge(): Promise<void>;
  };
  on: {
    relayUrl(callback: (url: string) => void): void;
    retroarchExit(callback: () => void): void;
  };
  removeAllListeners(channel: string): void;
}

export type NakamaStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type ChallengeStatus = 'idle' | 'sending' | 'received' | 'accepted' | 'connecting' | 'playing' | 'cancelled' | 'error';
```

### Health Check Inteligente (App.tsx)

```typescript
useEffect(() => {
  if (!isAuthenticated) {
    // Solo correr health check si NO estamos autenticados
    let active = true;
    const checkLoop = async () => {
      while (active && !isAuthenticated) {
        await checkHealth();
        await new Promise(r => setTimeout(r, 1000));
      }
    };
    checkLoop();
    return () => { active = false; };
  }
}, [checkHealth, isAuthenticated]);
```

### Hook useToast

```typescript
// hooks/useToast.ts
import { useCallback, useState } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
```

## Logs Relacionados

| Log | Contenido |
|-----|-----------|
| `Logs/01-setup-project-*.md` | Setup inicial del proyecto |
| `Logs/02-integracion-nakama-*.md` | Integración con Nakama |
| `Logs/03-integracion-bore-*.md` | Integración con túnel Bore |
| `Logs/04-anti-lag-runahead-*.md` | Configuración Anti-Lag |
| `Logs/05-mitm-relay-*.md` | Implementación MITM Relay |
| `Logs/XX-plan-mejoras-deepseek-*.md` | (Futuro) Log de implementación de mejoras |

## Pruebas Propuestas

### Tests Unitarios (Vitest)

```
client/src/
├── __tests__/
│   ├── config.test.ts              # Verificar constantes
│   ├── network-utils.test.ts       # Mockear os.networkInterfaces
│   ├── tcp-proxy.test.ts           # Mockear net.createServer
│   ├── process-manager.test.ts     # Mockear child_process.spawn
│   ├── ipc-handlers.test.ts        # Mockear ipcMain.handle
│   └── context/
│       ├── AuthContext.test.tsx     # Mockear electron, Nakama
│       ├── SocialContext.test.tsx   # Mockear Nakama socket
│       └── ChallengeContext.test.tsx # Mockear IPC handlers
├── components/
│   └── __tests__/
│       ├── ChatBox.test.tsx        # Render + interacción
│       ├── ChallengeModal.test.tsx  # Estados del modal
│       └── Header.test.tsx         # Estados online/offline
```

### Tests de Integración (Ampliar existentes)

```javascript
// test_stable_flows.js — Agregar casos:
// - Timeout en waitForPort
// - Reconexión automática de Nakama socket
// - Error handling en proxy (ECONNRESET, ECONNREFUSED)
// - Múltiples invites simultáneos
// - Cancelación de reto durante conexión
```
