# Requerimientos — Plan de Mejoras Gemini 3.5 Flash

## 1. Problema y Contexto
Emu Latam ha logrado un estado operativo estable para partidas locales y remotas mediante Bore y Tailscale, incluyendo configuraciones robustas anti-lag. Sin embargo, para escalar a una fase de producción distribuible, el sistema adolece de varias limitaciones operativas:
- **Punto ciego en la conectividad:** Falta de diagnóstico sobre si el transporte de Tailscale usa un canal directo P2P o un servidor de retransmisión (relay DERP), lo cual incrementa notablemente la latencia.
- ** matchmaker rudimentario:** Dependencia de registros de salas temporales manuales en base de datos PostgreSQL, perdiendo el potencial del backend Nakama para el matchmaking en tiempo real y persistencia de perfiles de usuario.
- **Ciclo de vida tosco de emulación:** Detención abrupta de RetroArch a través del sistema operativo (`taskkill`), con riesgos de corrupción de datos y pérdida de sincronización de estadísticas.
- **Falta de resilencia en procesos:** Silencio operativo y spinners infinitos en el frontend cuando ocurren excepciones o fallas al iniciar los procesos secundarios.

## 2. Objetivos
- Diseñar y proponer las bases técnicas para optimizar el diagnóstico de red en tiempo real.
- Estructurar la migración hacia las APIs nativas de Nakama (matchmaker, storage y device auth).
- Implementar métodos de control y supervisión robustos para los procesos de RetroArch, Bore y Nakama.
- Asegurar la confidencialidad de los puertos públicos de Bore mediante handshakes de seguridad locales.

## 3. Alcance
- **Incluido:** Redacción del plan estratégico estructurado de mejoras; diseño lógico de la arquitectura propuesta por Gemini 3.5 Flash; checklist de tareas necesarias para la implementación incremental; definición del plan de pruebas y simulación de resultados.
- **Excluido:** Modificación directa del código ejecutable actual (`client/src/main/index.ts` o componentes de React) para evitar romper los flujos blindados del proyecto.

## 4. Restricciones
- Las propuestas de diseño deben ser compatibles con el stack actual (React, Electron, Node.js child_process, Nakama 3.21.0, RetroArch).
- No se debe interferir con los flujos de "Host directo", "Host con bore manual" y "Join directo" ya blindados y testeados en el proyecto.
