# Plan de Mejoras - Poolside Laguna-M1 (Emu Latam)

## 5. Checklist

### 5.1 Tareas principales

#### Backend (Main Process)
- [ ] Implementar handler `auto-host-bore` en index.ts
- [ ] Implementar handler `scan-roms` en index.ts
- [ ] Implementar handlers `get-user-config` / `save-user-config`
- [ ] Agregar helper `withRetry` para operaciones de red
- [ ] Agregar función `resolveBoreIp` con fallback

#### Frontend (Renderer)
- [ ] Crear componente `AutoHostButton.tsx`
- [ ] Crear componente `RomSelector.tsx`
- [ ] Crear componente `NetworkMetricsPanel.tsx`
- [ ] Integrar spinners/estado visual en cada operación
- [ ] Deshabilitar botones durante operaciones críticas

### 5.2 Testing y verificación
- [ ] Test de escaneo de ROMs con directorio vacío
- [ ] Test de escaneo de ROMs con múltiples archivos
- [ ] Test de persistencia: guardar/recuperar config
- [ ] Test de orquestación: forwarder + bore + RA
- [ ] Test de error: bore.pub no disponible (fallback)
- [ ] Test de error: puerto 55435 ya en uso
- [ ] Verificar que los 35 tests estables siguen pasando

### 5.3 Documentación
- [ ] Actualizar DOCUMENTACION/README.md con nueva entrada
- [ ] Crear logs de implementación en Logs/

---
**Documento:** 05-Checklist.md  
**Módulo:** 06-Plan-de-mejoras / poolside laguna-m1 / plan-inicial