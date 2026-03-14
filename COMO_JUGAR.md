# 🎮 GUÍA DE USO - EMU LATAM NETPLAY (V3.1)

Esta guía explica cómo jugar 1vs1 al KOF '98 usando el nuevo sistema 100% automatizado.

## 🏠 ROL: SERVIDOR (HOST)
¡Ahora es mucho más fácil! La App se encarga de todo.

1. **Abrir la App**: Simplemente inicia Emu Latam. 
   - *Nota: Nakama se abrirá solo de forma invisible en segundo plano.*
2. **Iniciar Partida**:
   - Presiona el botón **1. HOST GAME**.
   - Verás que el botón dice "CREANDO TÚNEL...". Espera 2 segundos.
   - El túnel se creará automáticamente y verás la dirección cargada en el cuadro de "Configuración de Relay".
3. **Compartir**: Copia esa dirección (ejemplo: `bore.pub:18863`) y pásasela a tu amigo.

---

## 🕹️ ROL: INVITADO (JOIN)
Solo necesitas la App y la dirección que te pase el Host.

1. **Abrir la App**: Inicia Emu Latam.
2. **Configurar**:
   - Ve al cuadro de **Configuración de Relay**.
   - Pega la dirección que te pasó tu amigo.
   - Presiona **GUARDAR CONFIGURACIÓN**.
3. **Unirse**: Dale al botón **2. JOIN GAME**.

---

## 🛑 NOTAS IMPORTANTES
- **Cierre Limpio**: Al cerrar la App de Electron, el servidor de Nakama y el túnel de Bore se cerrarán automáticamente. No quedan procesos basura.
- **Error en Túnel**: Si el botón de Host se queda pegado en "Creando...", revisa que tu firewall no esté bloqueando el programa `bore.exe`.
- **Matchmaking (Fase 2)**: Próximamente eliminaremos el paso de copiar/pegar mediante invitaciones directas en la nube.

---

## ⚡ TIPS PARA MEJORAR EL LAG
Si notas que el juego va "a destiempo":
- **Cierra descargas**: Asegúrate de que nadie esté usando mucho internet en tu casa.
- **Usa Cable**: Siempre es mejor jugar con cable LAN que con Wi-Fi.
- **Sincronización**: Si el juego va muy lento, cierren y vuelvan a abrir; a veces el túnel necesita un nuevo "reenganche".

---
*Documentación generada por Antigravity - Emu Latam (v3.0)*
