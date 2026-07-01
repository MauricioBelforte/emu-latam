# Diseño

## Arquitectura de Conexión

RetroArch tiene un bug: el flag `--port` es ignorado en el cliente. Siempre conecta al puerto 55435 (default) sin importar lo que se pase en `--port`.

Para bypass:

### Modo Directo (sin túnel)
- **Host:** `--host --port 55435`
- **Guest:** `--connect 127.0.0.1 --port 55435`
- La conexión es directa entre ambas ventanas de RetroArch

### Modo Relay (Bore)
- **Host:** `--host --port 55436` (usa puerto distinto para liberar 55435)
- **Bore:** `bore local 55436 --to bore.pub` → tunnel en `bore.pub:XXXXX`
- **Guest Proxy:** servidor TCP en `127.0.0.1:55435` que reenvía a `bore.pub:XXXXX`
- **Guest RA:** `--connect 127.0.0.1` → conecta al proxy local → proxy reenvía al túnel bore → tunnel llega al host en 55436

### Flujo
1. Host inicia bore → `bore local 55436 --to bore.pub`
2. Host inicia RetroArch → `--host --port 55436`
3. Guest lee relay URL de archivo compartido
4. Guest inicia proxy TCP local en 55435 → `bore.pub:XXXXX`
5. Guest inicia RetroArch → `--connect 127.0.0.1` (proxy local)