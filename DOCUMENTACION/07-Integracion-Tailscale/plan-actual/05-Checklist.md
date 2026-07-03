# 05 - Checklist - Integración Tailscale (Plan Actual)

## Completado
- [x] Implementar `getTailscaleIp()` en index.ts
- [x] Implementar handler `tailscale-host`
- [x] Implementar handler `tailscale-guest`
- [x] Implementar handler `stop-tailscale`
- [x] Exponer handlers en preload/index.ts (ya es genérico, no requiere cambios)
- [x] Agregar botones en App.tsx
- [x] Manejar caso Tailscale no instalado (mensaje con link de descarga)
- [x] Tests de spawn args (4 nuevos, total 39/39)
- [x] Verificar TypeScript (sin errores)
- [x] Verificar 35/35 tests blindados (39/39 total)

## Pendiente
- [ ] Probar conexión real entre dos PCs con Tailscale instalado
- [ ] Probar que `getTailscaleIp()` detecta IP real cuando Tailscale está activo
- [ ] Agregar detección automática de IP en el guest (leer de Nakama en lugar de pegar manual)
