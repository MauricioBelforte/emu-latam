# 🕹️ EMU-LATAM: KOF '98 Netplay (v1.0 - Conexión Directa P2P)

> **ESTA RAMA (`main`) CONTIENE LA VERSIÓN 1.0 (CONEXIÓN DIRECTA PC A PC).**

Bienvenido a la primera versión funcional del proyecto EMU-LATAM, un launcher de KOF '98 inspirado en Fightcade.

## 📌 Sobre esta versión (v1.0 - P2P)

Esta versión se basa en un modelo de **conexión directa (P2P)**. Esto significa que **las dos PCs se conectan directamente entre sí** sin pasar por servidores intermediarios (relays).

### ✅ Ventajas:

- **Latencia mínima real**: Al no haber intermediarios, el ping es el más bajo posible entre los dos jugadores.
- **Independencia total**: Todo corre localmente, no dependes de servidores externos que puedan caerse.

### ⚠️ Desventajas:

- **Requiere configuración de Red**: El Host debe abrir puertos en su Router (Port Forwarding) y en el Firewall de Windows.
- **Las IPs deben conocerse**: Los jugadores deben compartir sus IPs públicas para interactuar.

---

## 🛠️ ¿Cómo funciona?

El proyecto tiene dos componentes clave:

1. **Nakama Server**: El backend de emparejamiento y chat de voz/texto. (Usa el puerto `7350`).
2. **RetroArch (FBNeo)**: El emulador que corre el juego usando el protocolo nativo de Netplay. (Usa el puerto `55435`).

---

## 📖 Guías de Usuario

Si quieres probar esta versión y hostear una partida, sigue los siguientes manuales:

1. **[Guia de Instalación](GUIA_INSTALACION.md)**: Cómo instalar y ejecutar por primera vez.
2. **[Guía de Port Forwarding](GUIA_PORT_FORWARDING.md)**: Obligatorio si quieres invitar a un amigo que no esté en tu misma casa.
3. **[Reporte Técnico](REPORTE_TECNICO_NETPLAY.md)**: El registro completo de cómo se construyó esta arquitectura en su interior.

---

## 🔀 Ramas del Proyecto (Git)

Este proyecto fue diseñado para escalar. Si estás buscando la versión que no requiere configurar puertos (estilo Fightcade), por favor cambia a la rama experimental:

- `main` ➔ **Versión Actual:** Conexión estricta punto a punto P2P (Require Port Forwarding).
- `feature/relay-cloud` ➔ **Próxima Versión:** (En desarrollo) Uso de Servidores de Relevo (RetroArch Relays) y Nakama Cloud (Cero configuración para el usuario final).
