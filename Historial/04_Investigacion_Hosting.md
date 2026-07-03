# RESEARCH_HOSTING_OPTIONS.md

# Comparativa de Servicios Hosting para Relay (V2)

Este documento registra los proveedores investigados para el sistema de Relay de Emu Latam, con foco en **No-Credit Card (No-CC)** y optimización para **Argentina/LATAM**.

## 1. Playit.gg (OPCIÓN SELECCIONADA)

- **Región**: Sao Paulo (SA-1)
- **Requiere Tarjeta**: No.
- **Latencia (ARG)**: ~35ms - 50ms.
- **Ventajas**:
  - Diseñado específicamente para gaming.
  - Usa túneles de alto rendimiento.
  - Plugin de fácil integración en Windows/Linux.
- **Uso**: Será nuestro túnel principal para exponer el servidor `netplay_mitm_server`.

## 2. RetroArch Public Relays

- **Región**: Global (incluye Sao Paulo).
- **Requiere Tarjeta**: No.
- **Latencia (ARG)**: ~40ms - 65ms.
- **Ventajas**: Ya está integrado en el ecosistema.
- **Desventajas**: Menos control sobre el tráfico y posibles saturaciones de servidores públicos.
- **Estado**: Backup inmediato.

## 3. VPSWala (Trial 15 días)

- **Región**: Argentina (Buenos Aires).
- **Requiere Tarjeta**: No.
- **Latencia (ARG)**: **10ms - 20ms**.
- **Ventajas**: Es la opción de menor latencia posible para Argentina.
- **Desventajas**: Es una prueba temporal. Requiere migración o pago después de 15 días.
- **Estado**: Backup crítico para torneos o eventos de alta exigencia.

## 4. Fly.io / Oracle Cloud

- **Región**: Chile (Santiago) / Sao Paulo.
- **Requiere Tarjeta**: **SÍ**.
- **Latencia (ARG)**: 25ms - 45ms.
- **Ventajas**: Infraestructura profesional y estable.
- **Desventajas**: Bloqueado por el requisito de No-Credit Card del usuario.
- **Estado**: Descartado por el momento.

## 5. Render / Railway (PAAS)

- **Región**: Global (USA/Europa principalmente en capas gratuitas).
- **Requiere Tarjeta**: **SÍ** (Railway es muy estricto ahora; Render es más flexible pero limitado).
- **Uso Ideal**: Hosting de **Backend de Nakama** (Base de datos, Login, Chat) vía HTTP/TCP.
- **Limitación Técnica**:
  - **No soportan UDP**: Esencial para el netplay de emuladores.
  - **Hibernación**: Render apaga el servicio tras 15 min de inactividad, lo que cortaría partidas.
- **Estado**: Recomendado únicamente para el Backend (Nakama), no para el Relay de juego.

## 6. Loclx / Ngrok (Alternativas de Túnel)

- **Región**: Principalmente USA/Europa (Latencia alta para LATAM).
- **Requiere Tarjeta**: No (planes limitados).
- **Desventajas**: Alta latencia (+150ms).
- **Estado**: Descartado por rendimiento.
