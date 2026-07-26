# 06 — Plan de Testings: NAT Traversal (STUN + Hole Punching)

## Pruebas Unitarias

### 1. STUN Binding Request
- **ID:** UT-01
- **Descripción:** Verificar que `createStunBindingRequest()` genera un buffer válido según RFC 5389
- **Criterio:** Buffer de 20 bytes, magic cookie = 0x2112A442, type = 0x0001
- **Script:** `test_nat_traversal.js`

### 2. Parse STUN Response
- **ID:** UT-02
- **Descripción:** Verificar que `parseStunResponse()` extrae IP:puerto correctamente
- **Criterio:** Dado un buffer de respuesta STUN simulada, debe retornar IP y puerto
- **Script:** `test_nat_traversal.js`

### 3. STUN Timeout
- **ID:** UT-03
- **Descripción:** Verificar que `discoverEndpoint()` lanza/timeout si STUN no responde
- **Criterio:** Timeout después de 3s (configurable)
- **Script:** `test_nat_traversal.js`

### 4. Hole Punch Timeout
- **ID:** UT-04
- **Descripción:** Verificar que `attemptHolePunch()` retorna success=false si no hay respuesta
- **Criterio:** Timeout después de 5s, retorna `{ success: false }`
- **Script:** `test_nat_traversal.js`

### 5. NAT Simétrica Detection
- **ID:** UT-05
- **Descripción:** Si dos requests STUN consecutivas devuelven puertos distintos, detectar NAT simétrica
- **Criterio:** `natType === "symmetric"` cuando puertos difieren
- **Script:** `test_nat_traversal.js`

### 6. Cleanup
- **ID:** UT-06
- **Descripción:** `closeAll()` cierra todos los sockets y timers
- **Criterio:** Sin fugas de recursos, sockets.destroy() llamado en todos
- **Script:** `test_nat_traversal.js`

## Pruebas de Integración

### 7. Hole Punch localhost
- **ID:** IT-01
- **Descripción:** Dos sockets UDP en misma PC simulan hole punching exitoso
- **Criterio:** Ambos sockets reciben datos del otro después de enviar simultáneamente
- **Script:** `test_nat_traversal.js` (async)

### 8. Keep-Alive mantiene conexión
- **ID:** IT-02
- **Descripción:** Iniciar keep-alive, verificar que se envían paquetes periódicos
- **Criterio:** Mínimo 2 paquetes en 30s
- **Script:** Manual (observar logs)

### 9. Fallback a bore
- **ID:** IT-03
- **Descripción:** Si hole punch falla, el ChallengeContext ejecuta el método bore
- **Criterio:** Se llama a `handleBoreMethod()` o equivalente sin error
- **Script:** Manual (mockear natTraversal)

## Casos Límite

| ID | Escenario | Esperado |
|:---|:----------|:---------|
| EC-01 | STUN server caído | Timeout → fallback a bore |
| EC-02 | NAT simétrica detectada | Saltear hole punch → bore inmediato |
| EC-03 | Hole punch exitoso pero keep-alive falla | Reintento único, si persiste → disconnect |
| EC-04 | Ambos peers detrás del mismo NAT | Hole punch funciona (NAT loopback) |
| EC-05 | Puerto destino ocupado | Error localPort → fallback a bore |

## Criterios de Éxito Global

- [ ] UT-01 a UT-06: 100% pasan
- [ ] IT-01: Hole punch localhost exitoso
- [ ] IT-03: Fallback a bore sin crash
- [ ] Regresión: test_stable_flows.js 50/51
- [ ] Build: npm run dev sin errores
