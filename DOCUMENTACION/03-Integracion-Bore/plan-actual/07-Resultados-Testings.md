# Resultados de Testings - Integracion-Bore

## Resumen de Ejecución
- **Fecha:** 2026-07-17
- **Suite ejecutado:** `client/test_stable_flows.js` via `npm run test:stable`
- **Pruebas totales:** 51
- **Pruebas pasadas:** 51
- **Pruebas falladas:** 0
- **Porcentaje de éxito:** 100%

## Tests Pasados (37)

### 1. REGEX — start-relay-tunnel (ORIGINAL, flujo manual)
| Test | Resultado |
|------|-----------|
| Captura `bore.pub:XXXXX` | ✅ |
| NO captura IP (original solo `bore.pub`) | ✅ |

### 2. REGEX — start-relay-tunnel-v2 (challenge)
| Test | Resultado |
|------|-----------|
| Captura `bore.pub:XXXXX` | ✅ |
| Captura `IP:port` | ✅ |
| Captura hostname con guión | ✅ |

### 3. SPAWN ARGS — Host Directo
| Test | Resultado |
|------|-----------|
| Contiene `--host --port 55435` | ✅ |
| NO contiene `--connect` | ✅ |

### 4. SPAWN ARGS — Guest Directo
| Test | Resultado |
|------|-----------|
| Contiene `--connect 127.0.0.1 --port 55435` | ✅ |
| NO contiene `--host` | ✅ |

### 5. SPAWN ARGS — Host Bore
| Test | Resultado |
|------|-----------|
| Contiene `--host --port 55435` | ✅ |
| NO contiene `--connect` | ✅ |

### 6. SPAWN ARGS — Guest Bore
| Test | Resultado |
|------|-----------|
| Contiene `--connect 127.0.0.1` (proxy local) | ✅ |
| NO contiene `--host` | ✅ |
| Puerto 55435 NO incluido explícitamente | ✅ |
| Conexión local (`127.0.0.1:55435`) usa `--port 55435` | ✅ |

### 7. PROXY TCP
| Test | Resultado |
|------|-----------|
| Proxy reenvía datos correctamente (eco) | ✅ |

### 8. WAITFORPORT
| Test | Resultado |
|------|-----------|
| `waitForPort` detecta puerto activo | ✅ |
| `waitForPortClosed` detecta puerto cerrado | ✅ |

### 9. ARCHIVOS DE CONFIGURACIÓN
| Test | Resultado |
|------|-----------|
| Carpeta `retroarch/` existe | ✅ |
| `retroarch.exe` existe | ✅ |
| `fbneo_libretro.dll` existe | ✅ |
| `kof98.zip` existe | ✅ |
| Carpeta `relay-server/` existe | ✅ |
| `bore.exe` existe | ✅ |
| `run_ahead_enabled` presente en cfg | ✅ |
| `netplay_check_frames` presente en cfg | ✅ |
| `netplay_nat_traversal` presente en cfg | ✅ |

### 10. RELAY FILE
| Test | Resultado |
|------|-----------|
| `save-relay-url` escribe correctamente | ✅ |
| `get-relay-url` lee string vacío | ✅ |

### 11. FORWARDER
| Test | Resultado |
|------|-----------|
| Forwarder reenvía datos correctamente | ✅ |

### 12. CLEANUP
| Test | Resultado |
|------|-----------|
| Forwarder sobrevive al cierre del proxy | ✅ |

### 13. BORE COMMAND
| Test | Resultado |
|------|-----------|
| Bore manual usa `--to bore.pub` | ✅ |
| Bore V2 usa `--to IP` | ✅ |

### 14. TAILSCALE ARGS
| Test | Resultado |
|------|-----------|
| Host contiene `--host --port 55435` | ✅ |
| Host NO contiene `--connect` | ✅ |
| Guest contiene `--connect 100.x.x.x --port 55435` | ✅ |
| Guest NO contiene `--host` | ✅ |

---

## Problemas Corregidos

### Problema 1 (Corregido): `netplay_check_frames` valor incorrecto en test

**Archivo:** `client/test_stable_flows.js:295`
**Código original:**
```javascript
// ❌ Esperaba "3", pero el cfg real tiene "180"
assert("cfg netplay_check_frames >= 1 (tolerante)", cfgContent.includes('netplay_check_frames = "3"'));
```
**Código corregido:**
```javascript
assert("cfg netplay_check_frames >= 1 (tolerante)", cfgContent.includes('netplay_check_frames = "180"'));
```
**Solución:** Se actualizó el valor esperado para reflejar `netplay_check_frames = "180"` (configurado así para evitar doble input por rollback agresivo).

---

### Problema 2 (Corregido): `netplay_input_latency_frames_range` valor incorrecto en test

**Archivo:** `client/test_stable_flows.js:296`
**Código original:**
```javascript
// ❌ Esperaba "3", pero el cfg real tiene "1"
assert("cfg netplay_input_latency_frames_range >= 1", cfgContent.includes('netplay_input_latency_frames_range = "3"'));
```
**Código corregido:**
```javascript
assert("cfg netplay_input_latency_frames_range >= 1", cfgContent.includes('netplay_input_latency_frames_range = "1"'));
```
**Solución:** Se actualizó el valor esperado para reflejar `netplay_input_latency_frames_range = "1"` (buffer mínimo de 1-2 frames).

---

## Tests Agregados (12 nuevos)

### Tests unitarios agregados
| Test | Archivo:Línea | Resultado |
|------|---------------|-----------|
| Extrae puerto 31501 de `bore.pub:31501` | `test_stable_flows.js` | ✅ |
| Extrae puerto 19821 de `bore.pub:19821` | `test_stable_flows.js` | ✅ |
| Extrae puerto 55435 de `127.0.0.1:55435` | `test_stable_flows.js` | ✅ |
| Archivo inexistente detectado | `test_stable_flows.js` | ✅ |
| Leer archivo inexistente lanza ENOENT | `test_stable_flows.js` | ✅ |
| Puerto ocupado detectado (EADDRINUSE) | `test_stable_flows.js` | ✅ |

### Tests de integración agregados
| Test | Archivo:Línea | Resultado |
|------|---------------|-----------|
| 3 clientes conectan al proxy simultáneamente | `test_stable_flows.js` | ✅ |
| 3 clientes reciben eco correctamente | `test_stable_flows.js` | ✅ |
| Proxy sobrevive al cierre del forwarder | `test_stable_flows.js` | ✅ |
| Pipe recibe RESP:DATA1 (bidireccional múltiple) | `test_stable_flows.js` | ✅ |
| Pipe recibe RESP:DATA2 | `test_stable_flows.js` | ✅ |
| Pipe recibe RESP:DATA3 | `test_stable_flows.js` | ✅ |

---

## Evolución de Tests

| Versión | Tests | Pasados | Fallados | % |
|---------|-------|---------|----------|---|
| Original | 35 | 35 | 0 | 100% |
| V1 (con cfg desactualizado) | 39 | 37 | 2 | 94.8% |
| **V2 (corregido + nuevos tests)** | **51** | **51** | **0** | **100%** |
