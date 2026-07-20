# Plan de Testings — Sistema de Monitoreo y Diagnóstico

## 1. Pruebas Unitarias

### cleanupManager.ts
| ID | Escenario | Expected |
|----|-----------|----------|
| UT-01 | Registrar función y ejecutar cleanupAll | Función se ejecuta |
| UT-02 | Registrar 3 funciones, cleanupAll ejecuta en orden inverso | Última registrada = primera ejecutada |
| UT-03 | Función que lanza error no bloquea las demás | Las otras funciones se ejecutan |
| UT-04 | cleanupAll sin funciones registradas | No lanza error |
| UT-05 | unregisterCleanup remueve función | Función no se ejecuta en cleanupAll |
| UT-06 | getRegisteredCleanups lista nombres | Lista correcta |

### dependencyValidator.ts
| ID | Escenario | Expected |
|----|-----------|----------|
| UT-07 | validateBinaries con archivo existente | exists = true |
| UT-08 | validateBinaries con archivo inexistente | exists = false |
| UT-09 | validateFile con path válido | Retorna true |
| UT-10 | validateFile con path inválido | Retorna false |
| UT-11 | validateBinaries con array vacío | Retorna array vacío |

### resourceMonitor.ts
| ID | Escenario | Expected |
|----|-----------|----------|
| UT-12 | getMetrics con procesos activos | Retorna memory, uptime, processes |
| UT-13 | getMetrics sin procesos | processes = [] |
| UT-14 | getMetrics con proc null | Filtrado, no incluido |
| UT-15 | memory.heapUsed es número positivo | Number.isFinite true |

## 2. Pruebas de Integración

| ID | Escenario | Expected |
|----|-----------|----------|
| IT-01 | IPC get-status retorna ServiceStatus | Objeto con nakama, bore, retroarch, metrics, dependencies |
| IT-02 | IPC get-metrics retorna SystemMetrics | Objeto con memory, uptime, processes |
| IT-03 | IPC validate-dependencies retorna DepResult[] | Array con resultados de binarios |
| IT-04 | StatusContext polling recibe datos | Componente child recibe status actualizado |
| IT-05 | cleanupAll en before-quit mata Nakama | nakamaProcess es null post-cleanup |
| IT-06 | cleanupAll en before-quit mata Bore | boreProcess es null post-cleanup |

## 3. Edge Cases

| ID | Escenario | Expected |
|----|-----------|----------|
| EC-01 | Polling get-status con Nakama caído | nakama = 'error' |
| EC-02 | Polling get-status con todo detenido | Todos 'stopped' |
| EC-03 | cleanupAll llamado 2 veces seguidas | Segunda llamada no lanza error |
| EC-04 | Función async en cleanupAll | Await correcto antes de siguiente función |
| EC-05 | validateBinaries con ruta muy larga | No lanza error |
| EC-06 | getMetrics llamado en medio de garbage collection | No lanza error |

## Criterios de éxito
- 100% de pruebas unitarias pasan
- 100% de pruebas de integración pasan
- 100% de edge cases pasan
- `npm run build` compila sin errores
- `npm run dev` inicia sin errores de consola
