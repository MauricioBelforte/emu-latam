# 02 - Análisis Técnico (Actualizado)

> **Módulo:** 18-P2P-Propio
> **Fecha:** 2026-07-26
> **Versión:** 1.2
> **Cambios:** Análisis completo de fallo WAN desde celular. Documentación de bugs encontrados: UPnP mapeaba a IP Tailscale, `waitForRelayAck` escuchaba evento inexistente. Diagnóstico de router ISP.

---

## 1. Análisis del Dominio

### 1.1 Tipos de NAT — Clasificación Práctica

La literatura distingue 4 tipos, pero para efectos prácticos de implementación solo necesitamos 2:

| Tipo real | Nuestra clasificación | Comportamiento |
|:---|:---|:---|
| Full Cone | **Cone** | Puerto público fijo sin importar destino |
| Address Restricted Cone | **Cone** | Puerto público fijo, filtra por IP |
| Port Restricted Cone | **Cone** | Puerto público fijo, filtra por IP:puerto |
| Symmetric / CGNAT | **Symmetric** | Puerto público CAMBIA por destino |

**¿Por qué solo 2 buckets?** Distinguir Full/Restricted/Port-Restricted Cone requiere que el servidor STUN implemente `CHANGE-REQUEST` (RFC 3489). La mayoría de los STUN públicos actuales implementan RFC 5389/8489 que no lo exigen. En la práctica, la decisión es binaria: Cone (funciona hole punching) vs Symmetric (requiere relay).

### 1.2 Detección de Symmetric con 2 STUN servers

Consultar 2 servidores STUN distintos desde el mismo socket. Si el puerto público reportado es el mismo → Cone. Si es distinto → Symmetric. Simple, confiable, sin servidor propio.

---

## 2. Diagnóstico de Fallo WAN desde Celular (26-Jul-2026)

### 2.1 Setup del test
- **Host:** PC con Windows, WiFi hogareño, PowerShell como administrador
- **Guest:** Laptop con datos celulares (4G), sin WiFi
- **ISP del host:** Proveedor de internet con router Fibra Óptica
- **Puerto P2P:** 53084/UDP (en un intento), 55612/UDP (en otro), 62979/UDP (en otro)

### 2.2 Resultados

| Componente | Resultado | Evidencia |
|:---|:---|:---|
| STUN (Host) | ✅ IP pública: 198.12.40.29, NAT: Cone | Log `NAT: cone → 198.12.40.29:53084` |
| STUN (Guest 4G) | ✅ Detecta IP y puerto correctos | Funciona internamente en `startJoinWan` |
| UPnP (nat-upnp) | ✅ "Puerto 53084/UDP abierto: EmuLatam-P2P" | Log UPnP |
| Windows Firewall | ✅ "Regla creada: EmuLatam-P2P (53084/UDP)" | Log Firewall |
| UPnP mapping (local IP) | ⚠️ Mapeaba a 100.98.148.11 (Tailscale) inicialmente; corregido a 192.168.1.14 | Fix commit 9c64b80 |
| Puertos UPnP (public vs private) | ⚠️ Originalmente usaba solo puerto STUN; corregido para usar puerto bound del transporte | Fix commit 089d698 |
| Port check desde internet | ❌ **Puerto 53084 CERRADO** | `yougetsignal.com` |
| RELAY_REQUEST llega al host? | ❌ No (`[P2P-RELAY] RELAY_REQUEST` no aparece) | Log host |
| Conexión LAN (guest WiFi) | ✅ Funciona perfecto | Broadcast + directo |
| **Bug: waitForRelayAck** | ❌ Escuchaba `'message'` en vez de `'raw-message'` → siempre timeout | Fix commit 8a8b177 |
| Conexión WAN desde celular | ❌ RELAY_ACK timeout | Error App.tsx:1211 |

### 2.3 Causa Raíz del Fallo WAN

**El router del ISP no aplica el mapping UPnP.** Aunque `nat-upnp` devuelve éxito (el router acepta la solicitud), el puerto no se abre realmente. Esto se confirmó con `yougetsignal.com` que reporta el puerto como cerrado.

**Posibles causas:**
1. El router tiene UPnP habilitado pero no aplica mappings (bug de firmware)
2. El ISP bloquea UPnP a nivel de firmware
3. El router requiere reinicio después de aplicar cambios UPnP
4. El puerto está siendo bloqueado por otro firewall/router aguas arriba (CGNAT del ISP)

