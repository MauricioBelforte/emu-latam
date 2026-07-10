# 02 - Análisis: Sistema de Retos

## Dominio
El sistema de retos es un sistema de **matchmaking simple** basado en el canal de chat de Nakama:
1. **Signaling**: Los mensajes de reto se envían como `chat messages` en el lobby de Nakama
2. **Conexión**: Una vez aceptado, la conexión del juego se hace por el método elegido (no por Nakama)

## Alternativas Consideradas

### Alternativa A: Modal de método en el momento de retar (SELECCIONADA)
- Al hacer clic en "RETAR", se abre un modal con 3 botones: Tailscale / Bore / LAN
- El método se envía como parte del mensaje de reto
- **Pros**: Claro, explícito, el usuario decide
- **Contras**: Un paso extra antes de enviar el reto

### Alternativa B: Detección automática del método
- Probar Tailscale primero, si no está disponible usar Bore, etc.
- **Pros**: Sin fricción, un clic
- **Contras**: Puede elegir un método que el guest no tenga, complejidad de detección

### Alternativa C: Configuración global del método
- El usuario configura su método preferido en settings
- **Pros**: Rápido después de configurar
- **Contras**: El guest puede no tener el mismo método disponible

## Decisiones

| Decisión | Opción Elegida | Motivo |
|----------|---------------|--------|
| Cuándo elegir método | Al retar (modal) | El usuario sabe qué tiene disponible él y su amigo |
| Signaling | Nakama chat messages | Ya implementado, sin overhead |
| Métodos soportados | Tailscale, Bore, LAN | Los 3 métodos que ya funcionan |
| Timeout respuesta | 30s | Estándar en fighting games |
| Reintento bore | Hasta 3 intentos | Bore puede fallar intermitentemente |
