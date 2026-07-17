# Diseño Arquitectónico — Gemini 3.5 Flash

## 1. Arquitectura de Componentes Propuesta
La arquitectura de mejoras de Gemini se integra al Main Process de Electron estructurando submódulos dedicados para resolver responsabilidades específicas:

```mermaid
graph TD
    subgraph Renderer (React)
        UI[UI Components / Sala] <--> |IPC Events| IPC[IPC Bridge]
    end

    subgraph Main Process (Electron)
        IPC <--> |Llamadas IPC| MG[Main Manager]
        MG <--> Watchdog[Process Watchdog]
        MG <--> TS[Tailscale Diagnostic Client]
        MG <--> UDP[RetroArch UDP Control]
        MG <--> NK[Nakama Device Auth / Matchmaker]
        MG <--> Proxy[Safe TCP Forwarder + Token Check]
    end

    subgraph Procesos Externos
        Watchdog --> |Spawn / Monitor| RA[retroarch.exe]
        Watchdog --> |Spawn / Monitor| Bore[bore.exe]
        Watchdog --> |Spawn / Monitor| Nakama[nakama.exe]
        UDP -.-> |Sockets UDP 55400| RA
        Proxy <--> |Filtro TCP| Bore
    end
```

---

## 2. Flujo de Diagnóstico de Red y Lanzamiento Dinámico

```mermaid
sequenceDiagram
    participant UI as React UI
    participant Main as Electron Main
    participant TS as Tailscale CLI
    participant RA as RetroArch

    UI->>Main: Iniciar Partida (Host/Guest)
    Main->>TS: Ejecutar tailscale status --json
    TS-->>Main: Datos de conexión del par
    Alt Conexión Directa P2P
        Main->>Main: Cargar Config de Latencia Ultra-Baja (buffer=1)
        Main->>UI: Notificar "Conexión Directa P2P (Excelente)"
    Else Conexión vía Relay (DERP)
        Main->>Main: Cargar Config de Latencia de Respaldo (buffer=3)
        Main->>UI: Notificar "Conexión vía Relay (Latencia Alta)"
    End
    Main->>RA: Spawn con --appendconfig netplay_optimized.cfg modificado
```

---

## 3. Handshake de Seguridad en el Transparent Forwarder

```mermaid
sequenceDiagram
    participant Guest as Guest Proxy (Node)
    participant Bore as Bore Tunnel (Public)
    participant HostFw as Host Forwarder (Safe Node)
    participant HostRA as Host RetroArch (55435)

    Guest->>Bore: Conectar TCP (enviar token efímero en primer paquete)
    Bore->>HostFw: Reenviar conexión con token
    HostFw->>HostFw: Validar token recibido contra token de sala (Nakama)
    Alt Token Válido
        HostFw->>HostRA: Pipe bidireccional TCP a 127.0.0.1:55435
        HostFw-->>Guest: Continuar flujo normal de Netplay
    Else Token Inválido / Intruso
        HostFw->>HostFw: Cerrar socket inmediatamente
        HostFw-->>Guest: Desconectar (Conexión denegada)
    End
```
