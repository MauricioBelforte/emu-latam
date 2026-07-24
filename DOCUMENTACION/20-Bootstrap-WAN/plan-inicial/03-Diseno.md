# 03 — Diseño del Bootstrap Público WAN

> **Módulo:** 20-Bootstrap-WAN
> **Fecha:** 2026-07-24
> **Estado:** Plan inicial

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     Host PC                                 │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ nakama   │←─│ bore local 7350  │──│ bore.pub:XXXXX    │  │
│  │ :7350    │  │ → bore.pub       │  │ (túnel público)   │  │
│  └──────────┘  └──────────────────┘  └───────────────────┘  │
│                                        │                    │
│                                        ▼                    │
│                              ┌──────────────────┐           │
│                              │ bootstrap.ts     │           │
│                              │ POST to dpaste   │           │
│                              └────────┬─────────┘           │
│                                       │                     │
│                              Room code: "aB3xZ6"            │
└───────────────────────────────┬─────────────────────────────┘
                                │ (compartido por chat/voice)
┌───────────────────────────────┴─────────────────────────────┐
│                     Guest PC                                │
│  ┌──────────────────┐  ┌──────────┐                        │
│  │ bootstrap.ts     │──│ GET from │  dpaste.org/raw/aB3xZ6 │
│  │ room code input  │  │ dpaste   │                        │
│  └────────┬─────────┘  └──────────┘                        │
│           │              "bore.pub:XXXXX"                   │
│           ▼                                                 │
│  ┌───────────────────────┐                                 │
│  │ setNakamaConfig()     │                                 │
│  │ (escribe emu_latam_   │                                 │
│  │  nakama.json)         │                                 │
│  └───────────────────────┘                                 │
│           │                                                 │
│           ▼                                                 │
│  ┌───────────────────────┐                                 │
│  │ nakamaService.connect │                                 │
│  │ (a bore.pub:XXXXX)    │                                 │
│  └───────────────────────┘                                 │
│                        │                                    │
│                        ▼                                    │
│           ¡Conectado al Nakama del host!                    │
│           → Aparece en lobby → Recibe retos                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Flujo Detallado

### Host: bootstrap-host
```
1. Verificar que Nakama ya está corriendo (puerto 7350)
2. Matar bore previo (taskkill /f /im bore.exe)
3. Spawn: bore local 7350 --to bore.pub
4. Esperar stdout: "listening at bore.pub:XXXXX"
5. Extraer URL con regex: /listening at ([\w.-]+:\d+)/
6. POST a dpaste.org con content = bore URL
7. Extraer hash del paste (último segmento de la URL de respuesta)
8. Mostrar room code = hash en la UI
9. Retornar { success: true, roomCode, boreUrl }
```

### Guest: bootstrap-guest
```
1. Recibir room code ingresado por el usuario
2. GET a dpaste.org/raw/{roomCode}
3. Obtener bore URL
4. Parsear host y port de la bore URL
5. Llamar setNakamaConfig(host, port)
6. Indicar al frontend que la config cambió (necesita reconectar)
7. Retornar { success: true, boreUrl }
```

---

## 3. API de IPC

| Handler | Args | Returns | Descripción |
|:--------|:-----|:--------|:------------|
| `bootstrap-host` | ninguno | `{ success, roomCode?, boreUrl?, error? }` | Inicia bore para Nakama + publica en dpaste |
| `bootstrap-guest` | `{ roomCode }` | `{ success, boreUrl?, error? }` | Obtiene bore URL por room code + configura Nakama |
| `bootstrap-close` | ninguno | `{ success }` | Mata bore, restaura Nakama a localhost, opcionalmente elimina paste |

---

## 4. Componentes UI

### En App.tsx
- Botón **"SALA PÚBLICA"** en la sección de métodos, con color distintivo
- Al hacer click: muestra el room code (host) o input de room code (guest)
- Se integra dentro de `OTROS MÉTODOS DE CONEXIÓN`

### Estados visuales
| Estado | Host | Guest |
|:-------|:-----|:------|
| Idle | Botón "ABRIR SALA PÚBLICA" | Input + botón "CONECTAR" |
| Cargando | Spinner "Iniciando sala pública..." | Spinner "Conectando..." |
| Conectado | "SALA PÚBLICA ACTIVA — Código: aB3xZ6" (con botón copiar) | "Conectado al host vía sala pública" |
| Error | Mensaje de error + fallback URL manual | Mensaje de error |
| Cerrando | Spinner "Cerrando sala..." | — |

---

## 5. Puerto y Recursos

| Recurso | Puerto | Descripción |
|:--------|:-------|:------------|
| Nakama host | 7350 | Servidor local de Nakama |
| bore Nakama | Variable (bore.pub:XXXXX) | Túnel público que expone Nakama |
| dpaste.org | 443 (HTTPS) | Paste service para room code |
