# 05 - Checklist: Sistema de Retos

## Plan Inicial

- [ ] **Documentación del componente creada** (5 archivos en plan-inicial y plan-actual)
- [ ] **Componente MethodPicker creado** (`client/src/components/ui/MethodPicker.tsx`)
- [ ] **ChallengeContext actualizado**:
  - [ ] Nuevo estado `picking_method`
  - [ ] Función `initiateChallenge(targetId, targetName)`
  - [ ] Función `selectMethod(method)`
  - [ ] ChallengeData incluye campo `method`
  - [ ] Flujo Tailscale en event listener
  - [ ] Flujo LAN en event listener
  - [ ] Flujo Bore (ya existente, verificar)
- [ ] **ChallengeModal actualizado**:
  - [ ] Vista `picking_method` con 3 botones
  - [ ] Mostrar método en vista `received`
- [ ] **Sidebar actualizado**: Llama `initiateChallenge` en vez de `sendChallenge` directo
- [ ] **App.tsx**: Asegurar que MethodPicker se renderiza
- [ ] **Tests**: Verificar flujo completo con Tailscale
- [ ] **npm run dev**: Sin errores
- [ ] **Log generado** en Logs/