### 2.4 Bugs Encontrados y Corregidos

| Bug | Archivo | Descripción | Fix |
|:---|:---|:---|:---|
| UPnP local IP = Tailscale | `upnp.ts`, `p2pBridge.ts` | `nat-upnp` auto-detectaba 100.98.148.11 en vez de 192.168.1.14 | Se agregó `localIp` param |
| UPnP private port = STUN port | `upnp.ts`, `p2pBridge.ts` | `private` port = `public` port (STUN), no el bound port del transporte | Se agregó `privatePort` param |
| waitForRelayAck evento erróneo | `P2PManager.ts:382` | `transport.on('message')` pero el transporte emite `'raw-message'` | Cambiado a `'raw-message'` |
| Firewall regla para STUN port | `p2pBridge.ts` | Se creaba regla para puerto STUN, no para el bound port real | Cambiado a `localPort` |

---

## 3. Arquitectura de UPnP + Firewall

### 3.1 UPnP (`client/src/main/services/upnp.ts`)

```
tryMapPort(port, protocol, description, ttl, localIp?, privatePort?)
  → Crea mapping en router: { public: port, private: privatePort??port, local: localIp }
  → Retorna true si el router acepta (aunque no aplique)
```

- Dependencia: `nat-upnp` v1.1.1 (37 packages instalados)
- El router siempre responde OK aunque no aplique el mapping
- `cleanupAllMappings()` se llama al cerrar sala

### 3.2 Windows Firewall (`netsh` en `p2pBridge.ts`)

```
netsh advfirewall firewall add rule name="EmuLatam-P2P" dir=in action=allow protocol=UDP localport=<localPort>
```

- Requiere PowerShell como administrador
- La regla se crea exitosamente (confirma que el Firewall no es el problema)
- Se crea para el puerto local bound del transporte

### 3.3 Flujo Completo de Apertura de Puertos

```
handleP2PHost()
  → manager.startHost() → UDPTransport.bind(0) → STUN detecta pubIp:pubPort
  → Obtiene transport.port (bound local)
  → UPnP: public=pubPort, private=localPort, local=lanIp
  → Firewall: regla para localPort
  → guest conecta a pubIp:pubPort → router reenvía a lanIp:localPort → firewall permite → transporte recibe
```

---

## 4. Dependencias npm

```json
{
  "dependencies": {
    "stun": "^1.0.10",
    "nat-upnp": "^1.1.1"
  },
  "optionalDependencies": {
    "tweetnacl": "^1.0.3"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "vitest": "^2.x"
  }
}
```

`nat-upnp` se agregó en julio 2026 para el mapeo automático de puertos.

---

## 5. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|:---|:---|:---|
| Router ISP no aplica UPnP | WAN no funciona | Mensaje en UI: "usá Tailscale o Sala Pública" |
| Firewall corporativo bloquea UDP | Paquetes descartados | Excepción de firewall en instalación |
| Guest malicioso en relay | Security | Validación de sessionToken + solo reenvía a peers registrados vía Nakama |
| IP pública cambia | Desconexión | Keepalive detecta pérdida, se puede re-señalizar |
| CGNAT en ISP del host | UPnP inútil (no hay router propio) | Usar Tailscale o Bootstrap |
| NAT simétrica en guest (4G) | Hole punch falla | Relay fallback automático (RELAY_REQUEST/ACK) |
| **Bug: waitForRelayAck** | RELAY_ACK siempre timeout | ✅ Corregido (8a8b177) |

---

## 6. Lecciones Aprendidas

1. **UPnP no es confiable**: Aunque la librería devuelva éxito, el router puede ignorar el mapping. Verificar con port checker externo.
2. **Windows Firewall no es el problema**: Con admin, `netsh` crea la regla correctamente. Si el paquete no llega, es el router.
3. **Tailscale IP en UPnP**: Al enumerar interfaces de red, la IP de Tailscale (100.x.x.x) puede aparecer primero. Excluirla explícitamente.
4. **Puerto bound vs STUN port**: El transporte se bindea a puerto 0 (aleatorio), pero STUN detecta el puerto post-NAT. UPnP necesita el puerto bound real como `private`.
5. **Evento incorrecto en UDPTransport**: El transporte extiende EventEmitter y emite `raw-message` (no `message`). Escuchar `message` nunca funciona.
6. **Para WAN real**: Sin control sobre el router del ISP, la solución práctica es Tailscale o un VPS con IP pública fija.
