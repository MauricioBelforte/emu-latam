# 01 - Requerimientos - Registro de Fallas y Soluciones (Plan Inicial)

## Problema
- Durante el desarrollo de Emu Latam surgen problemas recurrentes (configuración de PostgreSQL, puertos, firewall, netplay).
- No hay un registro centralizado donde consultar cómo se resolvieron estos problemas en el pasado.
- Cada vez que un problema se repite, hay que debuggear desde cero.

## Objetivo
Mantener un registro incremental de todas las fallas encontradas durante el desarrollo, con su causa raíz, solución aplicada, y cómo verificarla. Este módulo es **referencia**, no contiene código ejecutable.

## Alcance
- Documentar problemas de configuración (PostgreSQL, Tailscale, firewall).
- Documentar problemas de red (conectividad, puertos, túneles).
- Documentar problemas de RetroArch (netplay, inputs, config).
- Documentar problemas de la app (crashes, errores de UI, IPC).
- Cada entrada debe incluir: fecha, síntoma, causa raíz, solución, verificación.

## Restricciones
- No modificar problemas ya documentados; agregar nuevas entradas al inicio.
- No incluir código nuevo aquí (solo referencias al código que se modificó).
- Este módulo es incremental: siempre se agrega al principio de la lista.
