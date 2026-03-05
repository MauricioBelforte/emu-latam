# 🌍 Guía de Conexión a través de Internet (Port Forwarding)

Para que tu amigo pueda jugar contigo desde otra casa (fuera de tu red WiFi), necesitamos que tu router permita la entrada de conexiones hacia el servidor Nakama y hacia el emulador RetroArch.

Esto se llama **Port Forwarding** (Apertura de Puertos). Es un proceso seguro si solo se abren los puertos específicos.

---

## 🛠️ PASO 1: Abrir puertos en el Firewall de Windows

Ya he creado un script automático para este paso. Solo debes:

1. Ir a la carpeta del proyecto.
2. Hacer clic derecho sobre **`configurar_red.bat`**.
3. Seleccionar **"Ejecutar como administrador"**.
4. Confirmar que dice "¡FIREWALL CONFIGURADO CON ÉXITO!".

---

## 🌐 PASO 2: Conocer tus Direcciones IP

Necesitas dos direcciones IP. Asegúrate de anotarlas:

1. **Tu IP Local:** Mírala en la consola escribiendo `ipconfig` (ej: `192.168.1.15`). Esta es la dirección de tu PC dentro de tu casa.
2. **Tu IP Pública:** Esta es tu dirección de "Internet". Entra a [https://www.cual-es-mi-ip.net/](https://www.cual-es-mi-ip.net/) y cópiala. **Esta es la IP que le tienes que dar a tu oponente**.

---

## 🚪 PASO 3: Entrar al Módem/Router

1. Abre tu navegador (Chrome, Edge, etc.).
2. En la barra de direcciones escribe la "Puerta de enlace" de tu router. Casi siempre es: **`192.168.1.1`** o **`192.168.0.1`**.
3. Te pedirá Usuario y Contraseña.
   - _Tip:_ Suele estar en una etiqueta debajo del router físico (ej: Usuario: `admin`, Clave: `admin` o `1234`).

---

## 🔓 PASO 4: Hacer el Port Forwarding

Una vez dentro del panel de tu router, busca una sección que se llame de alguna de estas formas:

- **Port Forwarding**
- **Apertura de Puertos**
- **Servidores Virtuales (Virtual Servers)**
- **NAT / Reglas NAT**

Debes crear DOS reglas nuevas apuntando a **TU IP LOCAL (ej: 192.168.1.15)**:

### Regla 1 (El Servidor Nakama):

- **Nombre:** Nakama o KOF_Lobby
- **IP Interna / IP LAN:** `192.168.1.15` (Usa TU IP Local actual)
- **Puerto Interno (LAN):** `7350`
- **Puerto Externo (WAN):** `7350`
- **Protocolo:** TCP

### Regla 2 (El Juego / RetroArch):

- **Nombre:** KOF_RetroArch
- **IP Interna / IP LAN:** `192.168.1.15` (Usa TU IP Local actual)
- **Puerto Interno (LAN):** `55435`
- **Puerto Externo (WAN):** `55435`
- **Protocolo:** TCP

Guarda los cambios y reinicia el router si te lo pide.

---

## 🎮 PASO 5: Que tu amigo se conecte

Una vez hechos estos pasos, tú ejecutas tu ambiente normalmente con `start_host.bat`.

Tu oponente (en otra casa) debe hacer lo siguiente:

1. Editar su archivo `client/.env`.
2. Escribir allí **TU IP PÚBLICA**. Debería verse así:
   `VITE_NAKAMA_HOST=181.45.XXX.XX` (la que sacaste en el Paso 2).
3. Hacer doble clic en **`start_cliente.bat`**. Verá tu nombre en el lobby. Cuando se reten, conectarán directamente.
