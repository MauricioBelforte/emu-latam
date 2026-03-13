# 🚀 HOJA DE RUTA: FUTURAS MEJORAS (EMU LATAM)

Este documento detalla las ideas y optimizaciones planificadas para las siguientes fases del proyecto.

## 🛠️ INFRAESTRUCTURA Y AUTOMATIZACIÓN

1. **Auto-Lanzamiento de Nakama (Modo Invisible)**
   - Configurar la App (Electron) para que al abrirse inicie automáticamente el servidor de Nakama.
   - Implementar el inicio en "Background" (escondido) para que el usuario no vea la ventana negra de la consola/Docker.
   - Implementar un chequeo de salud: Si Nakama ya está corriendo, no intentar abrirlo de nuevo.

2. **Transición a VPS (Servidor en la Nube)**
   - Configurar Nakama y el servidor de Bore en un VPS (Virtual Private Server).
   - Utilizar el VPS del amigo como nodo central 24/7.
   - Beneficio: Los jugadores ya no tendrán que abrir `iniciar_relay_windows.bat` ni Nakama en su PC local. Todo estará "siempre encendido" en la nube.

3. **Optimización de Latencia (Ping)**
   - Si se usa un VPS, elegir una ubicación en Sudamérica (ej. San Pablo o Buenos Aires) para reducir el destiempo.
   - Configurar parámetros de RetroArch por defecto para Netplay:
     - `netplay_check_frames = 30` (o ajustado según ping).
     - `netplay_input_latency_frames_min = 1`.

## 🎨 INTERFAZ Y EXPERIENCIA DE USUARIO (UX)

4. **Gestión Automática de IPs de Bore**
   - Hacer que la App detecte automáticamente cuando el túnel Bore está activo y actualice la dirección sin que el usuario tenga que copiar y pegar manualmente.
   - Guardar historial de las últimas salas conectadas.

5. **Sistema de Invitaciones Directas**
   - Integrar un sistema de chat o notificaciones dentro de la App para que al dar a "HOST", se le envíe una alerta automática al amigo por Nakama.

6. **Personalización de RetroArch**
   - Permitir guardar configuraciones de botones (input mapping) específicas para cada jugador que se guarden en la nube de Nakama.

---
*Documento de seguimiento para la próxima sesión de desarrollo.*
