# 02 — Análisis del Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN
> **Fecha:** 2026-07-24
> **Estado:** Plan inicial

---

## 1. Análisis del Dominio

### El problema circular
Para que dos PCs en distintas redes jueguen juntas, el guest necesita:
1. Saber dónde está el host (descubrimiento)
2. Poder enviarle datos (conectividad)

En LAN ambos son triviales (broadcast UDP + IP privada). En WAN, el host está detrás de NAT (router) con IP privada 192.168.x.x y el guest no puede alcanzarlo directamente.

### Solución actual: dos capas separadas
- **Señalización (Nakama)**: Host inicia Nakama local. Guest necesita alcanzar ese Nakama.
- **Game data (RetroArch/GGPO)**: Se maneja con bore (RetroArch) o P2P relay (GGPO+P2P WAN).

El módulo **GGPO+P2P WAN** ya resuelve el game data. Pero la señalización sigue atada a Nakama local. Sin Nakama accesible, no hay retos, no hay intercambio de candidatos P2P.

### La brecha que cierra este módulo
Hacer que el guest pueda alcanzar el Nakama del host desde cualquier red. Esto convierte el problema en:
1. Host publica su Nakama via bore (túnel público)
2. Guest descubre la URL de ese túnel
3. Guest se conecta al Nakama del host
4. Una vez conectados al mismo Nakama, los retos y P2P signaling funcionan normal

---

## 2. Alternativas Evaluadas

### Alternativa A: Paste service público (dpaste.org) ✅ SELECCIONADA
- Host POSTea bore URL a dpaste.org, recibe un hash (room code)
- Guest GETea por ese hash y obtiene la bore URL
- **Pros**: Sin servidor propio, API simple, 0 config, funciona desde Node.js nativo
- **Contras**: Dependencia de tercero (dpaste.org), TTL del paste (expira en 1 día)
- **Riesgo mitigado**: Fallback a URL manual si dpaste falla

### Alternativa B: GitHub Gist API
- Host crea un Gist con la bore URL usando GitHub API
- Guest lee el Gist por ID
- **Pros**: GitHub es muy estable
- **Contras**: Requiere token de GitHub (setup manual)

### Alternativa C: Servidor rendezvous propio (VPS)
- Host escribe en un mini servidor HTTP (Railway/Render free tier)
- Guest lee del mismo servidor
- **Pros**: Control total
- **Contras**: Requiere deploy y mantenimiento del servidor

### Alternativa D: Room code = puerto bore (BP28734)
- Room code es el puerto de bore.pub directamente
- **Pros**: Sin dependencias externas
- **Contras**: El puerto cambia cada vez que se reinicia bore; dos hosts en simultáneo pueden tener el mismo puerto (colisión); el código es menos amigable (5 dígitos vs 6 alfanuméricos)

---

## 3. Arquitectura Elegida

```
Host PC                          Guest PC
──────                          ────────
1. Nakama (7350)
2. bore local 7350 → bore.pub:XXXXX
3. POST bore.pub:XXXXX ──────→ dpaste.org ───→ hash "aB3xZ6"
4. Muestra: "Código de sala: aB3xZ6"          5. Guest ingresa "aB3xZ6"
                                                6. GET /raw/aB3xZ6 ──→ dpaste.org
                                                7. Obtiene "bore.pub:XXXXX"
                                                8. setNakamaConfig("bore.pub", XXXXX)
                                                9. Se conecta a Nakama del host
10. Guest aparece en lobby
11. Host envía reto → P2P signaling via Nakama
12. GGPO+P2P WAN o RetroArch+P2P para game data
```

---

## 4. Decisiones Técnicas

| Decisión | Opción | Motivo |
|:---------|:-------|:-------|
| Paste service | dpaste.org | API simple, HTTPS, sin auth, +10 años de operación |
| Room code | Hash de 6 chars de dpaste | Sin colisiones, corto para compartir verbalmente |
| HTTP client | Node.js `https` nativo | Sin dependencias nuevas |
| Almacenamiento bore URL | `emu_latam_nakama.json` existente | Reutiliza el sistema de config remota ya implementado |
| Fallback manual | Mostrar URL completa | El usuario puede copiar/pegar si dpaste falla |
| TTL paste | 1 día | Tiempo más que suficiente para una sesión de juego |

---

## 5. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|:-------|:-------------|:--------|:-----------|
| dpaste.org caído | Baja | Alto | Fallback a URL manual |
| dpaste.org cambia API | Baja | Medio | Código modular, fácil de cambiar a otro service |
| Expiración del paste (1 día) | Alta | Bajo | Nadie juega >1 día seguido; se puede regenerar |
| Código compartido a persona equivocada | Baja | Medio | No hay daño mayor, solo ven la IP pública del host |
| bore.pub no disponible | Baja | Alto | Ya existe fallback (Tailscale, LAN) |
