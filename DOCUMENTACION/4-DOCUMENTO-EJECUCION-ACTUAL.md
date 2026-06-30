# Código de Ejecución - Emu Latam

**Para desarrollar y ejecutar localmente:**
1. Asegurar que PostgreSQL está corriendo en Windows (puerto 5433 en PC de Mauricio).
2. Abrir terminal en `client/`.
3. Ejecutar `npm run dev`.
4. Vite levantará React en el puerto 5173, y Electron abrirá la ventana principal.
5. Nakama se inicia silenciosamente al arrancar Electron, con un Health Check para no duplicar procesos. Al cerrar la App, los procesos mueren limpiamente.