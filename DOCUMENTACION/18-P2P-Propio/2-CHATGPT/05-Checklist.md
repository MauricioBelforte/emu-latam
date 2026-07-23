# 05 — Checklist de Implementación

**Módulo:** 18-P2P-Propio  
**Fecha:** 2026-07-23

## Leyenda

- **Baja:** implementación localizada.
- **Media:** requiere integración entre módulos.
- **Alta:** requiere pruebas de red o cambios arquitectónicos.

---

# Fase 0 — Preparación

- [ ] Crear módulo `src/main/p2p/` — **Baja**
- [ ] Definir `types.ts` — **Baja**
- [ ] Definir `Protocol.ts` — **Baja**
- [ ] Definir versión inicial del protocolo — **Baja**
- [ ] Crear configuración central P2P — **Baja**
- [ ] Documentar variables de configuración — **Baja**

**Dependencias:** ninguna.

---

# Fase 1 — Servicio UDP básico

- [ ] Implementar `P2PService` — **Media**
- [ ] Crear socket `node:dgram` — **Baja**
- [ ] Usar puerto dinámico `:0` — **Baja**
- [ ] Obtener puerto asignado — **Baja**
- [ ] Liberar socket correctamente — **Baja**
- [ ] Manejar errores de bind — **Baja**

**Dependencias:** Fase 0.

---

# Fase 2 — LAN

- [ ] Enumerar interfaces IPv4 — **Baja**
- [ ] Implementar cálculo de subred — **Media**
- [ ] Comparar candidatos — **Media**
- [ ] Implementar UDP handshake — **Media**
- [ ] Confirmar `LAN_DIRECT` — **Media**

**Tests:**

- [ ] Dos IP en misma /24 — **Baja**
- [ ] Dos IP en redes distintas — **Baja**
- [ ] Múltiples interfaces — **Media**
- [ ] Falso positivo sin respuesta — **Media**

**Dependencias:** Fase 1.

---

# Fase 3 — Nakama signaling

- [ ] Definir mensaje `p2p_announce` — **Baja**
- [ ] Definir `p2p_candidate` — **Baja**
- [ ] Definir `p2p_connect` — **Baja**
- [ ] Definir `p2p_connected` — **Baja**
- [ ] Integrar con match channel — **Media**
- [ ] Validar `roomId` — **Baja**
- [ ] Validar `peerId` — **Baja**
- [ ] Validar `version` — **Baja**

**Dependencias:** Fase 1.

---

# Fase 4 — STUN y NAT

- [ ] Seleccionar librería STUN compatible — **Media**
- [ ] Auditar versión y mantenimiento — **Media**
- [ ] Implementar consulta STUN — **Media**
- [ ] Obtener endpoint público — **Media**
- [ ] Implementar clasificación operativa — **Alta**
- [ ] Registrar NAT como diagnóstico — **Baja**

**Tests:**

- [ ] NAT abierto
- [ ] NAT cone
- [ ] NAT restringido
- [ ] NAT simétrico
- [ ] STUN no disponible

**Dependencias:** Fase 1.

---

# Fase 5 — Hole punching

- [ ] Implementar `HolePuncher` — **Alta**
- [ ] Implementar probes UDP — **Media**
- [ ] Implementar retries — **Media**
- [ ] Implementar timeout — **Baja**
- [ ] Validar session ID — **Baja**
- [ ] Validar peer ID — **Baja**
- [ ] Confirmar conexión directa — **Media**
- [ ] Implementar fallback — **Media**

**Tests:**

- [ ] Direct/direct
- [ ] Cone/cone
- [ ] Restricted/restricted
- [ ] Punching timeout
- [ ] Endpoint inválido
- [ ] Paquetes fuera de sesión

**Dependencias:** Fases 1, 3 y 4.

---

# Fase 6 — Relay Host

- [ ] Implementar `RelaySession` — **Media**
- [ ] Implementar tabla de peers — **Media**
- [ ] Registrar endpoint — **Media**
- [ ] Implementar forwarding — **Media**
- [ ] Aislar sesiones — **Alta**
- [ ] Limitar peers a 16 — **Baja**
- [ ] Implementar expiración — **Media**
- [ ] Medir latencia — **Media**

**Tests:**

- [ ] A → B
- [ ] B → A
- [ ] A → B/C/D
- [ ] Dos sesiones simultáneas
- [ ] 16 peers
- [ ] Peer desconectado

**Dependencias:** Fases 1, 3 y 5.

---

# Fase 7 — Keepalive

- [ ] NAT keepalive 15 s — **Baja**
- [ ] Heartbeat 5 s — **Baja**
- [ ] Timeout 30 s — **Baja**
- [ ] Detección de pérdida — **Media**
- [ ] Limpieza de recursos — **Media**
- [ ] Reconexión opcional — **Alta**

**Dependencias:** Fase 5.

---

# Fase 8 — State Machine

- [ ] Implementar estados — **Media**
- [ ] Implementar transiciones — **Media**
- [ ] Rechazar transiciones inválidas — **Baja**
- [ ] Emitir eventos — **Media**
- [ ] Registrar razón de fallo — **Baja**

