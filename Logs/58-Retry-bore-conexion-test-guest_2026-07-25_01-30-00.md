# Log 58: Retry bore + test de conexión en guest bootstrap

**Fecha:** 2026-07-25 01:30 UTC-3

## Cambios realizados

### Archivo modificado: `client/src/main/bootstrap.ts`

**1. Retry automático en `startNakamaBore()` (host)**

Se refactorizó la función original en dos:
- `spawnBoreOnce()` — lógica original de spawn + timeout (ahora 15s)
- `startNakamaBore()` — wrapper async que reintenta hasta 3 veces con delays progresivos (0s, 3s, 5s)

Esto permite que si `bore.pub` está lento o sobrecargado, se reintente automáticamente sin intervención del usuario.

**Código original:**
```typescript
export function startNakamaBore(): Promise<{ success: boolean; url?: string; error?: string }> {
  return new Promise((resolve) => {
    // ... spawn + timeout 12s, sin retry
  });
}
```

**Código nuevo:**
```typescript
function spawnBoreOnce(): Promise<{ success: boolean; url?: string; error?: string }> {
  // ... misma lógica que el original (timeout 15s)
}

export async function startNakamaBore(): Promise<{ success: boolean; url?: string; error?: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(delays[attempt]);
    const result = await spawnBoreOnce();
    if (result.success) return result;
  }
  return { success: false, error: `bore falló tras 3 intentos.` };
}
```

**2. Test de conexión TCP en `handleBootstrapGuest()`**

Se agregó la función `testTcpConnect()` que intenta conectar via TCP socket a `bore.pub:puerto` antes de configurar Nakama remoto. Esto permite detectar temprano si la red del guest no puede alcanzar `bore.pub`, mostrando un mensaje claro:

> "No se puede alcanzar bore.pub:XXXXX — connect ETIMEDOUT. Usá WiFi o Tailscale si estás en datos móviles."

**Código nuevo:**
```typescript
function testTcpConnect(host: string, port: number, timeoutMs = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    // ... connect con timeout
  });
}
```

## Pruebas
- `npm run build`: compila sin errores (23 módulos transformados)
- Lint: 0 errores nuevos sobre los 228 pre-existentes

## Efecto esperado
- Reducción de falsos negativos con bore.pub (host reintenta hasta 3 veces)
- Detección temprana de red celular bloqueando bore.pub (guest ve error claro antes de presionar INSERT COIN)
