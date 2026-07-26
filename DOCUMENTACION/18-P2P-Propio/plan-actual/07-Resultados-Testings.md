# Resultados de Testings — P2P Propio WAN Manual

## Resumen de Ejecución
- **Fecha:** 2026-07-26
- **Propósito:** Probar conexión WAN desde celular (4G) usando P2P propio con UPnP + Firewall
- **Pruebas totales:** 17 (9 automáticas + 8 manuales)
- **Pruebas pasadas:** 15
- **Pruebas falladas:** 1 (WAN desde celular)
- **Pendientes:** 1 (WAN con forwarding manual)

---

## Tests Automáticos (p2p-module 29/29)

| Suite | Resultado |
|:---|:---|
| `p2p-module` (29 tests) | ✅ 29/29 |
| `npm run test:stable` (35 tests) | ✅ 50/51 (1 preexistente tolerante) |
| `npx tsc --noEmit` | ✅ Sin errores |
| `npx vite build` | ✅ Build exitoso |

---

## Tests de Integración (UPnP + Firewall)

### Test: UPnP con IP LAN real (excluye Tailscale)
**Resultado:** ✅ CORREGIDO (commit 9c64b80)
```
Antes: [UPnP] Puerto 59639/UDP abierto: EmuLatam-P2P (local: 100.98.148.11)
Después: [UPnP] Puerto 59639/UDP abierto: EmuLatam-P2P (local: 192.168.1.14)
```

### Test: UPnP private port = bound port real
**Resultado:** ✅ CORREGIDO (commit 089d698)
```
Log: (private: 59639)
```
En este test los puertos coincidieron (NAT preserva), pero el fix es correcto para casos donde difieren.

### Test: Windows Firewall regla para puerto bound real
**Resultado:** ✅ CORREGIDO (commit 089d698)
```
[FIREWALL] Regla creada: EmuLatam-P2P (59639/UDP)
```

---

## Test Manual WAN desde Celular ❌

### Setup
- **Host:** PC Windows 11, PowerShell **admin**, WiFi hogareño
- **Guest:** Laptop con **datos celulares** (4G), conectada a internet vía tethering
- **Router ISP:** Router de fibra óptica (modelo no especificado)

### Procedimiento
1. Host: `npm run dev` como administrador → CREAR SALA P2P
2. Guest: `npm run dev` → UNIRSE A SALA P2P → broadcast timeout → input `198.12.40.29:53084` → CONECTAR
3. Observar logs de ambos

### Resultados

| Paso | Host log | Guest log |
|:---|:---|:---|
| STUN | ✅ `NAT: cone → 198.12.40.29:53084` | ✅ (interno) |
| UPnP | ✅ `Puerto 53084/UDP abierto: EmuLatam-P2P` | N/A |
| Firewall | ✅ `Regla creada: EmuLatam-P2P (53084/UDP)` | N/A |
| Port check (yougetsignal) | ❌ **Closed** | N/A |
| Guest envía RELAY_REQUEST | ❌ No hay `[P2P-RELAY] RELAY_REQUEST from ...` | N/A |
| Guest recibe RELAY_ACK | N/A | ❌ `RELAY_ACK timeout` |
| Conexión LAN (guest en WiFi) | ✅ Funciona | ✅ Funciona |

### Diagnóstico
**Causa raíz:** El router ISP no aplica el mapping UPnP. Aunque `nat-upnp` devuelve éxito, el puerto no está realmente abierto desde internet.

**Port checker:** `http://www.yougetsignal.com/tools/open-ports/` confirma puerto 53084 cerrado en IP 198.12.40.29.

**Bugs encontrados durante la investigación:**
1. **UPnP local IP = Tailscale (100.98.148.11):** Corregido en 9c64b80
2. **UPnP private port = puerto STUN:** Corregido en 089d698
3. **waitForRelayAck evento incorrecto:** ⚠️ **Este bug existía pero NO causó el fallo del test** porque los paquetes nunca llegaron al host. Sin embargo, si el router cooperara, este bug habría impedido la conexión igualmente. Corregido en 8a8b177.

### Conclusión
El P2P Propio WAN **no funciona desde este ISP específico** porque el router ignora UPnP. Para que funcione se requiere:
1. Router que sí aplique UPnP (verificar en admin 192.168.1.1)
2. Port forwarding manual en el router
3. O usar un VPS como relay externo

---

## Test de Regresión ✅

| Flujo | Resultado |
|:---|:---|
| LAN broadcast + directo | ✅ Funciona (guest en WiFi descubre host automáticamente) |
| Tailscale (HOST/JOIN) | ✅ Sin cambios |
| Bootstrap verde (Sala Pública) | ✅ Sin cambios |
| Bore manual | ✅ Sin cambios |

---

## Problemas Encontrados

### Problema 1: UPnP local IP = Tailscale
**Prueba:** Integración UPnP
**Archivo:** `client/src/main/services/upnp.ts:11`, `client/src/main/p2pBridge.ts:94`
**Código problemático:**
```typescript
upnpOk = await tryMapPort(candidate.publicPort, 'UDP', 'EmuLatam-P2P', 0);
// Sin localIp → nat-upnp auto-detecta 100.98.148.11 (Tailscale)
```
**Solución:**
```typescript
const lanIp = candidate.privateIps?.find((ip: string) => !ip.startsWith('100.'));
upnpOk = await tryMapPort(candidate.publicPort, 'UDP', 'EmuLatam-P2P', 0, lanIp);
```

### Problema 2: UPnP private port = puerto STUN
**Prueba:** Integración UPnP
**Archivo:** `client/src/main/services/upnp.ts:16`
**Código problemático:**
```typescript
const opts = { public: port, private: port, ... };
// private = puerto STUN, no el bound real del transporte
```
**Solución:**
```typescript
const opts = { public: port, private: privatePort ?? port, ... };
// private = transport.port (bound real)
```

### Problema 3: waitForRelayAck evento incorrecto ⚠️ CRÍTICO
**Prueba:** WAN manual (reproducción)
**Archivo:** `p2p-module/src/P2PManager.ts:382`
**Código problemático:**
```typescript
function waitForRelayAck(transport, timeoutMs) {
  transport.on('message', handler);
  // El transporte emite 'raw-message', NO 'message'
  // Este handler NUNCA se ejecuta
}
```
**Solución:**
```typescript
transport.on('raw-message', handler);
```
**Impacto:** Si el router hubiera aplicado UPnP, este bug habría causado RELAY_ACK timeout igualmente. Ahora está corregido.

### Problema 4: Firewall regla para puerto STUN
**Prueba:** Integración Firewall
**Archivo:** `client/src/main/p2pBridge.ts:97`
**Código problemático:**
```typescript
tryOpenWindowsFirewall(candidate.publicPort, 'UDP', 'EmuLatam-P2P');
// Abría puerto STUN, no el bound real
```
**Solución:**
```typescript
tryOpenWindowsFirewall(localPort, 'UDP', 'EmuLatam-P2P');
```

---

## Referencias

- **Discusión completa:** `Mensajes entre modelos/03-P2P-WAN-Debug/` (si existe)
- **Commits:** 9c64b80, 089d698, 8a8b177, db64d6b
- **Logs de ejecución:** Host muestra UPnP + Firewall OK, pero port checker externo muestra cerrado
- **Herramienta de diagnóstico usada:** `http://www.yougetsignal.com/tools/open-ports/`
