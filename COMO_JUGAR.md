# 🎮 GUÍA DE USO - EMU LATAM NETPLAY

Esta guía explica cómo jugar 1vs1 al KOF '98 usando el sistema de túnel TCP.

## 🏠 ROL: SERVIDOR (HOST)
Tú eres el que provee la infraestructura para la pelea.

1. **Abrir Nakama**: Inicia el servidor de Nakama (Docker o el exe) y asegúrate de que esté corriendo.
2. **Lanzar el Túnel**: 
   - Ve a la carpeta `relay-server`.
   - Ejecuta `iniciar_relay_windows.bat`.
   - Copia la dirección que diga: `listening at bore.pub:XXXXX`.
3. **Configurar la App**:
   - Abre la App, ve a **Configuración de Relay**, pega la dirección y **GUARDA**.
4. **Iniciar**: Dale a **1. HOST GAME**.

---

## 🕹️ ROL: INVITADO (JOIN)
Tú solo necesitas la App y la dirección de tu amigo. **No necesitas correr Nakama ni Bore en tu PC.**

1. **Configurar la App**:
   - Abre la App de Emu Latam.
   - Ve a **Configuración de Relay**.
   - Pega la dirección que te pasó tu amigo (ejemplo: `bore.pub:18863`).
   - Dale a **GUARDAR**.
2. **Unirse**: Dale a **2. JOIN GAME**.

---

## ⚡ TIPS PARA MEJORAR EL LAG
Si notas que el juego va "a destiempo":
- **Cierra descargas**: Asegúrate de que nadie esté usando mucho internet en tu casa.
- **Usa Cable**: Siempre es mejor jugar con cable LAN que con Wi-Fi.
- **Sincronización**: Si el juego va muy lento, cierren y vuelvan a abrir; a veces el túnel necesita un nuevo "reenganche".

---
*Documentación generada por Antigravity - Emu Latam (v3.0)*
