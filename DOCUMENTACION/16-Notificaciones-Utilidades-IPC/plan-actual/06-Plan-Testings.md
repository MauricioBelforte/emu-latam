# Plan de Testings — Notificaciones, Utilidades Compartidas y Seguridad IPC

## 1. Pruebas Unitarias

### Toast Context
| ID | Escenario | Expected |
|----|-----------|----------|
| UT-01 | show() agrega toast a la cola | toasts.length = 1 |
| UT-02 | show() con kind='success' | toast.kind = 'success' |
| UT-03 | 4 toasts seguidos, solo 3 visibles | toasts.length = 3, el más viejo descartado |
| UT-04 | dismiss(id) remueve toast específico | toast con ese id ya no está |
| UT-05 | Auto-dismiss después de durationMs | Toast desaparece automáticamente |
| UT-06 | show() sin durationMs usa default 3000 | setTimeout se llama con 3000 |

### portUtils
| ID | Escenario | Expected |
|----|-----------|----------|
| UT-07 | isPortInUse con puerto libre | Retorna false |
| UT-08 | isPortInUse con puerto ocupado | Retorna true |
| UT-09 | assertPortFree con puerto libre | No lanza error |
| UT-10 | assertPortFree con puerto ocupado | Lanza Error con "Port X is already in use" |
| UT-11 | isPortInUse con host custom | Server escucha en host especificado |

### relayConfigStore
| ID | Escenario | Expected |
|----|-----------|----------|
| UT-12 | write() luego read() retorna mismo url | Valores coinciden |
| UT-13 | read() sin datos previos | Retorna null |
| UT-14 | clear() luego read() | Retorna null |
| UT-15 | Fallback a legacy si userData no existe | read() retorna datos del legacy |

### IPC Channels
| ID | Escenario | Expected |
|----|-----------|----------|
| UT-16 | IPC_WHITELIST contiene LAUNCH_GAME | .has("launch-game") = true |
| UT-17 | IPC_WHITELIST NO contiene canal inventado | .has("fake-channel") = false |
| UT-18 | Todos los valores de IPC_CHANNELS son strings | typeof === "string" |

## 2. Pruebas de Integración

| ID | Escenario | Expected |
|----|-----------|----------|
| IT-01 | IPC assert-port-free con puerto libre | { success: true } |
| IT-02 | IPC assert-port-free con puerto ocupado | { success: false, error: string } |
| IT-03 | IPC get-relay-config sin datos previos | null |
| IT-04 | IPC set-relay-config → get-relay-config | Mismos datos |
| IT-05 | Preload invoke con canal válido | Pasa sin error |
| IT-06 | Preload invoke con canal inválido | Promise rechazada con error de whitelist |

## 3. Edge Cases

| ID | Escenario | Expected |
|----|-----------|----------|
| EC-01 | 100 toasts en 1ms (ráfaga) | Solo 3 visibles, sin memory leak |
| EC-02 | dismiss(id inexistente) | No lanza error |
| EC-03 | portUtils con puerto 0 | Lanza error (puerto inválido) |
| EC-04 | relayConfigStore con legacy corrupto | read() retorna null o maneja el error |
| EC-05 | IPC channel con caracteres especiales | whitelist rechaza por string exacto |

## Criterios de éxito
- 100% de pruebas unitarias pasan
- 100% de pruebas de integración pasan
- `npm run build` compila sin errores
- No hay regresiones en flujos RetroArch/Bore/Tailscale existentes
