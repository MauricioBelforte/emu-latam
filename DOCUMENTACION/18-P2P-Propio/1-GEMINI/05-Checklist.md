# 05 - Checklist de Implementación y Tareas (Emu Latam)

> **Módulo:** 18-P2P-Propio  
> **Fecha:** 2026-07-23  
> **Estado:** Propuesta de Arquitectura v1.0  
> **Referencias:** Ver `01-Requerimientos.md` a `04-Codigo.md`  

---

## 1. Fases de Desarrollo y Estimación

---

### Fase 1: Núcleo P2P y Detección NAT (MVP 1v1)
*Enfocado en lograr la perforación de puertos directa UDP entre dos clientes.*

- [ ] **T1.1 (Baja):** Crear estructura de carpetas `src/main/p2p/` y definir tipos en `types.ts`.
- [ ] **T1.2 (Media):** Implementar encodificación binaria de protocolo en `Protocol.ts` y pruebas unitarias con Vitest.
- [ ] **T1.3 (Media):** Implementar cliente STUN en `NATDetector.ts` para obtener IP/Puerto público.
- [ ] **T1.4 (Alta):** Implementar socket `P2PSocket.ts` con lógica de *UDP Hole Punching* y temporizadores ráfaga.
- [ ] **T1.5 (Media):** Integrar señalización sobre WebSocket de Nakama (intercambio de candidato JSON).

---

### Fase 2: Relay UDP Fallback y Proxy Local de RetroArch
*Garantizar el 100% de conectividad mediante fallback en Host y puente local para RetroArch.*

- [ ] **T2.1 (Alta):** Implementar `UDPRelayManager.ts` para multiplexar tráfico en el Host en caso de NAT Simétrico.
- [ ] **T2.2 (Alta):** Implementar `LocalRetroArchProxy.ts` para exponer el socket loopback local `127.0.0.1:55435` que se conecta a RetroArch.
- [ ] **T2.3 (Media):** Implementar máquina de estados FSM en `P2POrchestrator.ts` para conmutar transparentemente entre P2P Directo y Relay.
- [ ] **T2.4 (Baja):** Lógica de *Keepalive* periódico (15s) para prevención de cierre de mapeos NAT.

---

### Fase 3: Integración Frontend, LAN Bypass y Robustez Multi-Peer
*Conexión final con React UI, soporte para salas > 2 jugadores y optimizaciones LAN.*

- [ ] **T3.1 (Media):** Exponer API IPC en `preload/index.ts` e implementar IPC Handlers en Electron Main.
- [ ] **T3.2 (Media):** Implementar detección de subred LAN coincidente para bypassing de IPs públicas.
- [ ] **T3.3 (Alta):** Soporte multi-cliente en el Relay del Host (hasta 16 jugadores simultáneos).
- [ ] **T3.4 (Media):** Actualizar UI de React (Componente de Matchmaking) con feedback visual de estados (Spinner, LATENCY, P2P vs RELAY badge).
- [ ] **T3.5 (Media):** Pruebas de integración de extremo a extremo (E2E) simulando paquetes perdidos y Symmetric NAT.

---

## 2. Matriz de Dependencias entre Tareas

```
  [T1.1 Tipos]
       |
       v
  [T1.2 Protocolo Binario]
       |
       +-----------------------+
       |                       |
       v                       v
  [T1.3 STUN Client]    [T1.4 P2PSocket]
       |                       |
       +-----------+-----------+
                   |
                   v
        [T1.5 Nakama Signaling]
                   |
                   v
         [T2.1 UDPRelayManager]
                   |
                   v
       [T2.2 RetroArch Proxy]
                   |
                   v
         [T3.1 Handlers IPC]
                   |
                   v
         [T3.4 Integración UI]
```

---

## 3. Plan de Testing y Calidad

### Pruebas Unitarias (Vitest)
- `Protocol.test.ts`: Verificar que la serialización y deserialización binaria preserve la integridad de los datos.
- `NATDetector.test.ts`: Mckear respuestas STUN para validar clasificación correcta de NAT.

### Pruebas de Integración de Red
- **Prueba de Perforación Virtual:** Instanciar dos `P2PSocket` en puertos locales distintos y validar handshake directo.
- **Prueba de Stress de Relay:** Enviar 1,000 datagramas de Netplay simulados por segundo a través del `UDPRelayManager` y verificar que la latencia agregada sea < 2ms.

---

## 4. Criterios de Finalización (Definition of Done)

1. Cero dependencias de binarios compilados externos (Tailscale y Bore removidos del flujo principal).
2. Tasa de éxito de conexión en partidas 1v1 ≥ 99% (combinando P2P directo + Host Relay).
3. Cobertura de tests unitarios en el módulo P2P ≥ 85%.
4. Documentación de arquitectura totalmente sincronizada en el repositorio (`docs/p2p/`).
