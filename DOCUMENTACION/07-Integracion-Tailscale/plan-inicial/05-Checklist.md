# 05 - Checklist - Integración Tailscale (Plan Inicial)

## Pendiente
- [ ] Verificar que Tailscale esté instalado en al menos una PC de prueba
- [ ] Identificar el rango exacto de IPs de Tailscale (100.x.x.x)
- [ ] Implementar `getTailscaleIp()` en index.ts
- [ ] Implementar handler `tailscale-host` en index.ts
- [ ] Implementar handler `tailscale-guest` en index.ts
- [ ] Implementar handler `stop-tailscale` en index.ts
- [ ] Exponer handlers en preload/index.ts
- [ ] Agregar botón "HOST VÍA TAILSCALE" en App.tsx
- [ ] Agregar botón "JOIN VÍA TAILSCALE" con input de IP en App.tsx
- [ ] Agregar estados de carga (spinner, disabled) en UI
- [ ] Manejar caso Tailscale no instalado (link de descarga)
- [ ] Agregar tests de spawn args en test_stable_flows.js
- [ ] Verificar `npm run dev` sin errores de TypeScript
- [ ] Probar conexión real entre dos PCs con Tailscale
- [ ] Verificar que los flujos blindados siguen funcionando (35/35 tests)
- [ ] Generar log en Logs/
- [ ] Actualizar DOCUMENTACION/README.md
