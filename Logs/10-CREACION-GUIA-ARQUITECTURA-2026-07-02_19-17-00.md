# Log de Cambios - Creación de Guía de Arquitectura

**Fecha:** 2026-07-02 19:17:00
**Número:** 10
**Descripción:** Creación de guía de arquitectura general actualizada para nuevos desarrolladores

## Motivo del Cambio
Aunque existía `COMO-LEVANTAR-EL-PROYECTO.md`, faltaba una guía de arquitectura general que explicara el flujo completo del sistema y cómo interactúan todos los componentes (Nakama, Bore, RetroArch, Electron, React). Esta guía es fundamental para nuevos desarrolladores que necesitan entender el sistema rápidamente.

## Cambios Realizados

### 1. Creación de DOCUMENTACION/GUIA-ARQUITECTURA.md

**Archivo creado:** `DOCUMENTACION/GUIA-ARQUITECTURA.md`

**Contenido de la guía:**

#### Visión General del Sistema
- Descripción de los 5 componentes principales (React, Electron, Nakama, Bore, RetroArch)
- Diagrama de arquitectura de alto nivel
- Flujo de comunicación entre componentes

#### Componentes del Sistema
- **Renderer Process (React):** Responsabilidades, archivos clave, comunicación IPC
- **Main Process (Electron):** Responsabilidades, funciones clave, handlers IPC
- **Nakama:** Responsabilidades, configuración, comunicación
- **Bore:** Responsabilidades, comando típico, uso en Emu Latam
- **RetroArch:** Responsabilidades, configuraciones, args de línea de comandos

#### Flujos de Conexión
- **Flujo 1: HOST DIRECTO (sin bore):** Diagrama, características, handler IPC
- **Flujo 2: HOST GAME (BORE) manual:** Diagrama detallado, características, handlers IPC
- **Flujo 3: MITM LOCAL:** Diagrama, características, handlers IPC

#### Arquitectura de Puertos
- Tabla completa con todos los puertos del sistema
- Propósito de cada puerto
- Notas importantes (ej: RetroArch ignora --port)

#### Hallazgos Técnicos Críticos
- **RetroArch ignora `--port`:** Evidencia y solución
- **Conflicto de puerto en misma PC:** Problema y solución
- **Cleanup de servidores independiente:** Arrays separados

#### Ciclo de Vida de la Aplicación
- **Inicio:** Paso a paso desde `npm run dev` hasta botón habilitado
- **Host crea sala:** Secuencia completa de acciones
- **Guest se une:** Secuencia completa de acciones
- **Cierre:** Limpieza de todos los procesos

#### Archivos Clave y Responsabilidades
- Tablas organizadas por categoría (Backend Electron, Frontend React, Servicios Externos, Tests y Logs)
- Responsabilidad de cada archivo

#### Comandos Disponibles
- Tabla con todos los comandos npm y su descripción

#### Próximos Pasos para Nuevos Desarrolladores
- Lista de 5 pasos para empezar a trabajar en el proyecto

## Características de la Guía

- **Actualizada:** Refleja el estado actual del sistema (Julio 2026)
- **Completa:** Cubre todos los componentes y flujos funcionales
- **Visual:** Incluye diagramas ASCII para facilitar comprensión
- **Práctica:** Incluye comandos reales y rutas de archivos
- **Estructurada:** Organizada en secciones claras con tabla de contenidos implícita

## Diferencias con Documentación Existente

**COMO-LEVANTAR-EL-PROYECTO.md:**
- Enfocado en cómo instalar y ejecutar el proyecto
- No explica la arquitectura interna
- No cubre interacciones entre componentes

**GUIA-ARQUITECTURA.md (nueva):**
- Enfocado en cómo funciona el sistema internamente
- Explica interacciones entre todos los componentes
- Cubre flujos de conexión, puertos, ciclo de vida
- Diseñada para nuevos desarrolladores

## Archivos Creados

1. `DOCUMENTACION/GUIA-ARQUITECTURA.md` - Creado (guía completa de arquitectura)
2. `Logs/10-CREACION-GUIA-ARQUITECTURA-2026-07-02_19-17-00.md` - Creado (este archivo)
3. `Logs/ULTIMO_NUMERO.txt` - Modificado (actualizado a 10)
