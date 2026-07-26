# Log 64 — Implementación NAT Traversal (STUN + Hole Punching)

**Fecha:** 2026-07-26 04:50:00

---

## Resumen

Se implementó el módulo `natTraversal.ts` con STUN (RFC 5389) + UDP hole punching
+ keep-alive, integrado en el flujo de retos (ChallengeContext) como método
prioritario antes de usar bore relay.

## Cambios Realizados

| Archivo | Cambio |
|:--------|:--------|
| `client/src/main/natTraversal.ts` | **Creado** — STUN client, hole punch, keep-alive, bridge |
| `client/src/main/index.ts` | + import natTraversal + 4 IPC handlers + cleanup |
| `client/src/main/services/ipcChannels.ts` | + 4 canales NAT_TRAVERSAL_* |
| `client/src/context/ChallengeContext.tsx` | + natPendingRef + flujo NAT en host/guest + guest_ready NAT |
| `client/test_nat_traversal.js` | **Creado** — 37 tests (unitarios + integración + archivos) |
| `DOCUMENTACION/22-NAT-Traversal-STUN-HolePunching/plan-actual/*` | 7 archivos actualizados con resultados |

## Arquitectura

```
[Peer A] → STUN → descubre endpointA (IP:puerto público)
[Peer B] → STUN → descubre endpointB
[Host] envía conn_info con endpointA
[Guest] inicia hole punch hacia endpointA + envía guest_ready con endpointB
[Host] inicia hole punch hacia endpointB
      ↕ (simultáneo)
  Conexión P2P directa (sin relay!)
      ↓
  GGPO launch con bridge local (127.0.0.1:bridgePort)

Si falla → alerta "Conexión P2P directa no disponible" + reintentar
```

## IPC Handlers

| Canal | Función |
|:------|:--------|
| `nat-traversal-discover` | STUN discovery + detección NAT simétrica |
| `nat-traversal-punch` | UDP hole punching hacia peer |
| `nat-traversal-keepalive` | Keep-alive cada 15s |
| `nat-traversal-stop` | Cleanup completo |

## Tests

- `test_nat_traversal.js`: 37/37 ✅
- `npm run dev`: compilación exitosa, `[CLEANUP] Registrado: nat-traversal`
- Regresión flujos estables: no afectados

## Limitaciones (v1)

- Solo aplica a GGPO (UDP). RA (TCP) sigue usando bore.
- NAT simétrica detectada → saltea hole punch (sin fallback automático aún)
- Sin prueba WAN real — requiere test con 2 PCs en distintas redes
- Bridge de datos requiere `createBridge()` que no está integrado en ChallengeContext
  aún (el hole punch verifica conectividad, GGPO usa el socket directo)
