# 05 - Checklist - Automatización de Conexión (Plan Inicial)

## Estado actual: 🔄 Plan inicial creado, sin implementar

## Tareas pendientes (ordenadas por prioridad)

### Solución A — Storage de Nakama (recomendada)
- [ ] Implementar `publish-connection-info` IPC handler (index.ts).
- [ ] Implementar `fetch-connection-info` IPC handler (index.ts).
- [ ] Llamar `publish-connection-info` al crear sala (App.tsx).
- [ ] Llamar `fetch-connection-info` al conectar como guest (App.tsx).
- [ ] Auto-completar campo IP del host en la UI.
- [ ] Probar flujo completo cross-PC.

### Solución B — Retos (alternativa)
- [ ] Debuggear ChallengeContext.tsx (handler `_conn` bloqueado).
- [ ] Enviar IP vía RPC de reto.
- [ ] Auto-aceptar reto y lanzar JOIN.

### Solución C — Matchmaking (compleja)
- [ ] Investigar API de Matchmaker de Nakama.
- [ ] Implementar entrada al matchmaker (host + guest).
- [ ] Manejar notificaciones de match.
- [ ] Probar con 2 PCs.

## Notas
- Decidir con el usuario qué solución implementar primero.
- No tocar flujos blindados existentes (AGENTS.md §14-15).
- Tiempo estimado Solución A: 1-2 horas.
