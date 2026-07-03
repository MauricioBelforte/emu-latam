# 01 - Requerimientos - Integración Tailscale (Plan Inicial)

## Problema
- Para conectar dos PCs necesitamos que el host RA sea accesible desde el guest.
- bore.pub se cae a los ~10s y añade latencia por pasar por un relay público.
- El forwarder TCP requiere un VPS intermedio (costo, mantenimiento).
- La conexión directa requiere puertos abiertos en el router (no siempre posible).

## Objetivo
Integrar Tailscale como mecanismo de conexión P2P directa entre dos PCs:
- Sin relay público, sin abrir puertos en el router.
- Baja latencia (WireGuard P2P directo).
- Setup mínimo para el usuario: instalar Tailscale, iniciar sesión, un botón en la app.

## Alcance
- Handler IPC nuevo: `start-tailscale-host` / `start-tailscale-guest`
- Botones nuevos en UI: "HOST TAILSCALE" / "JOIN TAILSCALE"
- Detección automática de IP Tailscale (100.x.x.x)
- Usa `netplay_optimized.cfg` existente
- Sin proxy, sin forwarder, sin bore, sin relay
- Si Tailscale no está instalado, mostrar link de descarga

## Restricciones
- Flujo paralelo: NO modificar handlers blindados (AGENTS.md §14-15)
- No instalar Tailscale automáticamente (requiere permisos de administrador + driver de red)
- Duplicar código si es necesario para no acoplar con flujos existentes
