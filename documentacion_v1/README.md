# ☁️ EMU-LATAM: KOF '98 Netplay (v2.0 - Relay & Cloud - RAMA EXPERIMENTAL)

> **ESTA RAMA (`feature/relay-cloud`) CONTIENE LA VERSIÓN EXPERIMENTAL DE "CERO CONFIGURACIÓN".**

Bienvenido a la versión de desarrollo inspirada 100% en Fightcade y GGPO. El objetivo de esta rama es eliminar la necesidad de que los usuarios configuren sus routers o abran puertos.

## 📌 Sobre esta versión (v2.0 - NAT Traversal)

A diferencia de la rama `main` que usa conexión directa, esta versión utiliza servidores intermediarios para "esquivar" los firewalls de los jugadores (NAT Traversal).

### ✅ Ventajas (Próximamente):

- **Cero Configuración**: Descargar y jugar. Ningún jugador necesita tocar su router (Port Forwarding).
- **Nakama Server Global**: El chat y emparejamiento vivirán en la nube de forma permanente, no en la PC de un jugador.

### ⚠️ Desventajas:

- **Latencia Agregada**: Al depender de servidores de Relevo (RetroArch Relays), la señal hace un viaje un poco más largo, lo cual podría sumar algunos milisegundos de Ping frente a la rama P2P.

---

## 🏗️ Estado Actual del Desarrollo

Esté código se encuentra en **Construcción**.

**Fases Planeadas para esta rama:**

1. [ ] Cambiar el lanzador (`index.ts`) para usar banderas `--mitm` (Man-in-the-Middle / Relay Server).
2. [ ] Configurar RetroArch para conectarse a Relays públicos (ej: Nueva York o Madrid).
3. [ ] Migrar el backend Docker de Nakama a un servicio en la nube gratuito (Render, Railway o Fly.io).

---

## 🔀 Ramas del Proyecto (Git)

Si buscas la versión estable 1vs1 que ya funciona (pero requiere abrir puertos), regresa a la rama principal:

- `main` ➔ **Versión Estable:** Conexión estricta punto a punto P2P (Require Port Forwarding).
- `feature/relay-cloud` ➔ **Estás aquí:** Desarrollo experimental para evitar abrir puertos usando Servidores Relay.
