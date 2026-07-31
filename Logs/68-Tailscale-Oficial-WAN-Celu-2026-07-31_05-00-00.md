# Log 68 — Sesión WAN: Tailscale verificado como método oficial (31-Jul-2026)

## Resumen
Se cerró la investigación de conectividad WAN. **Tailscale es el único método que funciona con datos del celu (Personal Argentina).** bore.pub queda descartado para WAN por bloqueo del carrier. Se documenta el flujo completo verificado.

## Contexto
- bore.pub (Sala Pública verde): ❌ bloqueado por Personal Argentina desde datos del celu
- Tailscale: ✅ funciona perfecto desde datos del celu (usa WireGuard + fallback DERP puerto 443)

## Pruebas verificadas (31-Jul-2026)
### 1. Conectividad Tailscale desde el celu
```
ping 100.91.21.22 → 4/4 respuestas, 0% pérdida, 0ms
```
Tailscale atraviesa el bloqueo del carrier sin problemas.

### 2. GGPO + Tailscale + retos ✅
- PC1 (WiFi): CREAR SALA (turquesa)
- PC2 (datos del celu): UNIRME A SALA (turquesa)
- Ambos se ven en la sala
- PC1 envía reto → PC2 acepta
- Resultado: fcadefbneo abre en ambas, player 0/1 conectado, **funciona perfecto**
- También verificado reto en dirección inversa (PC2 → PC1): funciona

### 3. RetroArch + Tailscale (JOIN directo) ✅
- PC1: HOST TAILSCALE → PC2: JOIN VÍA TAILSCALE con IP 100.x.x.x
- Primer reto: falló con "RA no abrió puerto 55435" (timeout 8s insuficiente para primera carga de RA: core + ROM + init netplay + shaders)
- Retos siguientes (RA ya cargado): ✅ conectan correctamente
- Reto inverso (PC2 → PC1): ✅ funciona

## Fixes aplicados
1. **Timeout tailscale-host**: `waitForPort(55435, 8000)` → `waitForPort(55435, 20000)` en `client/src/main/index.ts` (commit `1ed5cc0`). No afecta a jugadores rápidos — `waitForPort` resuelve apenas el puerto abre (polling cada 200ms), el timeout es solo límite máximo. Da margen a primera carga lenta de RA.

## Cambios UI (commit `5395a03`)
- Botones verdes (SALA PÚBLICA) y fucsia (SALA P2P) encerrados en desplegable "▼ OTROS MÉTODOS DE CONEXIÓN" colapsado por defecto
- Tailscale queda como método oficial visible
- Solo front, sin cambios de funcionalidad

## Cambios de marca (commit `d1278fa`)
- Renombrado a **EMULATRANS v1.0** (index.html, App.tsx, AppShell.tsx, Header.tsx)

## Conclusión
| Método | WAN con datos del celu |
|--------|----------------------|
| Tailscale | ✅ FUNCIONA (oficial) |
| bore.pub (verde) | ❌ bloqueado por carrier |
| P2P fucsia | ⚠️ requiere UPnP/port forward (router ISP no aplica) |

## Pendientes futuros
- [ ] Relay propio en VPS con puerto 443 para eliminar dependencia de Tailscale
- [ ] NAT traversal WAN real (módulo 22) sin Tailscale ni bore
- [ ] Probar Sala Pública verde en otro carrier que no bloquee puertos
