# Checklist del Componente: Anti-Lag y Estabilidad UX

- [x] Crear archivo `retroarch/netplay_optimized.cfg` en el directorio de RetroArch.
- [x] Modificar `client/src/main/index.ts` para implementar el Health Check de Nakama expuesto vía IPC.
- [x] Modificar `client/src/main/index.ts` para añadir `--appendconfig` a la ejecución de RetroArch.
- [x] Modificar `client/src/App.tsx` para inyectar el Spinner/Loader e inhabilitar "INSERT COIN" hasta que el servidor local Nakama esté listo.
- [x] Modificar `client/src/App.tsx` para guardar la IP de Relay de manera automática al dar click en "JOIN GAME".
- [x] Ejecutar el cliente localmente con `npm run dev` y validar los flujos modificados.
- [x] **Fix doble input guest en host (15-Jul-2026):** `netplay_check_frames` cambiado de `"30"` a `"0"` para desactivar rollback que duplicaba inputs del guest en la pantalla del host. Verificado en MITM local.