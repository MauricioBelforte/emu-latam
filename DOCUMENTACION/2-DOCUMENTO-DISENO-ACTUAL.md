# Diseño Detallado - Emu Latam

**Arquitectura de Procesos:**
1. **Main Process (Electron):** 
   - `client/src/main/index.ts` gestiona `child_process.spawn` para Nakama y Bore.
   - Provee funciones de IPC para que React interactúe.
2. **Renderer Process (React):**
   - Interfaz de usuario donde el Host crea sala y el Guest se une mediante IP de Bore.
3. **Servicios Externos:**
   - `backend/nakama.exe`: Backend local iniciado en modo headless.
   - `bore.exe`: Inicia túnel `bore local 55435 --to bore.pub` capturando el puerto con Regex.
   - `retroarch/retroarch.exe`: Se inicia en modo Netplay Host o Guest (55435).