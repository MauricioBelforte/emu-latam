# 01 — Requerimientos del Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN
> **Fecha:** 2026-07-24
> **Estado:** Plan inicial
> **Versión:** 1.0

---

## 1. Definición del Problema

Para conectar dos PCs en distintas redes, el guest necesita alcanzar el **Nakama server** que corre en la PC host. Actualmente esto solo funciona si:

- Ambas PCs están en la misma **LAN** (broadcast UDP + IP privada directa)
- El guest conoce la **IP pública** del host y el puerto 7350 está abierto (raro, CGNAT)
- Usan **Tailscale** (instalación externa)

Cuando el guest está en una red distinta (ej: datos del celular), no hay forma de que llegue al Nakama del host. Sin Nakama no hay lobby, no hay retos, no hay P2P signaling.

---

## 2. Objetivos del Sistema

### 2.1 Corto Plazo
- Guest se conecta al Nakama del host estando en distinta red, sin Tailscale
- Tiempo desde que el host "abre sala" hasta guest conectado a Nakama < 15s
- El guest solo necesita ingresar un código corto (4-6 caracteres)
- Sin depender de servicios externos no controlados (más allá de bore.pub y paste service)

### 2.2 Mediano Plazo
- Rendezvous service opcional autogestionado por el usuario
- Soporte para múltiples salas simultáneas

---

## 3. Requerimientos Funcionales

| ID | Requerimiento | Descripción |
|:---|:---|:---|
| **RF-01** | Host inicia túnel bore para Nakama | Host lanza `bore local 7350 --to bore.pub`, extrae URL `bore.pub:XXXXX` |
| **RF-02** | Publicar bore URL en rendezvous | Host publica la URL en un paste service público (dpaste.org) asociada a un room code |
| **RF-03** | Room code corto | Código de 6 caracteres alfanuméricos generado por el host y mostrado al usuario |
| **RF-04** | Guest fetch por room code | Guest ingresa room code, app obtiene bore URL desde el paste service |
| **RF-05** | Guest conecta Nakama via bore | Guest configura `emu_latam_nakama.json` con `bore.pub:XXXXX` y se conecta |
| **RF-06** | Confirmación de conexión | Una vez conectado a Nakama, el guest aparece en el lobby del host |
| **RF-07** | Limpieza al cerrar sala | Host destruye el paste del room code al cerrar/desconectar |
| **RF-08** | Fallback manual | Si el paste service no responde, mostrar la URL completa para compartir manualmente |
| **RF-09** | Config persistente | La última conexión Nakama remota se guarda para reconexión automática |
| **RF-10** | Desconexión limpia | Al cerrar sala, restaurar Nakama config a localhost |

---

## 4. Requerimientos No Funcionales

| ID | Requisito | Meta |
|:---|:---|:---|
| RNF-01 | Tiempo de publicación | < 3s desde que host presiona "ABRIR SALA PÚBLICA" hasta que room code se muestra |
| RNF-02 | Tiempo de fetch | < 3s desde que guest ingresa room code hasta que bore URL se obtiene |
| RNF-03 | Sin binarios externos nuevos | Solo Node.js https + fetch, mismo bore.exe ya existente |
| RNF-04 | Fallback tolerante | Si paste service falla, la sala pública muestra la URL manual. No bloquea al usuario |
| RNF-05 | Sin pérdida de sesión | Si el paste service elimina el paste (TTL), el room code deja de funcionar (se puede regenerar) |

---

## 5. Alcance

### In-Scope
- Módulo `client/src/main/bootstrap.ts` con funciones de publicación y lectura vía HTTPS
- Handler IPC `bootstrap-host` y `bootstrap-guest`
- UI: botón "ABRIR SALA PÚBLICA" en App.tsx + room code display
- Integración con el sistema de Nakama config existente (`setNakamaConfig`)
- Tests simulados (sin red real, mock HTTP)

### Out-of-Scope
- Servidor de rendezvous propio (VPS). Se usa dpaste.org como free tier
- Cifrado adicional del tráfico (RetroArch y Nakama manejan su propia seguridad)
- Soporte multi-host concurrente (varias salas públicas simultáneas del mismo host)

---

## 6. Criterios de Aceptación

| ID | Escenario | Éxito |
|:---|:---|:---|
| CA-01 | Host publíca sala pública | Room code de 6 caracteres visible en pantalla |
| CA-02 | Guest ingresa room code válido | App obtiene bore URL y conecta a Nakama |
| CA-03 | Guest ingresa room code inválido/vencido | Mensaje de error claro |
| CA-04 | Paste service no responde | App muestra URL manual como fallback |
| CA-05 | Host cierra sala pública | Nakama vuelve a localhost, paste eliminado |
| CA-06 | Reconexión con última URL guardada | Al abrir la app de nuevo, guest intenta reconectar a la última URL válida |
