# GUÍA RÁPIDA — Jugar KOF '98 con Emu Latam

**Motor recomendado:** GGPO (menor latencia, automático)
**Conexión recomendada:** Tailscale (cero configuración de router)

---

## 1. Instalar Tailscale (AMBAS PCs)

- Descargar de https://tailscale.com/download
- Instalar e iniciar sesión con **la misma cuenta** en ambas PCs
- Desactivar bloqueo de conexiones entrantes:

```powershell
tailscale up --shields-up=false
```

---

## 2. Host — Solo PC1

- Instalar PostgreSQL 14+ de https://www.postgresql.org/download/windows/
- Default port 5432, la contraseña no importa
- Abrir Emu Latam (`Emu Latam.exe` o `npm run dev`)

---

## 3. Jugar vía GGPO + Retos

### PC1 (Host)
1. Click **INSERT COIN**
2. Asegurar que el toggle dice **GGPO** (arriba a la derecha)
3. Click **CREAR SALA**
4. Copiar la IP que aparece (click encima)
5. Pasársela a PC2 (WhatsApp, Discord, etc.)

### PC2 (Guest)
1. Click **INSERT COIN**
2. Click **UNIRSE A SALA**
3. Pegar la IP de PC1, click **CONECTAR**

### PC1 — Enviar reto
4. En el sidebar (jugadores online), click en el nombre de PC2
5. Click **ENVIAR RETO**
6. Esperar. Cuando PC2 acepte, el juego se lanza solo.

### PC2 — Aceptar reto
4. Aparece una ventana con el reto de PC1
5. Click **ACEPTAR**
6. El juego se lanza solo.

---

## Resumen visual

```
PC1 (HOST)                        PC2 (GUEST)
─────────                         ──────────
1. INSERT COIN                    1. INSERT COIN
2. Toggle → GGPO                  
3. CREAR SALA                     
4. Copiar IP ──(WhatsApp)──→     2. UNIRSE A SALA → pegar IP → CONECTAR
5. Sidebar → click PC2 → RETO   
                                  3. ACEPTAR RETO
6. ¡A JUGAR! ←────────────────  4. ¡A JUGAR!
```

---

## Notas

- PostgreSQL solo en PC1 (Host). PC2 no necesita nada más que Tailscale.
- Si no funciona el reto, usar modo manual: HOST GGPO (PC1) → UNIRSE (PC2).
- Si no tienen Tailscale, pueden usar RetroArch + Bore (ver `GUIA_JUEGO.md`).
- Para cerrar el juego, cerrar la ventana del emulador. Emu Latam detecta el cierre solo.
