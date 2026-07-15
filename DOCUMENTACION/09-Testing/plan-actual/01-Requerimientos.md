# 01 - Requerimientos - Módulo de Testing (Plan Inicial)

## Problema
- Las nuevas funcionalidades UX (copiar IP, firewall automático, health check, auto-refresh) no tienen tests automáticos.
- No existe un módulo de testing centralizado que documente y agrupe todos los tests del proyecto.
- Los tests de flujos blindados (35 tests en `test_stable_flows.js`) están fuera del sistema de documentación.

## Objetivo
Crear un módulo exclusivo para testing que:
- Centralice todos los tests del proyecto en documentación.
- Proporcione tests automáticos para las nuevas features UX.
- Sirva como referencia de cobertura de tests.
- Sea extensible para futuros tests.

## Alcance
- 23 tests iniciales para features UX (copiar IP, firewall auto, health check, auto-refresh).
- Tests ejecutables con `node test_ux_features.js`.
- Documentación de cobertura y resultados esperados.
- Integración con el sistema de scripts npm (`test:ux`).

## Restricciones
- Tests deben ejecutarse sin Electron (Node.js puro).
- Tests no deben modificar el sistema (no crear reglas de firewall reales).
- Tests deben ser deterministas (mismos resultados siempre).
- Deben respetar la estructura de documentación existente (AGENTS.md §11).
