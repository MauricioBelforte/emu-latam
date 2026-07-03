# Requerimientos: Anti-Lag y Estabilidad UX (Fase 1.3)

Este componente engloba los requisitos técnicos y de experiencia de usuario para optimizar la emulación en red (Netplay) y mejorar la confiabilidad del inicio de la aplicación.

## 1. Prevención de Login Rápido (UX)
- **Problema:** Si el usuario hace clic rápidamente en "Insert Coin" al arrancar la aplicación, se genera un error de red debido a que el servidor de Nakama aún no ha terminado de iniciarse completamente.
- **Requerimiento:** Bloquear las interacciones de inicio de sesión y mostrar un indicador visual ("Iniciando Servidor...") hasta que Nakama responda exitosamente a su Health Check.

## 2. Join Directo (IP Express)
- **Problema:** En el flujo de invitado (JOIN), el usuario debe ingresar la IP del Host, presionar obligatoriamente "Guardar Configuración", y luego "JOIN GAME". Esto resulta en clics y pasos innecesarios.
- **Requerimiento:** Al hacer clic en "JOIN GAME", la aplicación debe tomar directamente el valor del campo de texto de la IP de Relay, guardarlo automáticamente en el almacenamiento local (`localStorage`) e iniciar la conexión a la partida sin pasos manuales intermedios.

## 3. Configuración Anti-Lag (Run-Ahead en RetroArch)
- **Problema:** La conexión a través de Bore Tunnel (servidores públicos) introduce una latencia percibida alta (~500ms).
- **Requerimiento:** Inyectar optimizaciones de latencia a nivel de emulador en RetroArch usando la técnica de **Run-Ahead** (1 frame), compensación de latencia de red, Frame Delay y Hard GPU Sync sin sobrescribir o modificar permanentemente la configuración de usuario global del emulador.