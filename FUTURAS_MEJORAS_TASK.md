# 🚀 HOJA DE RUTA DETALLADA: FUTURAS MEJORAS (EMU LATAM)

Este documento contiene el plan de acción paso a paso para implementar las mejoras planificadas. Sirve como un checklist estricto para las próximas sesiones de desarrollo.

## Fase 1: Automatización y Experiencia (Local)

El objetivo de esta fase es hacer que la experiencia del usuario sea "un solo clic", ocultando la complejidad del servidor de fondo.

### 1.1. Auto-Lanzamiento de Nakama (Modo Invisible)
- [x] **Investigación & Código:** Modificar `client/src/main/index.ts` usando `child_process.spawn('nakama.exe', ...)` con `windowsHide: true` para que se lance al iniciar la App.
- [x] **⚙️ TEST AUTOMÁTICO (Consola):** Ejecutar un script JS en consola que inicie la App en "modo headless" y comprobar mediante el comando `tasklist` de Windows si el proceso `nakama.exe` se ha creado y está "oculto". **(RESULTADO: EXITOSO - PID 8700 detectado y puerto 7350 activo)**.
- [x] **Chequeo de Salud:** Enviar un GET request oculto a `http://127.0.0.1:7350` al iniciar. Si hay respuesta, no abrir un Nakama duplicado.
- [x] **⚙️ TEST AUTOMÁTICO (Consola):** Lanzar dos instancias de la App asegurando que la segunda instancia detecte que Nakama ya está abierto. **(RESULTADO: EXITOSO)**.
- [x] **Gestión de Cierre:** Capturar los eventos `window-all-closed` en Electron y hacer un `process.kill()` al hijo de Nakama almacenado.
- [x] **⚙️ TEST AUTOMÁTICO (Consola):** Programar un cerrado automático de la App tras 5 segundos y ejecutar `taskkill` o `tasklist` para afirmar que la memoria quedó limpia. **(RESULTADO: EXITOSO)**.

### 1.2. Gestión Automática de IP/Túnel (Bypass Manual)
- [ ] **Integración de Bore:** Programar el Host para lanzar `bore local 55435 --to bore.pub` nativamente mediante `child_process` dentro de Electron, extrayendo el puerto dinámico con un `Regex` desde la salida de consola (stdout).
- [ ] **⚙️ TEST AUTOMÁTICO (Consola):** Ejecutar un script local `test_bore_parser.js` que simule la salida de consola de bore y verificar si la App extrae correctamente el puerto (ej: `18863`) de manera analítica (sin abrir un bat).
- [ ] **Actualización Automática a la Nube:** Hacer que la App guarde la cadena `bore.pub:XXXX` directamente en el Match Data o Storage de Nakama una vez generada, para que el invitado la reciba automáticamente.
- [ ] **⚙️ TEST AUTOMÁTICO (Consola):** Utilizar `curl` o un script Node.js hacia la API de Nakama para pedir los metadatos de la sala actual y comprobar en crudo (`JSON`) que la cadena de conexión contenga "bore.pub" y el número de puerto válido.

---

## Fase 2: Infraestructura Central (Nube / VPS)

El objetivo de esta fase es centralizar los servicios para que los usuarios (incluso el Host) no necesiten hospedar Nakama ni abrir túneles en sus propias máquinas, garantizando el mejor ping posible.

### 2.1. Preparación del VPS (Ubuntu/Debian)
- [ ] **Acceso y Despliegue Nakama:** Ingresar vía SSH, instalar Docker/Compose y levantar los contenedores de Nakama exponiendo puertos `7350`/`7351`.
- [ ] **⚙️ TEST AUTOMÁTICO (Consola Local):** Ejecutar `curl -s -o /dev/null -w "%{http_code}" http://IP_DEL_VPS:7350` desde la terminal del bot local para verificar que la salud del servidor y del puerto respondan con código `200 OK` (sin pedir al usuario que abra el navegador).
- [ ] **⚙️ TEST AUTOMÁTICO (Consola Local):** Crear un cliente Node.js efímero que haga un login de test en el VPS (mock user) para validar la latencia y el tiempo de respuesta de la Base de Datos remotamente.

### 2.2. Servidor Tunnel Propio (Bore Server)
- [ ] **Bore VPS Backend:** Ejecutar `bore server` en el VPS para centralizar túneles (evitando las desconexiones o saturaciones de la red pública y ganando ping).
- [ ] **⚙️ TEST AUTOMÁTICO (Consola Local):** Levantar un cliente silencioso (`bore local 55435 --to IP_DEL_VPS`) localmente, y hacer ping usando Powershell (`Test-NetConnection -ComputerName IP_DEL_VPS -Port 55435`) para asegurar bidireccionalidad TCP libre de firewalls.
- [ ] **Integración en BD App:** Una vez validado el script, la App usará `IP_DEL_VPS` siempre como endpoint principal en el túnel directo del Host.

### 2.3. Optimización de Latencia y UX en RetroArch
- [ ] **Configuraciones de Netplay:** Modificar parámetros de Electron al lanzar retroarch anexando argumentos CLI para activar *Run-Ahead* de latencia (`netplay_input_latency_frames_min`).
- [ ] **⚙️ TEST AUTOMÁTICO (Consola Local):** Lanzar instancias CLI de Retroarch "sin cabeza/interfaz" midiendo en los registros internos `retroarch -v --log-file` el comportamiento. Si Retroarch no emite error fatal por los argumentos nuevos, el ajuste se da por válido.
- [ ] **Sistema de Notificaciones Automáticas (Invitaciones):** Implementar avisos visuales (toast) en el renderer de Electron cuando el Socket reciba que el amigo es HOST.

---

*(Al concluir cada fase, el asistente correrá los 'TEST AUTOMÁTICO' indicados y documentará los resultados en un reporte antes de solicitar validación humana visual)*
