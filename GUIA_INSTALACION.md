# 🎮 Guía de Instalación — KOF '98 Launcher

Esta guía te ayudará a configurar todo para jugar online en pocos minutos.

## 📦 Paso 1: Descargar los archivos

1.  **El Proyecto**: Descarga o clona este repositorio de GitHub.
2.  **El Pack de Recursos (RetroArch)**: Descarga el archivo ZIP que te pasó el host (el ZIP del "KOF98_READY").

## 📂 Paso 2: Organización de carpetas

1.  Entra en la carpeta del proyecto (`emu-latam`).
2.  Extrae el contenido del ZIP adentro.
3.  Asegurate de que se vea así:
    ```
    emu-latam/
    ├── retroarch/        <-- Aquí deben estar los archivos del ZIP
    ├── client/
    ├── backend/
    └── start.bat
    ```

## 🌐 Paso 3: Configurar la IP

Si no estás en la misma PC que el servidor:

1.  Entra en la carpeta `client/`.
2.  Busca el archivo `.env.example` y cámbiale el nombre a `.env`.
3.  Ábrelo con el bloc de notas y pon la IP del servidor:
    `VITE_NAKAMA_HOST=192.168.1.XX` (Pidele esta IP al Host).

## 🚀 Paso 4: ¡A Jugar!

1.  Regresa a la carpeta principal (`emu-latam`).
2.  Haz doble clic en **`start.bat`**.
3.  Se abrirá el Launcher. Dale a **"INSERT COIN"**.
4.  Busca a tu oponente en la lista y dale a **"RETAR"**, o espera a que él te rete.

---

### ⚠️ Solución de Problemas (FAQ)

- **"No abre el emulador"**: Revisá que no tengas otro RetroArch abierto en el Administrador de Tareas.
- **"No veo a mi amigo en la lista"**: Asegurate de que ambos tengan la misma IP configurada en el `.env` y que el Firewall no esté bloqueando el programa.
- **"Falla el start.bat"**: Asegurate de tener Docker Desktop abierto y funcionando.
