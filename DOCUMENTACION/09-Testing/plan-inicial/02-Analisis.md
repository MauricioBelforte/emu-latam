# 02 - Análisis - Módulo de Testing (Plan Inicial)

## Análisis del Dominio

### Tests existentes en el proyecto

| Archivo | Descripción | Cant. Tests |
|---------|-------------|-------------|
| `client/test_stable_flows.js` | Flujos blindados (directo, bore, proxy, forwarder) | 35 |
| `client/test_ux_features.js` | Funcionalidades UX (nuevo) | 23 |
| `client/test_bore_tcp.js` | Prueba de proxy TCP bore | ~5 |
| `client/test_flow.js` | Prueba de flujo completa | ~3 |
| `client/test_ra_bore.js` | Prueba de RetroArch + bore | ~3 |

### Alternativas consideradas

1. **Tests unitarios con Jest/Mocha**: Requiere instalar dependencias y configurar. No necesario para tests de lógica pura.
2. **Tests en Electron (Spectron/Playwright)**: Demasiado pesado para tests de validación de formato/comandos.
3. **Tests Node.js puros con `assert`**: Elegido. Simple, sin dependencias, rápido.

### Decisiones

- Usar Node.js puro + `console.assert` wrapper para mantener consistencia con `test_stable_flows.js`.
- Tests sincrónicos salvo health check (usa `net.Socket` con timeout).
- Cada test es autónomo y no depende del estado de tests anteriores.
- No se necesita framework de testing (ni Jest, ni Mocha, ni Chai).

### Cobertura por feature

| Feature | Tests | Cobertura |
|---------|-------|-----------|
| Copiar IP | 4 | Formato, bordes, vacío |
| Firewall automático | 4+1 | Comando exacto, vars, disponibilidad netsh |
| Health check TCP | 3 | Reachable, unreachable, timeout |
| Auto-refresh IP | 4 | Lógica de actualización, null, igual, vacío |
| Intervalos | 3 | Frecuencias correctas |
| Parseo IPC | 5 | Firewall ok/fail, health reachable/unreachable/null |