Estados:

```text
IDLE
DISCOVERING
LAN_CHECK
PUNCHING
DIRECT_CONNECTED
RELAY_CONNECTING
RELAY_CONNECTED
DISCONNECTED
FAILED
```

**Dependencias:** Fases 2–7.

---

# Fase 9 — IPC

- [ ] `p2p.start` — **Baja**
- [ ] `p2p.stop` — **Baja**
- [ ] `p2p.connect` — **Media**
- [ ] `p2p.disconnect` — **Baja**
- [ ] `p2p.getStatus` — **Baja**
- [ ] Eventos de conexión — **Media**
- [ ] Eventos de error — **Baja**

**Dependencias:** Fase 8.

---

# Fase 10 — Integración RETAR

- [ ] Conectar botón RETAR con IPC — **Baja**
- [ ] Mostrar spinner — **Baja**
- [ ] Mostrar estado de conexión — **Baja**
- [ ] Mostrar fallback relay — **Baja**
- [ ] Lanzar RetroArch tras conexión — **Media**
- [ ] Verificar endpoint de gameplay — **Alta**
- [ ] Mantener socket RetroArch separado — **Media**

**Dependencias:** Fases 8 y 9.

---

# Fase 11 — Multi-peer

- [ ] Host + 2 guests — **Media**
- [ ] Host + 4 guests — **Media**
- [ ] Host + 8 guests — **Alta**
- [ ] Host + 16 guests — **Alta**
- [ ] Mezcla direct + relay — **Alta**
- [ ] Pruebas de saturación — **Alta**

**Dependencias:** Fase 6.

---

# Fase 12 — Seguridad

- [ ] Validar `sessionId` — **Baja**
- [ ] Validar `peerId` — **Baja**
- [ ] Validar protocolo — **Baja**
- [ ] Rechazar peers desconocidos — **Media**
- [ ] Evitar relay entre sesiones — **Alta**
- [ ] Limitar tamaño de paquetes — **Baja**
- [ ] Rate limiting básico — **Media**

**Dependencias:** Fases 3 y 6.

---

# Fase 13 — Host disconnect

## MVP

- [ ] Detectar host offline — **Media**
- [ ] Finalizar sesión — **Baja**
- [ ] Devolver usuarios al lobby — **Baja**

## Futuro

- [ ] Elegir nuevo host — **Alta**
- [ ] Reanunciar candidatos — **Alta**
- [ ] Reiniciar negociación — **Alta**
- [ ] Reiniciar RetroArch — **Alta**

**Dependencias:** Fases 7 y 8.

---

# Fase 14 — Testing

## Unit tests

- [ ] Packet codec
- [ ] State machine
- [ ] LAN subnet calculation
- [ ] Peer registry
- [ ] Relay routing
- [ ] Keepalive timers

**Complejidad:** Media.

## Integration tests

- [ ] Host/guest LAN
- [ ] Direct P2P
- [ ] Relay
- [ ] Disconnect
- [ ] Multiple peers

**Complejidad:** Alta.

## Network tests

- [ ] NAT abierto
- [ ] NAT cone
- [ ] NAT restringido
- [ ] NAT simétrico
- [ ] Cambios de endpoint
- [ ] Pérdida de paquetes
- [ ] Alta latencia

**Complejidad:** Alta.

---

# Fase 15 — Documentación

- [ ] Documentar protocolo — **Media**
- [ ] Documentar IPC — **Baja**
- [ ] Documentar configuración — **Baja**
- [ ] Documentar troubleshooting — **Media**
- [ ] Documentar métricas — **Media**
- [ ] Documentar limitaciones NAT — **Baja**

---

# Dependencias generales

```text
Fase 0
  ↓
Fase 1
  ├── Fase 2
  ├── Fase 3
  └── Fase 4
         ↓
      Fase 5
         ↓
      Fase 6
         ↓
      Fase 7
         ↓
      Fase 8
         ↓
      Fase 9
         ↓
      Fase 10

Fase 6 → Fase 11
Fase 8 → Fase 13
Fases 1–10 → Fase 14
Fases 1–14 → Fase 15
```

---

# MVP recomendado

El MVP mínimo debe contener:

```text
[1] UDP service
[2] LAN detection
[3] Nakama signaling
[4] STUN
[5] Hole punching
[6] Direct P2P
[7] Host relay
[8] Keepalive
[9] IPC
[10] RETAR integration
```

Host migration y relay externo quedan para fases posteriores.

---

# Criterio de salida del MVP

El MVP estará listo cuando:

- [ ] LAN funciona.
- [ ] P2P directo funciona en escenarios compatibles.
- [ ] Relay funciona cuando el host es alcanzable.
- [ ] RetroArch funciona sin modificaciones.
- [ ] Hasta 16 peers son gestionados correctamente.
- [ ] No existen cruces entre sesiones.
- [ ] Los fallos se muestran correctamente en UI.
- [ ] Tests automatizados pasan.
- [ ] La documentación está actualizada.

> Ver detalles de implementación en `04-Codigo.md`.
