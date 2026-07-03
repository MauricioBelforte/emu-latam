# 02 - Análisis - Integración Tailscale (Plan Inicial)

## Análisis del Dominio
- Tailscale es una mesh VPN basada en WireGuard.
- Cada dispositivo recibe una IP en el rango 100.64.0.0/10 (típicamente 100.x.x.x).
- Conexión directa P2P siempre que sea posible (via NAT traversal).
- Cuando la conexión directa falla, usa DERP relay (encriptado, pero con latencia adicional).
- Gratis hasta 3 usuarios, 100 dispositivos.
- Autenticación vía Google/Microsoft/GitHub/email.

## Comparación con Alternativas Actuales

| Aspecto | HOST DIRECTO (LAN) | bore.pub | Forwarder VPS | Tailscale |
|---------|-------------------|----------|---------------|-----------|
| Setup usuario | Ninguno | Click en 2 botones | Click en 1 botón | Instalar Tailscale 1 vez |
| Abrir puertos | Sí (55435) | No | No | No |
| Latencia | 0 (loopback) | Alta (relay público) | Media (VPS) | Baja (P2P directo) |
| Estabilidad | 100% | Se cae a los ~10s | Buena | Excelente |
| Costo | $0 | $0 | VPS ($) | $0 (<3 usuarios) |
| Dependencia externa | Ninguna | bore.pub (caído?) | VPS propio | Tailscale (estable) |

## Alternativas Descartadas
- **ZeroTier**: Similar pero más complejo de integrar (SDK pesado).
- **n2n**: Requiere servidor supernode propio.
- **WireGuard manual**: Configuración compleja para usuario final.
- **Nakama relay interno**: Nakama no está diseñado para reenviar tráfico netplay de baja latencia.

## Decisión
Tailscale es la opción más práctica: bajo esfuerzo de integración (solo detectar IP), sin costo, y el usuario solo instala una vez. Complementa a bore/VPS en lugar de reemplazarlos.
