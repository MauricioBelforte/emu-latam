# Plan de Conexión: Diagnóstico UDP y Relay (Emu-Latam)

> **NOTA IMPORTANTE:**
> Este documento sirve como una bitácora estricta para evitar repetir pasos fallidos. 
> Cuando este problema sea solucionado, este archivo **DEBE** ser movido a la carpeta `Historial/1_relay_udp_fix.md` para mantener el registro de cómo se resolvió, documentando la metodología para el futuro.

## Objetivo
Lograr que los emuladores RetroArch (Host y Cliente) se comuniquen correctamente mediante el servidor Relay UDP en Node.js, ya sea en red local (`127.0.0.1`) o a través del túnel de Internet (`playit.gg`).

---

## 🛑 CHECKLIST: Lo que YA PROBAMOS (y falló)
Para no volver a repetir errores, aquí está lo que ya descartamos:

- [x] **Bandera `--netplay-mitm-server`**: Falla porque la versión actual del ejecutable RetroArch no reconoce ese comando (`unrecognized option`).
- [x] **Conflicto de puertos locales**:
  - Evitamos usar el puerto `55435` en el Emulador porque el Relay de Node.js ya lo ocupa.
  - Asignamos los puertos `55434` al HOST y `55436` al CLIENT (Join).
- [x] **Ruta de Proxy Complejas**: El Relay intentó asumir los roles de los jugadores, pero como RetroArch es pasivo, el emulador Host nunca inicia la comunicación.
- [x] **Túnel Playit (Bypass Local)**: Probamos saltarnos Internet usando `127.0.0.1:55435` directamente en la App. El servidor de Node.js tampoco registra tráfico UDP.

- [x] **Fase 1: Diagnóstico de Node.js (UDP)** -> Falló (RA usa TCP).
- [x] **Fase 2: Túnel TCP (Playit)** -> Falló (Requiere suscripción Premium).
- [x] **Fase 3: Túnel TCP (Ngrok)** -> Falló (Requiere Tarjeta de Crédito para TCP).

## 🏆 EL PLAN DEFINITIVO: BORE (TCP TÚNEL LIBRE)

**¿Qué pasó con el Relay Nativo de RetroArch?**
Descubrimos mediante pruebas rigurosas en consola que los servidores MITM nativos de libretro están caídos o requieren autenticación de cuenta que no podemos automatizar fácilmente en la App. Fallaba al resolver el UPnP.

**¿Qué es BORE?**
Bore es una herramienta de código abierto ultra-liviana diseñada para desarrolladores.
- **100% GRATIS DE VERDAD** (sin limitaciones de TCP).
- **SIN TARJETAS DE CRÉDITO**.
- **SIN CREAR CUENTAS**. 
- Solo descarga y funciona. Y todo en TCP para que el RetroArch vuele.

**NUEVO FLUJO (100% FUNCIONAL Y TESTEADO EN CONSOLA):**
1. [x] Modifiqué tu script `iniciar_relay_windows.bat`. Ahora descarga *Bore* automáticamente y lo lanza.
2. [x] Arreglé un bug masivo en `index.ts`: RetroArch se rompía si le mandabas `--connect bore.pub:12345`. Lo programé para que reciba la dirección y separe `--connect bore.pub` `--port 12345`. ¡Genialidad!
3. [x] El usuario ejecutó `iniciar_relay_windows.bat`. La ventana negra mostró: `listening at bore.pub:18863`.
4. [x] El usuario pegó `bore.pub:18863` en la App y guardó.
5. [x] **¡ÉXITO TOTAL!** Los emuladores se sincronizaron y el juego inició en ambos.

### 📝 NOTA SOBRE EL RENDIMIENTO (LAG/DESTIEMPO)
Se detectó un leve "destiempo" o retraso en la sincronización. Esto es normal en esta etapa porque:
- El servidor de `bore.pub` puede estar físicamente lejos.
- No hemos ajustado el "Frame Delay" o el "Input Latency" en RetroArch para compensar el ping.
- Futura Mejora: Probar levantar un servidor de Bore propio en un VPS de Latam o ajustar el `netplay_check_frames` en RetroArch.

---
**ESTADO: SOLUCIONADO - MOVIENDO A HISTORIAL**


